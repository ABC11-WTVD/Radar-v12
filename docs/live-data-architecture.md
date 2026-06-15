# Radar Live Data Architecture

Radar's frontend should call Radar-owned backend endpoints, not third-party APIs directly. This keeps API keys out of browser code, lets Radar normalize source data, and gives the backend control over deduplication, scheduling, push/email/digest notifications, and source ID storage.

## Frontend endpoints

The current frontend is prepared for these backend endpoints:

- `GET /api/signals`
- `GET /api/interests`
- `GET /api/near-me`
- `POST /api/interests`
- `PATCH /api/interests/:id`

Mock frontend functions are in `src/radarApi.ts`:

- `fetchRadarSignals()`
- `fetchNearMeSignals()`
- `fetchInterestSuggestions()`
- `fetchTicketmasterEvents()`
- `fetchMovieData()`
- `fetchPodcastData()`
- `fetchGameData()`

Mock service connector placeholders are in `/services`:

- `ticketmasterService.js`
- `tmdbService.js`
- `youtubeService.js`
- `podcastService.js`
- `gameService.js`

These service files document the expected provider response shape. In production, equivalent service code should run in the backend, not in the browser.

## Backend responsibilities

The backend should:

- Store user interests and status: Following, Watchlist, Paused
- Store user location/radius and multiple saved locations
- Store source IDs, including Ticketmaster attraction IDs, TMDB IDs, Spotify IDs, YouTube channel IDs, podcast RSS URLs, Steam app IDs, and IGDB IDs
- Run scheduled jobs to check provider APIs periodically
- Deduplicate provider results into Radar signals
- Generate push, email, immediate, daily digest, and weekly digest notifications
- Keep third-party API keys and credentials server-side only

## Provider plan

- Ticketmaster Discovery API: concerts, comedians, sports, local events, fairs, festivals, air shows, car shows
- TMDB API: movies, TV, release dates, trailers, streaming providers
- YouTube Data API: trailers, creators, podcast video episodes
- Podcast RSS feeds, Listen Notes, and Apple Podcasts lookup: podcast episodes, guests, feeds
- IGDB or Steam APIs: video game releases, DLC, updates, patches, store pages
- Product APIs or affiliate feeds later: price drops, restocks, recalls, availability

## Standard signal object

All dashboard, alert, briefing, and Near Me cards should use this structure:

```ts
{
  id,
  category,
  interestName,
  signalType,
  title,
  description,
  eventDate,
  location,
  priority,
  source,
  status,
  actions: [
    { label, url, type }
  ]
}
```

Calendar support currently uses a mock Google Calendar link generated from signal title, description, date, and location. A backend can later generate `.ics` files or provider-specific calendar links.

The frontend helper layer also exposes `createSignal()`, `renderSignal()`, and `renderSignalCard()` for consistent signal creation and rendering metadata.
