// Radar backend connector placeholder.
// Live implementation should call TMDB from the backend for movies, TV, release dates, trailers, and streaming providers.
export async function fetchMovies({ query = '' } = {}) {
  return {
    source: 'tmdb',
    query,
    results: [
      {
        providerId: 'mock-tmdb-movie',
        title: query || 'Tracked movie',
        releaseDate: new Date().toISOString(),
        trailerUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query || 'movie'} trailer`)}`,
      },
    ],
  };
}

export async function fetchShows({ query = '' } = {}) {
  return {
    source: 'tmdb',
    query,
    results: [
      {
        providerId: 'mock-tmdb-show',
        title: query || 'Tracked show',
        nextEpisodeDate: new Date().toISOString(),
        streamingProviders: ['Mock Streaming Provider'],
      },
    ],
  };
}
