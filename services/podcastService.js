// Radar backend connector placeholder.
// Live implementation should use podcast RSS, Listen Notes, Spotify, or Apple Podcasts lookup from the backend.
export async function fetchPodcasts({ feedUrl = '', query = '' } = {}) {
  return {
    source: 'podcasts',
    feedUrl,
    query,
    results: [
      {
        providerId: feedUrl || 'mock-podcast-feed',
        title: `${query || 'Tracked podcast'} new episode`,
        guest: 'Mock Guest',
        publishedAt: new Date().toISOString(),
        links: {
          spotify: `https://open.spotify.com/search/${encodeURIComponent(query || 'podcast')}`,
          youtube: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${query || 'podcast'} latest episode`)}`,
          apple: `https://podcasts.apple.com/search?term=${encodeURIComponent(query || 'podcast')}`,
        },
      },
    ],
  };
}
