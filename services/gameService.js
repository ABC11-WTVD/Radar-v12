// Radar backend connector placeholder.
// Live implementation should call IGDB, Steam, and publisher feeds from the backend for releases, DLC, patches, and outages.
export async function fetchGames({ steamAppId = '', igdbId = '', query = '' } = {}) {
  return {
    source: 'games',
    steamAppId,
    igdbId,
    query,
    results: [
      {
        providerId: steamAppId || igdbId || 'mock-game-id',
        title: `${query || 'Tracked game'} update`,
        updateType: 'patch',
        publishedAt: new Date().toISOString(),
        url: `https://www.google.com/search?q=${encodeURIComponent(`${query || 'game'} patch notes`)}`,
      },
    ],
  };
}
