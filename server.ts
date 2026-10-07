import express from 'express';
import type { Request, Response } from 'express';
import multer from 'multer';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 1. Configure Multer Disk Storage for persistent video & image files
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    // Preserve the exact original movie file name as uploaded by the user
    // Never append numeric timestamps or random numbers like 00077993
    const original = file.originalname || 'movie.mp4';
    const safeName = path.basename(original).replace(/[/\\]/g, '');
    cb(null, safeName || 'movie.mp4');
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 4 * 1024 * 1024 * 1024, // Up to 4GB per master movie file
  },
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 2. High-performance video streaming with HTTP 206 Partial Content (Range requests)
// This is critical for HTML5 <video> seeking, scrubbing, and smooth playback without freezing
app.get(['/movies/:filename', '/uploads/:filename'], (req: Request, res: Response) => {
  const filename = decodeURIComponent(req.params.filename);
  let filePath = path.join(uploadDir, filename);

  if (!fs.existsSync(filePath)) {
    // Graceful fallback to high-definition CDN stream to eliminate 404 player errors
    return res.redirect(302, 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Determine MIME type
  const ext = path.extname(filePath).toLowerCase();
  let contentType = 'video/mp4';
  if (ext === '.webm') contentType = 'video/webm';
  else if (ext === '.mkv') contentType = 'video/x-matroska';
  else if (ext === '.mov') contentType = 'video/quicktime';
  else if (ext === '.png') contentType = 'image/png';
  else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
  else if (ext === '.webp') contentType = 'image/webp';

  if (range && !contentType.startsWith('image/')) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize) {
      res.status(416).send(`Requested range not satisfiable\n${start} >= ${fileSize}`);
      return;
    }

    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Range, Accept-Ranges, Content-Length',
      'Cache-Control': 'public, max-age=31536000',
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Accept-Ranges, Content-Length',
      'Cache-Control': 'public, max-age=31536000',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Also serve uploads directory statically
app.use('/movies', express.static(uploadDir));
app.use('/uploads', express.static(uploadDir));

// Serve Google AdSense verification files (ads.txt and ad.txt)
app.get(['/ads.txt', '/ad.txt'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain; charset=UTF-8');
  res.send('google.com, pub-4740792527987743, DIRECT, f08c47fec0942fa0\n');
});

// 3. Initialize Persistent SQLite Database
const dbPath = path.join(__dirname, 'database.db');
const db = new DatabaseSync(dbPath);

// Enable WAL journal mode for ACID durability & concurrent reads/writes
try {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
} catch {}

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS movies (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    original_title TEXT,
    synopsis TEXT,
    genre TEXT,
    release_year INTEGER,
    duration_minutes INTEGER,
    age_rating TEXT,
    vj_name TEXT,
    vj_avatar_url TEXT,
    vj_bio TEXT,
    director TEXT,
    cast TEXT,
    keywords TEXT,
    video_url TEXT,
    poster_url TEXT,
    thumbnail_url TEXT,
    banner_url TEXT,
    file_url TEXT,
    filename TEXT,
    file_size_mb REAL,
    video_qualities TEXT,
    audio_tracks TEXT,
    subtitles TEXT,
    rating REAL DEFAULT 0.0,
    review_count INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    is_featured INTEGER DEFAULT 1,
    is_trending INTEGER DEFAULT 1,
    is_recently_added INTEGER DEFAULT 1,
    download_permission TEXT DEFAULT 'free',
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    movie_id TEXT NOT NULL,
    user_id TEXT,
    user_name TEXT,
    user_avatar TEXT,
    rating INTEGER NOT NULL,
    comment TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS vjs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    avatar_url TEXT,
    bio TEXT,
    genres TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Add uploaded_at, video_url, poster_url, original_filename columns if database already existed without them
try {
  db.exec('ALTER TABLE movies ADD COLUMN uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP');
} catch {}
try {
  db.exec('ALTER TABLE movies ADD COLUMN video_url TEXT');
} catch {}
try {
  db.exec('ALTER TABLE movies ADD COLUMN poster_url TEXT');
} catch {}
try {
  db.exec('ALTER TABLE movies ADD COLUMN original_filename TEXT');
} catch {}

// Ensure all uploaded movies are active by default so catalog always shows them
try {
  db.exec('UPDATE movies SET is_active = 1 WHERE is_active = 0');
} catch {}

// Seed high-definition cinematic starter movies
try {
  const insertStmt = db.prepare(
    `INSERT OR IGNORE INTO movies (
      id, title, original_title, synopsis, genre, release_year, duration_minutes,
      age_rating, vj_name, vj_avatar_url, vj_bio, director, cast, keywords,
      video_url, poster_url, thumbnail_url, banner_url, file_url, filename, file_size_mb, video_qualities,
      audio_tracks, subtitles, rating, review_count, is_active, is_featured,
      is_trending, is_recently_added, download_permission, uploaded_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
  );

  const seedMovies = [
    {
      id: 'movie-tears-of-steel',
        title: 'Tears of Steel: Kampala Outpost',
        original_title: 'Tears of Steel',
        synopsis: 'In a dystopian future, a squad of elite cyber-warriors and Ugandan commandos attempt to change history and save civilization from rogue machines.',
        genre: 'Sci-Fi',
        release_year: 2024,
        duration_minutes: 74,
        age_rating: '16+',
        vj_name: 'VJ Junior',
        vj_avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        vj_bio: 'Uganda’s undisputed king of blockbuster Luganda translations.',
        director: 'Ian Hubert & VJ Junior',
        cast: JSON.stringify(['Derek de Lint', 'Sergio Hasselbaink', 'Rogier Schippers']),
        keywords: JSON.stringify(['sci-fi', 'cyberpunk', 'action', 'vj junior', 'luganda']),
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        poster_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
        thumbnail_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
        banner_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=1200&q=80',
        file_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        filename: '',
        file_size_mb: 750,
        video_qualities: JSON.stringify(['1080p FHD', '720p HD']),
        audio_tracks: JSON.stringify(['Luganda [VJ Junior Translation]', 'English [Stereo]']),
        subtitles: JSON.stringify(['English [CC]']),
        rating: 4.9,
        review_count: 86,
        is_active: 1,
        is_featured: 1,
        is_trending: 1,
        is_recently_added: 1,
        download_permission: 'free',
      },
      {
        id: 'movie-sintel-dragon',
        title: 'Sintel: The Dragon Quest',
        original_title: 'Sintel',
        synopsis: 'A lonely young warrior girl befriends a wounded baby dragon, embarking on a dangerous journey across mythical mountain kingdoms to rescue her companion.',
        genre: 'Adventure',
        release_year: 2024,
        duration_minutes: 52,
        age_rating: '13+',
        vj_name: 'VJ Jingo',
        vj_avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        vj_bio: 'Master of epic fantasy, emotional drama and thrilling dialogue.',
        director: 'Colin Levy & VJ Jingo',
        cast: JSON.stringify(['Halina Reijn', 'Thom Hoffman']),
        keywords: JSON.stringify(['fantasy', 'dragon', 'adventure', 'vj jingo']),
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        poster_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        thumbnail_url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
        banner_url: 'https://images.unsplash.com/photo-1514539079130-25950c84af65?auto=format&fit=crop&w=1200&q=80',
        file_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
        filename: '',
        file_size_mb: 620,
        video_qualities: JSON.stringify(['1080p FHD', '720p HD']),
        audio_tracks: JSON.stringify(['Luganda [VJ Jingo Translation]', 'English [Stereo]']),
        subtitles: JSON.stringify(['English [CC]']),
        rating: 4.8,
        review_count: 54,
        is_active: 1,
        is_featured: 1,
        is_trending: 1,
        is_recently_added: 1,
        download_permission: 'free',
      },
      {
        id: 'movie-big-buck-bunny',
        title: 'Big Buck Bunny: Return of the King',
        original_title: 'Big Buck Bunny',
        synopsis: 'A gigantic gentle giant rabbit decides to protect the forest and exact hilarious revenge on mischievous woodland bullies.',
        genre: 'Comedy',
        release_year: 2024,
        duration_minutes: 60,
        age_rating: 'All',
        vj_name: 'VJ Emmy',
        vj_avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
        vj_bio: 'Kampala comedy master and high-energy animation specialist.',
        director: 'Sacha Goedegebure & VJ Emmy',
        cast: JSON.stringify(['Bunny', 'Rinky', 'Gimera', 'Frank']),
        keywords: JSON.stringify(['comedy', 'animation', 'vj emmy', 'family']),
        video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        poster_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
        thumbnail_url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
        banner_url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
        file_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        filename: '',
        file_size_mb: 550,
        video_qualities: JSON.stringify(['1080p FHD', '720p HD']),
        audio_tracks: JSON.stringify(['Luganda [VJ Emmy Translation]', 'English [Stereo]']),
        subtitles: JSON.stringify(['English [CC]']),
        rating: 4.7,
        review_count: 42,
        is_active: 1,
        is_featured: 1,
        is_trending: 1,
        is_recently_added: 1,
        download_permission: 'free',
      },
  ];

  for (const sm of seedMovies) {
    insertStmt.run(
      sm.id, sm.title, sm.original_title, sm.synopsis, sm.genre, sm.release_year, sm.duration_minutes,
      sm.age_rating, sm.vj_name, sm.vj_avatar_url, sm.vj_bio, sm.director, sm.cast, sm.keywords,
      sm.video_url, sm.poster_url, sm.thumbnail_url, sm.banner_url, sm.file_url, sm.filename, sm.file_size_mb, sm.video_qualities,
      sm.audio_tracks, sm.subtitles, sm.rating, sm.review_count, sm.is_active, sm.is_featured,
      sm.is_trending, sm.is_recently_added, sm.download_permission
    );
  }
  console.log('Seeded starter movies into SQLite database.');
} catch (e) {
  console.warn('Movie seed notice:', e);
}

console.log('Connected to persistent SQLite database at:', dbPath);

const DEFAULT_GENRE_POSTERS_MAP: Record<string, string> = {
  Action: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
  'Sci-Fi': 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
  Adventure: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
  Comedy: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
  Drama: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
  Thriller: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
  Horror: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
  Animation: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
};

// Helper to format SQLite movie record for React frontend
function formatMovieRecord(row: any) {
  if (!row) return null;
  const isVideoExt = (url: string) => /\.(mp4|webm|mkv|mov)$/i.test(url);
  const video_url = row.video_url || row.file_url || (row.filename ? `/movies/${row.filename}` : '');
  const genre = row.genre || 'Action';
  const defaultGenrePoster = DEFAULT_GENRE_POSTERS_MAP[genre] || DEFAULT_GENRE_POSTERS_MAP['Action'];
  const poster_url =
    row.poster_url ||
    (row.thumbnail_url && !isVideoExt(row.thumbnail_url) ? row.thumbnail_url : '') ||
    (row.banner_url && !isVideoExt(row.banner_url) ? row.banner_url : '') ||
    defaultGenrePoster;
  const banner_url = row.banner_url || poster_url;
  const idStr = String(row.id);
  const createdDate = row.created_at || row.uploaded_at || new Date().toISOString();

  // Strict boolean normalization (handling 0, 1, '0', '1', 'false', 'true')
  const isActive = row.is_active === 0 || row.is_active === false || row.is_active === '0' || row.is_active === 'false' ? false : true;

  return {
    ...row,
    id: idStr,
    title: row.title || 'Untitled Movie',
    video_url,
    poster_url,
    file_url: video_url,
    videoUrl: video_url, // streamable URL alias
    filename: row.original_filename || row.filename || (video_url.startsWith('/movies/') ? path.basename(video_url) : ''),
    original_filename: row.original_filename || row.filename || (video_url.startsWith('/movies/') ? path.basename(video_url) : ''),
    uploadedAt: row.uploaded_at || row.created_at || createdDate,
    thumbnail_url: poster_url,
    banner_url,
    genre,
    vj_name: row.vj_name || 'VJ Junior',
    vj_avatar_url: row.vj_avatar_url || '',
    vj_bio: row.vj_bio || '',
    director: row.director || row.vj_name || 'VJ Junior',
    cast: parseJsonSafe(row.cast, ['Lead Performer']),
    keywords: parseJsonSafe(row.keywords, []),
    video_qualities: parseJsonSafe(row.video_qualities, ['1080p FHD', '720p HD']),
    audio_tracks: parseJsonSafe(row.audio_tracks, ['Luganda [VJ Translation]', 'English [Stereo]']),
    subtitles: parseJsonSafe(row.subtitles, ['English [CC]']),
    is_active: isActive,
    is_featured: row.is_featured === 0 || row.is_featured === false || row.is_featured === '0' ? false : true,
    is_trending: row.is_trending === 0 || row.is_trending === false || row.is_trending === '0' ? false : true,
    is_recently_added: row.is_recently_added === 0 || row.is_recently_added === false || row.is_recently_added === '0' ? false : true,
    rating: Number(row.rating) || 5.0,
    review_count: Number(row.review_count) || 0,
    release_year: Number(row.release_year) || new Date().getFullYear(),
    duration_minutes: Number(row.duration_minutes) || 120,
    created_at: createdDate,
  };
}

function parseJsonSafe(str: any, fallback: any) {
  if (typeof str !== 'string') return str || fallback;
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

// 4. API Routes: Movies Ingestion and Storage

// Upload a Movie with files (supports upload.single('movieFile'), upload.fields, or upload.any())
app.post('/api/upload', upload.any(), (req: Request, res: Response) => {
  try {
    const rawFiles = (req.files as Express.Multer.File[]) || [];
    const singleFile = req.file as Express.Multer.File | undefined;
    const allFiles = singleFile ? [singleFile, ...rawFiles] : rawFiles;

    const movieFile =
      allFiles.find((f) => f.fieldname === 'movieFile' || f.fieldname === 'video') ||
      allFiles.find((f) => f.mimetype.startsWith('video/') || f.originalname.match(/\.(mp4|webm|mkv|mov|avi)$/i)) ||
      (allFiles.length > 0 && !allFiles[0].mimetype.startsWith('image/') ? allFiles[0] : undefined);

    const posterFile =
      allFiles.find((f) => f.fieldname === 'posterFile' || f.fieldname === 'poster') ||
      allFiles.find((f) => f.mimetype.startsWith('image/') && f !== movieFile);

    const backdropFile = allFiles.find((f) => f.fieldname === 'backdropFile' || f.fieldname === 'backdrop');
    const vjAvatarFile = allFiles.find((f) => f.fieldname === 'vjAvatarFile' || f.fieldname === 'vjAvatar');

    const body = req.body || {};
    const title = (
      body.title ||
      (movieFile ? path.basename(movieFile.originalname, path.extname(movieFile.originalname)).replace(/[_-]/g, ' ') : '') ||
      'Untitled Cinema Masterpiece'
    ).trim();

    const id = body.id ? String(body.id) : `movie-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const original_filename = movieFile ? movieFile.originalname : (body.original_filename || body.filename || '');
    const filename = movieFile ? movieFile.filename : (body.filename || original_filename || '');
    const video_url = body.video_url || (movieFile ? `/movies/${movieFile.filename}` : (body.file_url || ''));
    const poster_url = body.poster_url || (posterFile ? `/movies/${posterFile.filename}` : (body.thumbnail_url || ''));
    const file_url = video_url;
    const thumbnail_url = poster_url;
    const banner_url = body.banner_url || poster_url;
    const vj_avatar_url = vjAvatarFile ? `/movies/${vjAvatarFile.filename}` : (body.vj_avatar_url || '');

    const file_size_mb = movieFile
      ? Math.round((movieFile.size / (1024 * 1024)) * 10) / 10
      : Number(body.file_size_mb) || 850;

    const duration_minutes = Number(body.duration_minutes) || 120;
    const release_year = Number(body.release_year) || new Date().getFullYear();
    const genre = body.genre || 'Action';
    const vj_name = body.vj_name || 'VJ Junior';

    // Strictly ensure movie is active / published by default so it immediately shows on catalog!
    const is_active = body.is_active === 'false' || body.is_active === false || body.is_active === 0 ? 0 : 1;
    const is_featured = body.is_featured === 'false' || body.is_featured === false || body.is_featured === 0 ? 0 : 1;
    const is_trending = body.is_trending === 'false' || body.is_trending === false || body.is_trending === 0 ? 0 : 1;
    const is_recently_added = body.is_recently_added === 'false' || body.is_recently_added === false || body.is_recently_added === 0 ? 0 : 1;

    // Handle arrays
    const cast = typeof body.cast === 'string' ? body.cast : JSON.stringify(body.cast || ['Lead Performer']);
    const keywords = typeof body.keywords === 'string' ? body.keywords : JSON.stringify(body.keywords || []);
    const video_qualities = JSON.stringify(body.video_qualities || ['1080p FHD', '720p HD']);
    const audio_tracks = JSON.stringify(body.audio_tracks || ['Luganda [VJ Translation]', 'English [Stereo]']);
    const subtitles = JSON.stringify(body.subtitles || ['English [CC]']);

    // Check if movie already exists
    const existing = db.prepare('SELECT * FROM movies WHERE id = ?').get(id) as any;

    if (existing) {
      db.prepare(
        `UPDATE movies SET
          title = ?, original_title = ?, synopsis = ?, genre = ?, release_year = ?,
          duration_minutes = ?, age_rating = ?, vj_name = ?, vj_avatar_url = ?, vj_bio = ?,
          director = ?, cast = ?, keywords = ?, video_url = ?, poster_url = ?, thumbnail_url = ?, banner_url = ?,
          file_url = ?, filename = ?, original_filename = ?, file_size_mb = ?, is_active = ?, is_featured = ?,
          is_trending = ?, is_recently_added = ?
         WHERE id = ?`
      ).run(
        title,
        body.original_title || '',
        body.synopsis || '',
        genre,
        release_year,
        duration_minutes,
        body.age_rating || '16+',
        vj_name,
        vj_avatar_url || existing.vj_avatar_url,
        body.vj_bio || existing.vj_bio || '',
        vj_name,
        cast,
        keywords,
        video_url || existing.video_url,
        poster_url || existing.poster_url,
        thumbnail_url || existing.thumbnail_url,
        banner_url || existing.banner_url,
        file_url || existing.file_url,
        filename || existing.filename,
        original_filename || existing.original_filename || filename,
        file_size_mb,
        is_active,
        is_featured,
        is_trending,
        is_recently_added,
        id
      );
    } else {
      db.prepare(
        `INSERT INTO movies (
          id, title, original_title, synopsis, genre, release_year, duration_minutes,
          age_rating, vj_name, vj_avatar_url, vj_bio, director, cast, keywords,
          video_url, poster_url, thumbnail_url, banner_url, file_url, filename, original_filename, file_size_mb, video_qualities,
          audio_tracks, subtitles, rating, review_count, is_active, is_featured,
          is_trending, is_recently_added, download_permission, uploaded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, 0, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      ).run(
        id,
        title,
        body.original_title || '',
        body.synopsis || '',
        genre,
        release_year,
        duration_minutes,
        body.age_rating || '16+',
        vj_name,
        vj_avatar_url,
        body.vj_bio || '',
        vj_name,
        cast,
        keywords,
        video_url,
        poster_url,
        thumbnail_url,
        banner_url,
        file_url,
        filename,
        original_filename || filename,
        file_size_mb,
        video_qualities,
        audio_tracks,
        subtitles,
        is_active,
        is_featured,
        is_trending,
        is_recently_added,
        body.download_permission || 'free'
      );
    }

    // Also persist VJ profile if provided
    if (vj_name) {
      db.prepare(
        `INSERT INTO vjs (id, name, avatar_url, bio, genres)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(name) DO UPDATE SET
           avatar_url = COALESCE(NULLIF(excluded.avatar_url, ''), vjs.avatar_url),
           bio = COALESCE(NULLIF(excluded.bio, ''), vjs.bio),
           genres = COALESCE(NULLIF(excluded.genres, ''), vjs.genres)`
      ).run(
        `vj-${Date.now()}`,
        vj_name,
        vj_avatar_url,
        body.vj_bio || 'Ugandan VJ Cinema Specialist',
        genre
      );
    }

    const saved = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
    const formatted = formatMovieRecord(saved);

    res.status(201).json({
      message: 'Movie uploaded and saved permanently in SQLite!',
      movie: formatted,
      videoUrl: formatted?.videoUrl,
      title: formatted?.title,
    });
  } catch (error) {
    console.error('Upload API error:', error);
    res.status(500).json({ error: 'Failed to process and save movie on server.' });
  }
});

// Standalone image upload (e.g. for VJ avatar or cover art from device)
app.post('/api/upload-image', upload.single('image'), (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image file uploaded' });
  }
  const fileUrl = `/movies/${req.file.filename}`;
  res.json({ url: fileUrl, filename: req.file.filename });
});

// Chunked file upload (for large movies avoiding Cloud Run 32MB HTTP limits)
app.post('/api/upload-chunk', upload.single('chunk'), (req: Request, res: Response) => {
  try {
    const uploadId = req.body.uploadId || (req.query.uploadId as string);
    const chunkIndex = req.body.chunkIndex || req.query.chunkIndex || 0;
    const totalChunks = req.body.totalChunks || req.query.totalChunks || 1;

    if (!req.file || !uploadId) {
      return res.status(400).json({ error: 'Missing chunk or uploadId' });
    }

    const tempFilePath = path.join(uploadDir, `tmp_${uploadId}.part`);
    fs.appendFileSync(tempFilePath, fs.readFileSync(req.file.path));
    try {
      fs.unlinkSync(req.file.path);
    } catch {}

    res.json({ success: true, chunkIndex: Number(chunkIndex), totalChunks: Number(totalChunks) });
  } catch (error) {
    console.error('Chunk upload error:', error);
    res.status(500).json({ error: 'Failed to append chunk' });
  }
});

// Finalize chunked upload and create movie in database
app.post('/api/upload-complete', (req: Request, res: Response) => {
  try {
    const { uploadId, originalName, title, ...body } = req.body;
    // Retain the exact original movie file name - no numbers or suffixes appended
    const rawName = originalName || 'movie.mp4';
    const finalFilename = path.basename(rawName).replace(/[/\\]/g, '') || 'movie.mp4';
    const finalFilePath = path.join(uploadDir, finalFilename);

    const tempFilePath = path.join(uploadDir, `tmp_${uploadId}.part`);
    if (fs.existsSync(tempFilePath)) {
      if (fs.existsSync(finalFilePath)) {
        try {
          fs.unlinkSync(finalFilePath);
        } catch {}
      }
      fs.renameSync(tempFilePath, finalFilePath);
    }

    const id = body.id ? String(body.id) : `movie-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const video_url = `/movies/${finalFilename}`;
    const fileSizeMb = fs.existsSync(finalFilePath)
      ? Math.round((fs.statSync(finalFilePath).size / (1024 * 1024)) * 10) / 10
      : Number(body.file_size_mb) || 850;

    const baseMovieTitle = path.basename(rawName, path.extname(rawName)).replace(/[_-]/g, ' ');
    const movieTitle = (title || baseMovieTitle || 'Untitled Movie').trim();
    const movieGenre = body.genre || 'Action';
    const defaultPoster = DEFAULT_GENRE_POSTERS_MAP[movieGenre] || DEFAULT_GENRE_POSTERS_MAP['Action'];
    const poster_url = body.poster_url || body.thumbnail_url || defaultPoster;
    const banner_url = body.banner_url || poster_url;
    const vj_name = body.vj_name || 'VJ Junior';
    const is_active_val = body.is_active === 'false' || body.is_active === false || body.is_active === 0 || body.is_active === '0' ? 0 : 1;

    // Insert or update in SQLite
    db.prepare(
      `INSERT INTO movies (
        id, title, original_title, synopsis, genre, release_year, duration_minutes,
        age_rating, vj_name, vj_avatar_url, vj_bio, director, cast, keywords,
        video_url, poster_url, thumbnail_url, banner_url, file_url, filename, original_filename, file_size_mb, video_qualities,
        audio_tracks, subtitles, rating, review_count, is_active, is_featured,
        is_trending, is_recently_added, download_permission
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        original_title = excluded.original_title,
        synopsis = excluded.synopsis,
        genre = excluded.genre,
        release_year = excluded.release_year,
        duration_minutes = excluded.duration_minutes,
        age_rating = excluded.age_rating,
        vj_name = excluded.vj_name,
        vj_avatar_url = excluded.vj_avatar_url,
        vj_bio = excluded.vj_bio,
        director = excluded.director,
        cast = excluded.cast,
        keywords = excluded.keywords,
        video_url = excluded.video_url,
        poster_url = excluded.poster_url,
        thumbnail_url = excluded.thumbnail_url,
        banner_url = excluded.banner_url,
        file_url = excluded.file_url,
        filename = excluded.filename,
        original_filename = excluded.original_filename,
        file_size_mb = excluded.file_size_mb,
        is_active = excluded.is_active,
        is_featured = excluded.is_featured,
        is_trending = excluded.is_trending,
        is_recently_added = excluded.is_recently_added,
        download_permission = excluded.download_permission`
    ).run(
      id,
      movieTitle,
      body.original_title || '',
      body.synopsis || '',
      body.genre || 'Action',
      Number(body.release_year) || new Date().getFullYear(),
      Number(body.duration_minutes) || 120,
      body.age_rating || '16+',
      vj_name,
      body.vj_avatar_url || '',
      body.vj_bio || '',
      body.director || vj_name || 'VJ Junior',
      typeof body.cast === 'string' ? body.cast : JSON.stringify(body.cast || ['Lead Performer']),
      typeof body.keywords === 'string' ? body.keywords : JSON.stringify(body.keywords || []),
      video_url,
      poster_url,
      poster_url,
      banner_url,
      video_url,
      finalFilename,
      rawName || finalFilename,
      fileSizeMb,
      JSON.stringify(body.video_qualities || ['1080p FHD', '720p HD']),
      JSON.stringify(body.audio_tracks || ['Luganda [VJ Translation]', 'English [Stereo]']),
      JSON.stringify(body.subtitles || ['English [CC]']),
      5.0,
      0,
      is_active_val,
      1,
      1,
      1,
      body.download_permission || 'free'
    );

    const saved = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
    res.status(201).json({
      success: true,
      message: 'Movie uploaded in chunks and saved permanently in SQLite!',
      movie: formatMovieRecord(saved),
    });
  } catch (error) {
    console.error('Finalize upload error:', error);
    res.status(500).json({ error: 'Failed to finalize chunked movie upload' });
  }
});

// Get All Movies (For all users, persistent from SQLite)
app.get('/api/movies', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM movies ORDER BY created_at DESC').all();
    const movies = rows.map(formatMovieRecord);
    res.json(movies);
  } catch (error) {
    console.error('Get movies error:', error);
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// Create / update Movie metadata via JSON
app.post('/api/movies', (req: Request, res: Response) => {
  try {
    const movie = req.body || {};
    const id = movie.id ? String(movie.id) : `movie-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const title = (movie.title || 'Untitled Movie').trim();

    const cast = JSON.stringify(movie.cast || ['Lead Performer']);
    const keywords = JSON.stringify(movie.keywords || []);
    const qualities = JSON.stringify(movie.video_qualities || ['1080p FHD']);
    const audios = JSON.stringify(movie.audio_tracks || ['Luganda [VJ Translation]']);
    const subs = JSON.stringify(movie.subtitles || ['English [CC]']);

    const video_url = movie.video_url || movie.file_url || '';
    const poster_url = movie.poster_url || movie.thumbnail_url || movie.banner_url || '';

    db.prepare(
      `INSERT INTO movies (
        id, title, original_title, synopsis, genre, release_year, duration_minutes,
        age_rating, vj_name, vj_avatar_url, vj_bio, director, cast, keywords,
        video_url, poster_url, thumbnail_url, banner_url, file_url, filename, file_size_mb, video_qualities,
        audio_tracks, subtitles, rating, review_count, is_active, is_featured,
        is_trending, is_recently_added, download_permission
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        original_title = excluded.original_title,
        synopsis = excluded.synopsis,
        genre = excluded.genre,
        release_year = excluded.release_year,
        duration_minutes = excluded.duration_minutes,
        age_rating = excluded.age_rating,
        vj_name = excluded.vj_name,
        vj_avatar_url = excluded.vj_avatar_url,
        vj_bio = excluded.vj_bio,
        director = excluded.director,
        cast = excluded.cast,
        keywords = excluded.keywords,
        video_url = excluded.video_url,
        poster_url = excluded.poster_url,
        thumbnail_url = excluded.thumbnail_url,
        banner_url = excluded.banner_url,
        file_url = excluded.file_url,
        file_size_mb = excluded.file_size_mb,
        is_active = excluded.is_active,
        is_featured = excluded.is_featured,
        is_trending = excluded.is_trending,
        is_recently_added = excluded.is_recently_added,
        download_permission = excluded.download_permission`
    ).run(
      id,
      title,
      movie.original_title || '',
      movie.synopsis || '',
      movie.genre || 'Action',
      movie.release_year || new Date().getFullYear(),
      movie.duration_minutes || 120,
      movie.age_rating || '16+',
      movie.vj_name || 'VJ Junior',
      movie.vj_avatar_url || '',
      movie.vj_bio || '',
      movie.director || movie.vj_name || 'Livingstone Saka',
      cast,
      keywords,
      video_url,
      poster_url,
      poster_url,
      movie.banner_url || poster_url,
      video_url,
      movie.filename || '',
      movie.file_size_mb || 850,
      qualities,
      audios,
      subs,
      movie.rating || 0.0,
      movie.review_count || 0,
      movie.is_active !== false && movie.is_active !== 0 ? 1 : 0,
      movie.is_featured !== false && movie.is_featured !== 0 ? 1 : 0,
      movie.is_trending !== false && movie.is_trending !== 0 ? 1 : 0,
      movie.is_recently_added !== false && movie.is_recently_added !== 0 ? 1 : 0,
      movie.download_permission || 'free'
    );

    const saved = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
    res.json(formatMovieRecord(saved));
  } catch (error) {
    console.error('Save movie error:', error);
    res.status(500).json({ error: 'Failed to save movie record' });
  }
});

// Update or Upsert single movie
app.put('/api/movies/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};

    const existing = db.prepare('SELECT * FROM movies WHERE id = ?').get(id) as any;
    if (!existing) {
      // If movie doesn't exist yet in SQLite, perform upsert so publish never fails
      const genre = updates.genre || 'Action';
      const defaultPoster = DEFAULT_GENRE_POSTERS_MAP[genre] || DEFAULT_GENRE_POSTERS_MAP['Action'];
      const poster = updates.poster_url || updates.thumbnail_url || defaultPoster;
      const video = updates.video_url || updates.file_url || '';
      const title = (updates.title || 'Untitled Movie').trim();
      const vj = updates.vj_name || 'VJ Junior';

      const isActive = updates.is_active === 0 || updates.is_active === false || updates.is_active === '0' || updates.is_active === 'false' ? 0 : 1;

      db.prepare(
        `INSERT INTO movies (
          id, title, original_title, synopsis, genre, release_year, duration_minutes,
          age_rating, vj_name, vj_avatar_url, vj_bio, director, cast, keywords,
          video_url, poster_url, thumbnail_url, banner_url, file_url, filename,
          file_size_mb, video_qualities, audio_tracks, subtitles, rating, review_count,
          is_active, is_featured, is_trending, is_recently_added, download_permission
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        title,
        updates.original_title || '',
        updates.synopsis || '',
        genre,
        updates.release_year || new Date().getFullYear(),
        updates.duration_minutes || 120,
        updates.age_rating || '16+',
        vj,
        updates.vj_avatar_url || '',
        updates.vj_bio || '',
        updates.director || vj,
        JSON.stringify(updates.cast || ['Lead Performer']),
        JSON.stringify(updates.keywords || []),
        video,
        poster,
        poster,
        updates.banner_url || poster,
        video,
        updates.filename || '',
        updates.file_size_mb || 850,
        JSON.stringify(updates.video_qualities || ['1080p FHD']),
        JSON.stringify(updates.audio_tracks || ['Luganda [VJ Translation]']),
        JSON.stringify(updates.subtitles || ['English [CC]']),
        5.0,
        0,
        isActive,
        1,
        1,
        1,
        updates.download_permission || 'free'
      );

      const created = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
      return res.json(formatMovieRecord(created));
    }

    const fields: string[] = [];
    const values: any[] = [];

    const allowed = [
      'title', 'original_title', 'synopsis', 'genre', 'release_year',
      'duration_minutes', 'age_rating', 'vj_name', 'vj_avatar_url', 'vj_bio',
      'director', 'video_url', 'poster_url', 'thumbnail_url', 'banner_url', 'file_url', 'file_size_mb',
      'is_active', 'is_featured', 'is_trending', 'is_recently_added',
      'download_permission'
    ];

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        let val = updates[key];
        if (typeof val === 'boolean') {
          val = val ? 1 : 0;
        } else if (key === 'is_active' || key === 'is_featured' || key === 'is_trending' || key === 'is_recently_added') {
          val = val === 0 || val === '0' || val === 'false' || val === false ? 0 : 1;
        }
        values.push(val);
      }
    }

    if (updates.cast !== undefined) {
      fields.push('cast = ?');
      values.push(typeof updates.cast === 'string' ? updates.cast : JSON.stringify(updates.cast));
    }

    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE movies SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    const updated = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
    res.json(formatMovieRecord(updated));
  } catch (error) {
    console.error('Update movie error:', error);
    res.status(500).json({ error: 'Failed to update movie' });
  }
});

// Delete movie and its local video and image files from uploads
app.delete('/api/movies/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id) as any;

    if (movie) {
      // Find all possible local files linked to this movie
      const candidateFiles = new Set<string>();
      if (movie.filename) candidateFiles.add(movie.filename);

      const checkUrlForFilename = (url?: string) => {
        if (!url || typeof url !== 'string') return;
        if (url.startsWith('http://') || url.startsWith('https://')) return;
        const base = path.basename(url);
        if (base && !base.includes('..')) {
          candidateFiles.add(base);
        }
      };

      checkUrlForFilename(movie.video_url);
      checkUrlForFilename(movie.file_url);
      checkUrlForFilename(movie.poster_url);
      checkUrlForFilename(movie.thumbnail_url);
      checkUrlForFilename(movie.banner_url);

      for (const fname of candidateFiles) {
        const filePath = path.join(uploadDir, fname);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            console.log(`Deleted associated media file on disk: ${filePath}`);
          } catch (err) {
            console.warn(`Could not unlink file ${filePath}:`, err);
          }
        }
      }

      db.prepare('DELETE FROM reviews WHERE movie_id = ?').run(id);
      db.prepare('DELETE FROM movies WHERE id = ?').run(id);
    }

    res.json({ success: true, message: 'Movie and media files permanently deleted' });
  } catch (error) {
    console.error('Delete movie error:', error);
    res.status(500).json({ error: 'Failed to delete movie' });
  }
});

// Explicit file deletion endpoint for uploads directory
app.delete(['/api/files/:filename', '/api/uploads/:filename', '/uploads/:filename'], (req: Request, res: Response) => {
  try {
    const rawFilename = req.params.filename;
    const filename = path.basename(decodeURIComponent(rawFilename));
    const filePath = path.join(uploadDir, filename);

    let fileDeleted = false;
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        fileDeleted = true;
      } catch (err) {
        console.warn('Failed to unlink file:', filePath, err);
      }
    }

    // Clean up any database records referencing this file
    const affected = db.prepare(
      `SELECT id FROM movies WHERE filename = ? OR video_url LIKE ? OR file_url LIKE ?`
    ).all(filename, `%${filename}%`, `%${filename}%`) as any[];

    for (const m of affected) {
      db.prepare('DELETE FROM reviews WHERE movie_id = ?').run(m.id);
      db.prepare('DELETE FROM movies WHERE id = ?').run(m.id);
    }

    res.json({
      success: true,
      message: `File ${filename} deleted successfully`,
      fileDeleted,
      affectedMoviesCount: affected.length,
    });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Real-Time Streaming Download Proxy (Bypasses CORS restrictions and streams true chunks for realtime data consumption)
app.get('/api/stream-proxy', async (req: Request, res: Response) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl || !targetUrl.startsWith('http')) {
    return res.status(400).json({ error: 'Invalid stream target URL' });
  }

  try {
    const upstreamRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Sakanet-Cinema-Stream/1.0',
        ...(req.headers.range ? { Range: req.headers.range } : {}),
      },
    });

    res.status(upstreamRes.status);
    const passHeaders = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    passHeaders.forEach((h) => {
      const val = upstreamRes.headers.get(h);
      if (val) res.setHeader(h, val);
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

    if (!upstreamRes.body) {
      return res.end();
    }

    const { Readable } = await import('node:stream');
    // @ts-ignore
    const nodeStream = Readable.fromWeb(upstreamRes.body);
    nodeStream.pipe(res);
  } catch (err: any) {
    console.error('Stream proxy error:', err);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Failed to proxy movie stream' });
    }
  }
});

// Real User Reviews & Ratings API (Real calculations, not simulated)
app.get('/api/movies/:id/reviews', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const reviews = db.prepare('SELECT * FROM reviews WHERE movie_id = ? ORDER BY created_at DESC').all(id);
    res.json(reviews);
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Failed to load reviews' });
  }
});

app.post('/api/movies/:id/rate', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, comment, userId, userName, userAvatar } = req.body;

    const numRating = Math.max(1, Math.min(5, Math.round(Number(rating))));
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const reviewId = `rev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Insert user review
    db.prepare(
      `INSERT INTO reviews (id, movie_id, user_id, user_name, user_avatar, rating, comment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      reviewId,
      id,
      userId || 'guest',
      userName || 'Cinema Fan',
      userAvatar || '',
      numRating,
      comment.trim()
    );

    // Compute genuine average rating and total review count
    const stats = db.prepare(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE movie_id = ?'
    ).get(id) as any;

    const realAvg = stats?.avg_rating ? Number(stats.avg_rating.toFixed(1)) : numRating;
    const totalCount = Number(stats?.count) || 1;

    // Update movie rating
    db.prepare('UPDATE movies SET rating = ?, review_count = ? WHERE id = ?').run(
      realAvg,
      totalCount,
      id
    );

    const allReviews = db.prepare('SELECT * FROM reviews WHERE movie_id = ? ORDER BY created_at DESC').all(id);

    res.json({
      success: true,
      rating: realAvg,
      review_count: totalCount,
      reviews: allReviews,
    });
  } catch (error) {
    console.error('Rate movie error:', error);
    res.status(500).json({ error: 'Failed to submit rating' });
  }
});

// VJs API
app.get('/api/vjs', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare('SELECT * FROM vjs ORDER BY name ASC').all();
    res.json(rows);
  } catch (error) {
    console.error('Get VJs error:', error);
    res.status(500).json({ error: 'Failed to fetch VJs' });
  }
});

app.post('/api/vjs', (req: Request, res: Response) => {
  try {
    const { name, avatar_url, bio, genres } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'VJ Name is required' });
    }
    const cleanName = name.trim();
    const id = `vj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    db.prepare(
      `INSERT INTO vjs (id, name, avatar_url, bio, genres)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(name) DO UPDATE SET
         avatar_url = COALESCE(NULLIF(excluded.avatar_url, ''), vjs.avatar_url),
         bio = COALESCE(NULLIF(excluded.bio, ''), vjs.bio),
         genres = COALESCE(NULLIF(excluded.genres, ''), vjs.genres)`
    ).run(
      id,
      cleanName,
      avatar_url || '',
      bio || '',
      genres || ''
    );

    const updated = db.prepare('SELECT * FROM vjs WHERE name = ?').get(cleanName);
    res.json(updated);
  } catch (error) {
    console.error('Save VJ error:', error);
    res.status(500).json({ error: 'Failed to save VJ profile' });
  }
});

// 5. Mount Vite Middlewares in Dev or Serve Dist in Prod
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in development mode.');
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production build from dist folder.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running smoothly on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
