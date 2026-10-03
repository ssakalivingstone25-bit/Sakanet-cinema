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
    const ext = path.extname(file.originalname) || '.mp4';
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, // Up to 2GB per video file
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
    return res.status(404).json({ error: 'Media file not found' });
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
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// Also serve uploads directory statically
app.use('/movies', express.static(uploadDir));
app.use('/uploads', express.static(uploadDir));

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

// Add uploaded_at, video_url, poster_url columns if database already existed without them
try {
  db.exec('ALTER TABLE movies ADD COLUMN uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP');
} catch {}
try {
  db.exec('ALTER TABLE movies ADD COLUMN video_url TEXT');
} catch {}
try {
  db.exec('ALTER TABLE movies ADD COLUMN poster_url TEXT');
} catch {}

// Ensure all uploaded movies are active by default so catalog always shows them
try {
  db.exec('UPDATE movies SET is_active = 1 WHERE is_active = 0');
} catch {}

console.log('Connected to persistent SQLite database at:', dbPath);

// Helper to format SQLite movie record for React frontend
function formatMovieRecord(row: any) {
  if (!row) return null;
  const isVideoExt = (url: string) => /\.(mp4|webm|mkv|mov)$/i.test(url);
  const video_url = row.video_url || row.file_url || (row.filename ? `/movies/${row.filename}` : '');
  const poster_url =
    row.poster_url ||
    (row.thumbnail_url && !isVideoExt(row.thumbnail_url) ? row.thumbnail_url : '') ||
    (row.banner_url && !isVideoExt(row.banner_url) ? row.banner_url : '') ||
    '';
  const idStr = String(row.id);
  const createdDate = row.created_at || row.uploaded_at || new Date().toISOString();

  return {
    ...row,
    id: idStr,
    title: row.title || 'Untitled Movie',
    video_url,
    poster_url,
    file_url: video_url,
    videoUrl: video_url, // streamable URL alias
    uploadedAt: row.uploaded_at || row.created_at || createdDate,
    thumbnail_url: poster_url,
    banner_url: poster_url,
    genre: row.genre || 'Action',
    vj_name: row.vj_name || 'VJ Junior',
    vj_avatar_url: row.vj_avatar_url || '',
    vj_bio: row.vj_bio || '',
    director: row.director || row.vj_name || 'VJ Junior',
    cast: parseJsonSafe(row.cast, ['Lead Performer']),
    keywords: parseJsonSafe(row.keywords, []),
    video_qualities: parseJsonSafe(row.video_qualities, ['1080p FHD', '720p HD']),
    audio_tracks: parseJsonSafe(row.audio_tracks, ['Luganda [VJ Translation]', 'English [Stereo]']),
    subtitles: parseJsonSafe(row.subtitles, ['English [CC]']),
    is_active: row.is_active === 0 ? false : true,
    is_featured: row.is_featured === 0 ? false : true,
    is_trending: row.is_trending === 0 ? false : true,
    is_recently_added: row.is_recently_added === 0 ? false : true,
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
      (movieFile ? path.basename(movieFile.originalname, path.extname(movieFile.originalname)) : 'Untitled Movie')
    ).trim();

    if (!title && !movieFile) {
      return res.status(400).json({ error: 'Missing title or movie file.' });
    }

    const id = body.id ? String(body.id) : `movie-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const filename = movieFile ? movieFile.filename : (body.filename || '');
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
          file_url = ?, filename = ?, file_size_mb = ?, is_active = ?, is_featured = ?,
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
          video_url, poster_url, thumbnail_url, banner_url, file_url, filename, file_size_mb, video_qualities,
          audio_tracks, subtitles, rating, review_count, is_active, is_featured,
          is_trending, is_recently_added, download_permission, uploaded_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 5.0, 0, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
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
    const movie = req.body;
    if (!movie.id || !movie.title) {
      return res.status(400).json({ error: 'Missing movie ID or title' });
    }

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
      movie.id,
      movie.title,
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
      movie.is_active ? 1 : 0,
      movie.is_featured ? 1 : 0,
      movie.is_trending ? 1 : 0,
      movie.is_recently_added ? 1 : 0,
      movie.download_permission || 'free'
    );

    const saved = db.prepare('SELECT * FROM movies WHERE id = ?').get(movie.id);
    res.json(formatMovieRecord(saved));
  } catch (error) {
    console.error('Save movie error:', error);
    res.status(500).json({ error: 'Failed to save movie record' });
  }
});

// Update single movie
app.put('/api/movies/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const existing = db.prepare('SELECT * FROM movies WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Movie not found' });
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
        if (typeof val === 'boolean') val = val ? 1 : 0;
        values.push(val);
      }
    }

    if (updates.cast !== undefined) {
      fields.push('cast = ?');
      values.push(JSON.stringify(updates.cast));
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

// Delete movie and its local video file
app.delete('/api/movies/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const movie = db.prepare('SELECT * FROM movies WHERE id = ?').get(id) as any;

    if (movie) {
      if (movie.filename) {
        const filePath = path.join(uploadDir, movie.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
          } catch {}
        }
      }
      db.prepare('DELETE FROM reviews WHERE movie_id = ?').run(id);
      db.prepare('DELETE FROM movies WHERE id = ?').run(id);
    }

    res.json({ success: true, message: 'Movie deleted permanently' });
  } catch (error) {
    console.error('Delete movie error:', error);
    res.status(500).json({ error: 'Failed to delete movie' });
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
