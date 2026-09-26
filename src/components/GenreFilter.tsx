import React from 'react';
import { X } from 'lucide-react';

interface GenreFilterProps {
  genres: string[];
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
  movieCount?: Record<string, number>;
}

export const GenreFilter: React.FC<GenreFilterProps> = ({
  genres,
  selectedGenre,
  onSelectGenre,
  movieCount = {},
}) => {
  return (
    <div className="space-y-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Filter by Genre
      </div>
      
      <div className="flex flex-wrap gap-2">
        {/* All Movies Button */}
        <button
          onClick={() => onSelectGenre(null)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
            selectedGenre === null
              ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/30'
              : 'bg-zinc-900/60 border-white/10 text-zinc-300 hover:border-white/20'
          }`}
        >
          All Movies
        </button>

        {/* Genre Buttons */}
        {genres.map((genre) => (
          <button
            key={genre}
            onClick={() => onSelectGenre(selectedGenre === genre ? null : genre)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all border flex items-center gap-2 ${
              selectedGenre === genre
                ? 'bg-red-600 text-white border-red-600 shadow-lg shadow-red-600/30'
                : 'bg-zinc-900/60 border-white/10 text-zinc-300 hover:border-white/20'
            }`}
          >
            <span>{genre}</span>
            {movieCount[genre] && (
              <span className={`text-xs font-mono ${
                selectedGenre === genre ? 'text-red-200' : 'text-zinc-500'
              }`}>
                {movieCount[genre]}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
