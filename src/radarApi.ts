export type TrackStatus = 'following' | 'watchlist' | 'paused';

export type SourceIds = {
  ticketmasterId?: string;
  tmdbId?: string;
  spotifyId?: string;
  youtubeChannelId?: string;
  podcastFeedUrl?: string;
  steamAppId?: string;
  igdbId?: string;
};

export type RadarInterest = {
  id: string;
  category: string;
  name: string;
  status: TrackStatus;
  preferences?: string[];
  radius?: string;
  sourceIds?: SourceIds;
};

export type SignalAction = {
  label: string;
  url: string;
  type: 'tickets' | 'calendar' | 'ics' | 'listen' | 'watch' | 'details' | 'store' | 'product' | 'price-alert' | 'trailer' | 'streaming' | 'patch-notes';
};

export type RadarSignal = {
  id: string;
  category: string;
  interestName: string;
  signalType: string;
  title: string;
  description: string;
  eventDate: string;
  location?: string;
  priority: 'high' | 'upcoming' | 'news' | 'recommendation';
  source: string;
  status: 'new' | 'read' | 'saved' | 'dismissed';
  actions: SignalAction[];
  relatedItems?: string[];
  sourceStatus?: string;
};

const todayIso = () => new Date().toISOString();

export function createSignal(signal: Omit<RadarSignal, 'status'> & { status?: RadarSignal['status'] }): RadarSignal {
  return {
    ...signal,
    status: signal.status ?? 'new',
  };
}

export function renderSignal(signal: RadarSignal) {
  return {
    heading: signal.title,
    meta: `${signal.category} • ${signal.signalType.replace(/_/g, ' ')}`,
    body: signal.description,
    actionCount: signal.actions.length,
  };
}

export function renderSignalCard(signal: RadarSignal) {
  return renderSignal(signal);
}

export function buildCalendarAction(signal: Pick<RadarSignal, 'title' | 'description' | 'eventDate' | 'location'>): SignalAction {
  const startDate = signal.eventDate.replace(/[-:]/g, '').split('.')[0];
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: signal.title,
    details: signal.description,
    dates: `${startDate}/${startDate}`,
  });

  if (signal.location) {
    params.set('location', signal.location);
  }

  return {
    label: 'Add to Calendar',
    url: `https://calendar.google.com/calendar/render?${params.toString()}`,
    type: 'calendar',
  };
}

export function buildIcsAction(signal: Pick<RadarSignal, 'title' | 'description' | 'eventDate' | 'location'>): SignalAction {
  const startDate = signal.eventDate.replace(/[-:]/g, '').split('.')[0];
  const icsData = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Radar//Mock Calendar Export//EN',
    'BEGIN:VEVENT',
    `DTSTART:${startDate}`,
    `SUMMARY:${signal.title}`,
    `DESCRIPTION:${signal.description}`,
    signal.location ? `LOCATION:${signal.location}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\\n');

  return {
    label: 'ICS Export',
    url: `data:text/calendar;charset=utf8,${encodeURIComponent(icsData)}`,
    type: 'ics',
  };
}

export function buildMockSourceIds(category: string, name: string): SourceIds {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  if (category === 'Music' || category === 'Comedians' || category === 'Sports' || category === 'Local Events') {
    return { ticketmasterId: `mock-tm-${slug}` };
  }

  if (category === 'Movies' || category === 'TV Shows') {
    return { tmdbId: `mock-tmdb-${slug}` };
  }

  if (category === 'Podcasts') {
    return {
      spotifyId: `mock-spotify-${slug}`,
      youtubeChannelId: `mock-yt-${slug}`,
      podcastFeedUrl: `https://example.com/${slug}.rss`,
    };
  }

  if (category === 'Video Games') {
    return {
      steamAppId: `mock-steam-${slug}`,
      igdbId: `mock-igdb-${slug}`,
    };
  }

  if (category === 'YouTubers / Creators') {
    return { youtubeChannelId: `mock-yt-${slug}` };
  }

  return {};
}

export function signalActionsForInterest(interest: RadarInterest): SignalAction[] {
  const query = encodeURIComponent(interest.name);

  if (interest.category === 'Podcasts') {
    return [
      { label: 'Spotify', url: `https://open.spotify.com/search/${query}`, type: 'listen' },
      { label: 'YouTube', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${interest.name} latest episode guest`)}`, type: 'watch' },
      { label: 'Apple Podcasts', url: `https://podcasts.apple.com/search?term=${query}`, type: 'listen' },
    ];
  }

  if (interest.category === 'Music' || interest.category === 'Comedians' || interest.category === 'Sports' || interest.category === 'Local Events') {
    const ticketSignal = {
      title: `${interest.name} event`,
      description: `Radar event for ${interest.name}`,
      eventDate: todayIso(),
      location: interest.radius ? `Within ${interest.radius} miles` : undefined,
    };

    return [
      { label: interest.category === 'Music' ? 'Ticketmaster' : 'Details', url: `https://www.ticketmaster.com/search?q=${query}`, type: 'tickets' },
      buildCalendarAction(ticketSignal),
      buildIcsAction(ticketSignal),
    ];
  }

  if (interest.category === 'Movies') {
    return [
      { label: 'Showtimes', url: `https://www.google.com/search?q=${encodeURIComponent(`${interest.name} showtimes near me`)}`, type: 'details' },
      { label: 'Trailer', url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${interest.name} trailer`)}`, type: 'trailer' },
      { label: 'Streaming', url: `https://www.google.com/search?q=${encodeURIComponent(`${interest.name} streaming`)}`, type: 'streaming' },
    ];
  }

  if (interest.category === 'Video Games') {
    return [
      { label: 'Patch Notes', url: `https://www.google.com/search?q=${encodeURIComponent(`${interest.name} patch notes`)}`, type: 'patch-notes' },
      { label: 'Store Page', url: `https://www.google.com/search?q=${encodeURIComponent(`${interest.name} store page`)}`, type: 'store' },
    ];
  }

  if (interest.category === 'Products & Brands') {
    return [
      { label: 'View Product', url: `https://www.google.com/search?q=${encodeURIComponent(`${interest.name} product availability`)}`, type: 'product' },
      { label: 'Price Alert', url: `https://www.google.com/search?q=${encodeURIComponent(`${interest.name} price drop`)}`, type: 'price-alert' },
    ];
  }

  return [
    { label: 'Details', url: `https://www.google.com/search?q=${query}`, type: 'details' },
  ];
}

export function mockSignalsForInterests(interests: RadarInterest[]): RadarSignal[] {
  return interests
    .filter((interest) => interest.status !== 'paused')
    .map((interest) => createSignal({
      id: `signal-${interest.id}`,
      category: interest.category,
      interestName: interest.name,
      signalType: signalTypeForCategory(interest.category),
      title: signalTitleForInterest(interest),
      description: signalDescriptionForInterest(interest),
      eventDate: todayIso(),
      location: interest.radius ? `Within ${interest.radius} miles` : undefined,
      priority: isInPersonCategory(interest.category) ? 'upcoming' : 'news',
      source: sourceForCategory(interest.category),
      sourceStatus: 'Mock API response',
      actions: signalActionsForInterest(interest),
      relatedItems: [interest.name],
    }));
}

export function mockNearMeSignalsForInterests(interests: RadarInterest[]): RadarSignal[] {
  const categories = new Set(interests.map((interest) => interest.category));
  const names = new Set(interests.map((interest) => interest.name.toLowerCase()));
  const nearMeTemplates = [
    ['Music', 'Summer amphitheater concert series', 'A nearby outdoor concert series matches your music interests.', 'concert', 'Ticketmaster / Bandsintown'],
    ['Comedians', 'Weekend comedy club lineup', 'Comedy shows are coming up near you based on your comedy selections.', 'comedy_show', 'Ticketmaster / Venue calendars'],
    ['Movies', 'Retro movie night nearby', 'A theater event near you matches your movie interests.', 'showtime', 'Theater showtimes'],
    ['Sports', 'Minor league baseball homestand', 'A nearby sports event may be relevant to your sports selections.', 'sports_event', 'Ticketmaster / Team calendars'],
    ['Local Events', 'Food truck festival downtown', 'A food festival nearby may fit your local event interests.', 'festival', 'Local event feeds'],
    ['Local Events', 'Regional air show', 'An air show is happening nearby and may be worth discovering.', 'air_show', 'Local event feeds'],
    ['Local Events', 'Classic car show', 'A nearby car show matches local event discovery settings.', 'car_show', 'Local event feeds'],
    ['Local Events', 'County fair weekend', 'A fair is coming up near you and is not already on your Radar.', 'fair', 'Local event feeds'],
    ['YouTubers / Creators', 'Creator meetup nearby', 'A creator-focused event near you may fit your creator selections.', 'creator_event', 'Creator / venue feeds'],
    ['Authors / Books', 'Local author signing', 'A signing event near you may match your book interests.', 'author_signing', 'Bookstore event feeds'],
  ] as const;

  return nearMeTemplates
    .filter(([category, title]) => categories.has(category) && !names.has(title.toLowerCase()))
    .map(([category, title, description, signalType, source]) => {
      const signal = {
        id: `near-me-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        category,
        interestName: title,
        signalType,
        title,
        description,
        eventDate: todayIso(),
        location: 'Near your saved location',
        priority: 'upcoming' as const,
        source,
        sourceStatus: 'Mock API response',
        actions: [
          { label: signalType === 'showtime' ? 'Showtimes' : 'Details', url: `https://www.google.com/search?q=${encodeURIComponent(`${title} near me`)}`, type: 'details' as const },
        ],
      };

      return {
        ...createSignal(signal),
        actions: [...signal.actions, buildCalendarAction(signal), buildIcsAction(signal)],
      };
    });
}

function signalTypeForCategory(category: string) {
  if (category === 'Podcasts') return 'new_episode';
  if (category === 'Music') return 'tour_date';
  if (category === 'Comedians') return 'comedy_show';
  if (category === 'Movies') return 'showtime';
  if (category === 'Video Games') return 'patch_or_release';
  if (category === 'Products & Brands') return 'product_availability';
  return 'radar_update';
}

function signalTitleForInterest(interest: RadarInterest) {
  if (interest.category === 'Podcasts') return `${interest.name}: latest episode monitoring`;
  if (interest.category === 'Music') return `${interest.name}: tour date monitoring`;
  if (interest.category === 'Comedians') return `${interest.name}: show date monitoring`;
  if (interest.category === 'Movies') return `${interest.name}: showtime and release monitoring`;
  if (interest.category === 'Video Games') return `${interest.name}: release and update monitoring`;
  return `${interest.name}: live data monitoring`;
}

function signalDescriptionForInterest(interest: RadarInterest) {
  if (interest.category === 'Podcasts') {
    return 'Radar will pull new episode drops, guest names, release timing, and links from podcast and video providers.';
  }

  if (interest.category === 'Music') {
    return `Radar will check tour dates and ticket sources${interest.radius ? ` within ${interest.radius} miles` : ''} for this selected artist.`;
  }

  if (interest.category === 'Comedians') {
    return `Radar will check comedy show dates and ticket sources${interest.radius ? ` within ${interest.radius} miles` : ''} for this selected comedian.`;
  }

  return `Radar will check connected providers for ${interest.preferences?.slice(0, 3).join(', ') || 'updates'} tied to this selection.`;
}

function sourceForCategory(category: string) {
  if (category === 'Podcasts') return 'Spotify / Apple Podcasts / YouTube';
  if (category === 'Music') return 'Bandsintown / Ticketmaster';
  if (category === 'Comedians' || category === 'Sports' || category === 'Local Events') return 'Ticketmaster / Event providers';
  if (category === 'Movies' || category === 'TV Shows') return 'TMDB / Theater showtimes';
  if (category === 'Video Games') return 'Steam / IGDB / Publisher feeds';
  if (category === 'Products & Brands') return 'Retail and recall feeds';
  if (category === 'Authors / Books') return 'Book release and event feeds';
  if (category === 'YouTubers / Creators') return 'YouTube / Creator feeds';
  return 'Connected services';
}

function isInPersonCategory(category: string) {
  return ['Music', 'Movies', 'Podcasts', 'Sports', 'Local Events', 'Authors / Books', 'YouTubers / Creators', 'Comedians'].includes(category);
}

async function getJsonOrMock<T>(url: string, mock: T): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return mock;
    }

    return await response.json() as T;
  } catch {
    return mock;
  }
}

export async function fetchRadarSignals(interests: RadarInterest[] = []): Promise<RadarSignal[]> {
  return getJsonOrMock('/api/signals', mockSignalsForInterests(interests));
}

export async function fetchNearMeSignals(interests: RadarInterest[] = []): Promise<RadarSignal[]> {
  return getJsonOrMock('/api/near-me', mockNearMeSignalsForInterests(interests));
}

export async function fetchInterestSuggestions(category: string, query = ''): Promise<string[]> {
  return getJsonOrMock(`/api/interests?category=${encodeURIComponent(category)}&q=${encodeURIComponent(query)}`, []);
}

export async function fetchTicketmasterEvents(interests: RadarInterest[] = []): Promise<RadarSignal[]> {
  return getJsonOrMock('/api/signals?source=ticketmaster', mockSignalsForInterests(interests.filter((interest) => isInPersonCategory(interest.category))));
}

export async function fetchMovieData(interests: RadarInterest[] = []): Promise<RadarSignal[]> {
  return getJsonOrMock('/api/signals?source=tmdb', mockSignalsForInterests(interests.filter((interest) => interest.category === 'Movies' || interest.category === 'TV Shows')));
}

export async function fetchPodcastData(interests: RadarInterest[] = []): Promise<RadarSignal[]> {
  return getJsonOrMock('/api/signals?source=podcasts', mockSignalsForInterests(interests.filter((interest) => interest.category === 'Podcasts')));
}

export async function fetchGameData(interests: RadarInterest[] = []): Promise<RadarSignal[]> {
  return getJsonOrMock('/api/signals?source=games', mockSignalsForInterests(interests.filter((interest) => interest.category === 'Video Games')));
}
