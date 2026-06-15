import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  Check,
  ChevronLeft,
  Compass,
  Gamepad2,
  Headphones,
  Home as HomeIcon,
  MapPin,
  PlayCircle,
  Radar as RadarIcon,
  Settings,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  UserRound,
  Zap,
} from 'lucide-react';
import {
  DEFAULT_SUBSCRIPTION_TIER,
  buildCalendarAction,
  buildMockSourceIds,
  createSignal,
  hasPremium,
  hasPro,
  mockNearMeSignalsForInterests,
  mockSignalsForInterests,
  type RadarSignal,
  type SourceIds,
  type SubscriptionTier,
  type TrackStatus,
} from './radarApi';

type AppScreen = 'splash' | 'accountChoice' | 'signIn' | 'onboarding' | 'dashboard';
type DashboardTab = 'home' | 'radar' | 'discover' | 'nearMe' | 'alerts' | 'settings';
type OnboardingStep = 'category' | 'platforms' | 'genres' | 'suggestions' | 'preferences' | 'location' | 'summary';
type AccountMode = 'local' | 'account';

type CategoryConfig = {
  id: string;
  name: string;
  eyebrow: string;
  description: string;
  genreLabel: string;
  suggestionLabel: string;
  genres: string[];
  suggestions: Record<string, string[]>;
  preferences: string[];
  location?: boolean;
  platforms?: string[];
};

type CategorySelection = {
  genres: string[];
  suggestions: string[];
  preferences: string[];
  platforms: string[];
  radius: string;
};

type TrackedItem = {
  id: string;
  category: string;
  name: string;
  status: TrackStatus;
  rationale?: string;
  preferences?: string[];
  radius?: string;
  sourceIds?: SourceIds;
};

type BriefingItem = RadarSignal;
type SavedLocation = {
  id: string;
  name: string;
  radius: string;
  isPrimary: boolean;
};
type RadarSettings = {
  notificationFrequency: 'Immediate' | 'Daily Digest' | 'Weekly Digest';
  sound: 'Sonar Ping' | 'Radar Sweep' | 'Silent';
  theme: 'Radar Dark' | 'Radar Dark Green' | 'High Contrast';
  connectedServices: string[];
  locations: SavedLocation[];
};
type PersistedRadarProfile = {
  accountMode?: AccountMode;
  completedCategoryIds?: string[];
  hasOpenedDashboard?: boolean;
  settings?: RadarSettings;
  selectedAlerts?: string[];
  selectedCategoryIds?: string[];
  selections?: Record<string, CategorySelection>;
  subscriptionTier?: SubscriptionTier;
  trackedItems?: TrackedItem[];
  savedAt?: string;
};

const STORAGE_KEY = 'radar-local-profile-v1';
const radii = ['25', '50', '100', '250', '500'];
const defaultSettings: RadarSettings = {
  notificationFrequency: 'Daily Digest',
  sound: 'Sonar Ping',
  theme: 'Radar Dark',
  connectedServices: [],
  locations: [
    { id: 'home-milwaukee', name: 'Milwaukee', radius: '50', isPrimary: true },
    { id: 'also-chicago', name: 'Chicago', radius: '100', isPrimary: false },
    { id: 'also-nashville', name: 'Nashville', radius: '100', isPrimary: false },
    { id: 'also-charlotte', name: 'Charlotte', radius: '100', isPrimary: false },
  ],
};

const categories: CategoryConfig[] = [
  {
    id: 'music',
    name: 'Music',
    eyebrow: 'Concerts, releases, and artist news',
    description: 'Follow artists and scenes so Radar can surface shows, albums, singles, interviews, and tour announcements.',
    genreLabel: 'Select music genres',
    suggestionLabel: 'Artists generated from your genres',
    genres: [
      'Rock',
      'Hard Rock',
      'Metal',
      'Heavy Metal',
      'Thrash Metal',
      'Death Metal',
      'Black Metal',
      'Metalcore',
      'Alternative',
      'Grunge',
      'Punk',
      'Pop Punk',
      'Country',
      'Outlaw Country',
      'Blues',
      'Jazz',
      'EDM',
      'House',
      'Techno',
      'Trance',
      'Rap',
      'Hip Hop',
      'Classical',
      'Folk',
      'Christian',
      'Indie',
    ],
    suggestions: {
      Metal: ['Metallica', 'Tool', 'Pantera', 'Megadeth', 'Gojira', 'Lamb of God', 'Iron Maiden', 'Mastodon'],
      'Heavy Metal': ['Black Sabbath', 'Judas Priest', 'Iron Maiden', 'Dio', 'Ozzy Osbourne'],
      'Thrash Metal': ['Metallica', 'Megadeth', 'Slayer', 'Anthrax', 'Testament', 'Exodus'],
      'Death Metal': ['Death', 'Cannibal Corpse', 'Morbid Angel', 'Obituary', 'Amon Amarth'],
      Metalcore: ['Killswitch Engage', 'August Burns Red', 'Trivium', 'As I Lay Dying', 'Architects'],
      Rock: ['Foo Fighters', 'The Black Keys', 'Pearl Jam', 'Greta Van Fleet', 'Queens of the Stone Age'],
      'Hard Rock': ['AC/DC', 'Aerosmith', 'Guns N Roses', 'Shinedown', 'Halestorm'],
      Alternative: ['Radiohead', 'The Smashing Pumpkins', 'Muse', 'Cage the Elephant', 'The Killers'],
      Grunge: ['Nirvana', 'Pearl Jam', 'Soundgarden', 'Alice in Chains', 'Stone Temple Pilots'],
      Punk: ['The Clash', 'Ramones', 'Rancid', 'Bad Religion', 'The Offspring'],
      'Pop Punk': ['Blink-182', 'Green Day', 'Paramore', 'Fall Out Boy', 'New Found Glory'],
      Country: ['Chris Stapleton', 'Zach Bryan', 'Lainey Wilson', 'Luke Combs', 'Miranda Lambert'],
      'Outlaw Country': ['Waylon Jennings', 'Willie Nelson', 'Sturgill Simpson', 'Tyler Childers', 'Cody Jinks'],
      Blues: ['Gary Clark Jr.', 'Buddy Guy', 'Joe Bonamassa', 'Tedeschi Trucks Band', 'Christone Kingfish Ingram'],
      Jazz: ['Kamasi Washington', 'Herbie Hancock', 'Snarky Puppy', 'Esperanza Spalding', 'Cory Henry'],
      EDM: ['Calvin Harris', 'Illenium', 'Zedd', 'Martin Garrix', 'ODESZA'],
      House: ['Disclosure', 'MK', 'Chris Lake', 'Dom Dolla', 'Green Velvet'],
      Techno: ['Charlotte de Witte', 'Amelie Lens', 'Adam Beyer', 'Carl Cox', 'Nina Kraviz'],
      Trance: ['Armin van Buuren', 'Above & Beyond', 'Paul van Dyk', 'Ferry Corsten', 'Gareth Emery'],
      Rap: ['Kendrick Lamar', 'J. Cole', 'Drake', 'Nas', 'Tyler, The Creator'],
      'Hip Hop': ['Run The Jewels', 'A Tribe Called Quest', 'The Roots', 'Denzel Curry', 'Little Simz'],
      Classical: ['Yo-Yo Ma', 'Hilary Hahn', 'Lang Lang', 'London Symphony Orchestra', 'Max Richter'],
      Folk: ['Noah Kahan', 'The Lumineers', 'Bon Iver', 'Brandi Carlile', 'Fleet Foxes'],
      Christian: ['Lauren Daigle', 'For King & Country', 'Elevation Worship', 'TobyMac', 'Needtobreathe'],
      Indie: ['Phoebe Bridgers', 'Tame Impala', 'Mitski', 'Japanese Breakfast', 'The National'],
    },
    preferences: ['Concerts', 'Concerts near me', 'Ticket price drops', 'New albums', 'New singles', 'Tour announcements', 'Podcast appearances', 'Interviews'],
    location: true,
  },
  {
    id: 'movies',
    name: 'Movies',
    eyebrow: 'Trailers, tickets, and streaming windows',
    description: 'Track theatrical and streaming timelines for films you care about.',
    genreLabel: 'Select movie interests',
    suggestionLabel: 'Movie suggestions',
    genres: ['Superhero', 'Action', 'Horror', 'Comedy', 'Sci-Fi', 'Drama', 'Animation', 'Documentary'],
    suggestions: {
      Superhero: ['Fantastic Four', 'Superman', 'The Batman Part II', 'Avengers: Secret Wars'],
      Action: ['Mission: Impossible', 'John Wick', 'Ballerina', 'The Old Guard'],
      Horror: ['Weapons', 'The Conjuring', 'M3GAN', 'A Quiet Place'],
      Comedy: ['The Naked Gun', 'Happy Gilmore', 'The Studio', 'Only Murders in the Building'],
      'Sci-Fi': ['Dune', 'Project Hail Mary', 'Tron: Ares', 'Avatar'],
      Drama: ['Marty Supreme', 'The Brutalist', 'Sing Sing', 'Past Lives'],
      Animation: ['Inside Out', 'Spider-Verse', 'Toy Story', 'The Wild Robot'],
      Documentary: ['Formula 1: Drive to Survive', 'Planet Earth', 'The Last Dance', 'Free Solo'],
    },
    preferences: ['Trailers', 'Theater release', 'Streaming release', 'Digital release', 'Showtimes', 'Showtimes near me', 'Leaving streaming soon'],
    location: true,
  },
  {
    id: 'tv',
    name: 'TV Shows',
    eyebrow: 'Episodes, seasons, renewals, and cancellations',
    description: 'Keep streaming and network shows on your radar without hunting across apps.',
    genreLabel: 'Select TV interests',
    suggestionLabel: 'TV show suggestions',
    genres: ['Comedy', 'Drama', 'Sci-Fi', 'Fantasy', 'Reality', 'Crime', 'Animation', 'Documentary'],
    suggestions: {
      Comedy: ['The Bear', 'Abbott Elementary', 'Hacks', 'Only Murders in the Building'],
      Drama: ['The Last of Us', 'Shogun', 'Severance', 'Yellowstone'],
      'Sci-Fi': ['Stranger Things', 'Foundation', 'Silo', 'Doctor Who'],
      Fantasy: ['House of the Dragon', 'The Rings of Power', 'The Witcher', 'Wheel of Time'],
      Reality: ['Survivor', 'The Amazing Race', 'Top Chef', 'Alone'],
      Crime: ['True Detective', 'Mindhunter', 'Fargo', 'Mare of Easttown'],
      Animation: ['Invincible', 'X-Men 97', 'Bluey', 'Rick and Morty'],
      Documentary: ['Welcome to Wrexham', 'Chef Table', 'Our Planet', 'Quarterback'],
    },
    preferences: ['Episodes', 'Seasons', 'Renewals', 'Cancellations', 'Streaming availability'],
  },
  {
    id: 'podcasts',
    name: 'Podcasts',
    eyebrow: 'Episodes, guests, live events, and video versions',
    description: 'Follow shows and hosts across Spotify, YouTube, Apple Podcasts, and live events.',
    genreLabel: 'Select podcast genres',
    suggestionLabel: 'Podcast suggestions',
    genres: ['Comedy', 'Technology', 'History', 'Business', 'Finance', 'Science', 'Sports', 'Gaming', 'News', 'True Crime', 'Interview Shows', 'Storytelling'],
    suggestions: {
      Comedy: ['SmartLess', 'The Nateland Podcast', 'Conan OBrien Needs a Friend', 'This Past Weekend'],
      Technology: ['Waveform', 'Decoder', 'Hard Fork', 'Darknet Diaries'],
      History: ['Hardcore History', 'Revisionist History', 'The Rest Is History', 'American History Tellers'],
      Business: ['How I Built This', 'Acquired', 'Masters of Scale', 'The Prof G Pod'],
      Finance: ['Planet Money', 'The Indicator', 'Motley Fool Money', 'BiggerPockets Money'],
      Science: ['Radiolab', 'Science Vs', 'Ologies', 'StarTalk'],
      Sports: ['The Bill Simmons Podcast', 'Pardon My Take', 'The Lowe Post', 'The Ringer NFL Show'],
      Gaming: ['Kinda Funny Gamescast', 'Triple Click', 'SpawnCast', 'The MinnMax Show'],
      News: ['The Daily', 'Up First', 'Today Explained', 'The Journal'],
      'True Crime': ['Serial', 'Crime Junkie', 'Casefile', 'Criminal'],
      'Interview Shows': ['WTF with Marc Maron', 'Armchair Expert', 'Fresh Air', 'Hot Ones'],
      Storytelling: ['This American Life', 'Snap Judgment', 'The Moth', 'Heavyweight'],
    },
    preferences: ['New episodes', 'Guest appearances', 'Live events', 'Live events near me', 'Video versions', 'Special releases', 'Spotify links', 'YouTube links', 'Apple Podcasts links'],
    location: true,
  },
  {
    id: 'games',
    name: 'Video Games',
    eyebrow: 'Releases, DLC, patches, betas, and outages',
    description: 'Track games by platform and genre. No location step is used for this category.',
    genreLabel: 'Select game genres',
    suggestionLabel: 'Game suggestions',
    platforms: ['PC', 'Xbox', 'PlayStation', 'Nintendo', 'Mobile'],
    genres: ['RPG', 'FPS', 'MMO', 'Strategy', 'Sports', 'Simulation', 'Survival', 'Action'],
    suggestions: {
      RPG: ['Elden Ring', 'Final Fantasy', 'Baldurs Gate 3', 'The Witcher'],
      FPS: ['Call of Duty', 'Halo', 'Valorant', 'Apex Legends'],
      MMO: ['World of Warcraft', 'Final Fantasy XIV', 'Guild Wars 2', 'The Elder Scrolls Online'],
      Strategy: ['Civilization', 'Age of Empires', 'XCOM', 'Total War'],
      Sports: ['EA Sports FC', 'Madden NFL', 'NBA 2K', 'MLB The Show'],
      Simulation: ['Microsoft Flight Simulator', 'The Sims', 'Cities: Skylines', 'Stardew Valley'],
      Survival: ['Minecraft', 'Rust', 'Valheim', 'Subnautica'],
      Action: ['Fortnite', 'Helldivers 2', 'Grand Theft Auto', 'God of War'],
    },
    preferences: ['Release dates', 'DLC', 'Updates', 'Patches', 'Betas', 'Server outages', 'Events', 'Developer announcements'],
  },
  {
    id: 'sports',
    name: 'Sports',
    eyebrow: 'Games, tickets, standings, and key announcements',
    description: 'Follow teams, leagues, and local sports events that matter to you.',
    genreLabel: 'Select sports',
    suggestionLabel: 'Teams and leagues',
    genres: ['Football', 'Basketball', 'Baseball', 'Hockey', 'Soccer', 'NASCAR', 'Golf', 'Combat Sports'],
    suggestions: {
      Football: ['Carolina Panthers', 'Dallas Cowboys', 'Kansas City Chiefs', 'NFL'],
      Basketball: ['Charlotte Hornets', 'Boston Celtics', 'Golden State Warriors', 'NBA'],
      Baseball: ['Atlanta Braves', 'New York Yankees', 'Chicago Cubs', 'MLB'],
      Hockey: ['Carolina Hurricanes', 'New York Rangers', 'Vegas Golden Knights', 'NHL'],
      Soccer: ['Charlotte FC', 'USMNT', 'Premier League', 'MLS'],
      NASCAR: ['Daytona 500', 'Charlotte Motor Speedway', 'NASCAR Cup Series', 'Hendrick Motorsports'],
      Golf: ['The Masters', 'PGA Tour', 'Ryder Cup', 'U.S. Open'],
      'Combat Sports': ['UFC', 'WWE', 'Boxing', 'Bellator'],
    },
    preferences: ['Game times', 'Games near me', 'Ticket availability', 'Schedule changes', 'Standings', 'Injury news', 'Local events'],
    location: true,
  },
  {
    id: 'products',
    name: 'Products & Brands',
    eyebrow: 'Price drops, restocks, versions, recalls, and availability',
    description: 'Watch products and brands quietly or turn on alerts when inventory changes.',
    genreLabel: 'Select product areas',
    suggestionLabel: 'Product and brand suggestions',
    genres: ['Tools', 'Gaming Hardware', 'Vehicles', 'Makers', 'Home Tech', 'Outdoor Gear'],
    suggestions: {
      Tools: ['Milwaukee', 'DeWalt', 'Makita', 'Ryobi'],
      'Gaming Hardware': ['Nintendo', 'Steam Deck', 'PlayStation Portal', 'Xbox Series X'],
      Vehicles: ['Ford', 'Toyota', 'Jeep', 'Tesla'],
      Makers: ['Laser Engravers', '3D Printers', 'CNC Routers', 'Glowforge'],
      'Home Tech': ['Ring', 'Nest', 'Eufy', 'Sonos'],
      'Outdoor Gear': ['YETI', 'Traeger', 'Solo Stove', 'Blackstone'],
    },
    preferences: ['Price drops', 'Restocks', 'New versions', 'Recalls', 'Availability'],
  },
  {
    id: 'local-events',
    name: 'Local Events',
    eyebrow: 'Fairs, air shows, festivals, markets, and conventions',
    description: 'Find nearby events based on interests and location.',
    genreLabel: 'Select local event types',
    suggestionLabel: 'Local event ideas',
    genres: ['County Fairs', 'Air Shows', 'Car Shows', 'Comic Cons', 'Festivals', 'Farmers Markets', 'Craft Shows', 'Food Festivals'],
    suggestions: {
      'County Fairs': ['State Fair', 'County Fair', 'Livestock Show', 'Carnival Night'],
      'Air Shows': ['Blue Angels Air Show', 'Warbird Fly-In', 'Aviation Expo', 'Airport Open House'],
      'Car Shows': ['Cars and Coffee', 'Classic Auto Show', 'Cruise-In', 'Truck Expo'],
      'Comic Cons': ['GalaxyCon', 'Comic-Con', 'Anime Convention', 'Collector Expo'],
      Festivals: ['Music Festival', 'Street Festival', 'Arts Festival', 'Heritage Festival'],
      'Farmers Markets': ['Downtown Farmers Market', 'Night Market', 'Holiday Market', 'Local Produce Fair'],
      'Craft Shows': ['Holiday Craft Show', 'Makers Market', 'Artisan Fair', 'Woodworking Expo'],
      'Food Festivals': ['BBQ Festival', 'Food Truck Rodeo', 'Seafood Festival', 'Taste of Downtown'],
    },
    preferences: ['Event dates', 'Events near me', 'Ticket availability', 'Schedule changes', 'Weather alerts', 'Add to calendar'],
    location: true,
  },
  {
    id: 'books',
    name: 'Authors / Books',
    eyebrow: 'New releases, appearances, signings, and recommendations',
    description: 'Follow authors and book series for release and event updates.',
    genreLabel: 'Select book interests',
    suggestionLabel: 'Author and book suggestions',
    genres: ['Fantasy', 'Sci-Fi', 'Mystery', 'Thriller', 'History', 'Business', 'Biography', 'Faith'],
    suggestions: {
      Fantasy: ['Brandon Sanderson', 'Sarah J. Maas', 'George R. R. Martin', 'Rebecca Yarros'],
      'Sci-Fi': ['Andy Weir', 'Martha Wells', 'James S. A. Corey', 'Blake Crouch'],
      Mystery: ['Louise Penny', 'Michael Connelly', 'Agatha Christie', 'Tana French'],
      Thriller: ['Jack Carr', 'James Patterson', 'David Baldacci', 'Lee Child'],
      History: ['Erik Larson', 'David McCullough', 'Doris Kearns Goodwin', 'Jon Meacham'],
      Business: ['Morgan Housel', 'Adam Grant', 'Simon Sinek', 'Cal Newport'],
      Biography: ['Walter Isaacson', 'Ron Chernow', 'Michelle Obama', 'David Grann'],
      Faith: ['C. S. Lewis', 'Timothy Keller', 'Max Lucado', 'Lysa TerKeurst'],
    },
    preferences: ['New books', 'Audiobooks', 'Author signings', 'Author signings near me', 'Interviews', 'Series updates', 'Recommendations'],
    location: true,
  },
  {
    id: 'creators',
    name: 'YouTubers / Creators',
    eyebrow: 'Uploads, collaborations, tours, and product drops',
    description: 'Track creators without turning Radar into a social feed.',
    genreLabel: 'Select creator areas',
    suggestionLabel: 'Creator suggestions',
    genres: ['Tech', 'Gaming', 'Comedy', 'DIY', 'Cars', 'Outdoors', 'Food', 'Education'],
    suggestions: {
      Tech: ['MKBHD', 'Linus Tech Tips', 'iJustine', 'Mrwhosetheboss'],
      Gaming: ['Markiplier', 'Jacksepticeye', 'GameSpot', 'Kinda Funny'],
      Comedy: ['Good Mythical Morning', 'Dropout', 'Try Guys', 'Dude Perfect'],
      DIY: ['Adam Savage Tested', 'I Like To Make Stuff', 'April Wilkerson', 'Make Something'],
      Cars: ['Donut Media', 'Doug DeMuro', 'Throttle House', 'Hagerty'],
      Outdoors: ['Outdoor Boys', 'REI', 'MeatEater', 'Adventure Archives'],
      Food: ['Binging with Babish', 'Joshua Weissman', 'Sorted Food', 'Claire Saffitz'],
      Education: ['Veritasium', 'Smarter Every Day', 'Kurzgesagt', 'CrashCourse'],
    },
    preferences: ['New videos', 'Collaborations', 'Live streams', 'Creator events near me', 'Product drops', 'Tours', 'Podcast appearances'],
    location: true,
  },
  {
    id: 'comedians',
    name: 'Comedians',
    eyebrow: 'Tours, specials, podcasts, and TV appearances',
    description: 'Follow comedians across live shows, streaming specials, and podcast appearances.',
    genreLabel: 'Select comedy styles',
    suggestionLabel: 'Comedian suggestions',
    genres: ['Clean Comedy', 'Storytelling', 'Observational', 'Blue Collar', 'Podcast Hosts', 'Late Night', 'Improv'],
    suggestions: {
      'Clean Comedy': ['Nate Bargatze', 'Jim Gaffigan', 'Brian Regan', 'Leanne Morgan'],
      Storytelling: ['Mike Birbiglia', 'Hasan Minhaj', 'John Mulaney', 'Taylor Tomlinson'],
      Observational: ['Jerry Seinfeld', 'Sebastian Maniscalco', 'Tom Papa', 'Gary Gulman'],
      'Blue Collar': ['Jeff Foxworthy', 'Larry the Cable Guy', 'Bill Engvall', 'Ron White'],
      'Podcast Hosts': ['Theo Von', 'Marc Maron', 'Bert Kreischer', 'Tom Segura'],
      'Late Night': ['John Oliver', 'Seth Meyers', 'Stephen Colbert', 'Jimmy Fallon'],
      Improv: ['Whose Line Is It Anyway', 'Second City', 'Upright Citizens Brigade', 'Middleditch and Schwartz'],
    },
    preferences: ['Tour dates', 'Comedy shows near me', 'Specials', 'Podcast appearances', 'TV appearances', 'Ticketmaster links', 'Spotify links', 'YouTube links', 'Apple Podcasts links', 'Netflix links'],
    location: true,
  },
];

const alertGroups = [
  {
    name: 'Music',
    options: ['Concerts', 'Concerts near me', 'Ticket price drops', 'New albums', 'New singles', 'Tour announcements', 'Interviews'],
  },
  {
    name: 'Movies & TV',
    options: ['Trailers', 'Theater release', 'Streaming release', 'Showtimes near me', 'New episodes', 'Renewals', 'Cancellations'],
  },
  {
    name: 'Games',
    options: ['Release dates', 'DLC', 'Updates', 'Patches', 'Betas', 'Server outages'],
  },
  {
    name: 'Podcasts',
    options: ['New episodes', 'Guest appearances', 'Live events', 'Live events near me', 'Spotify links', 'YouTube links', 'Apple Podcasts links'],
  },
  {
    name: 'Products',
    options: ['Price drops', 'Restocks', 'New versions', 'Recalls', 'Availability'],
  },
  {
    name: 'Local Events',
    options: ['Events near me', 'Festivals', 'Air shows', 'Car shows', 'Fairs', 'Add to calendar'],
  },
  {
    name: 'Radar Features',
    options: ['Daily digest', 'High priority alerts', 'Recommendations', 'Near me', 'Comedy shows near me', 'Games near me', 'Events near me', 'Author signings near me', 'Creator events near me', 'Watchlist summaries'],
  },
];

const briefingItems: BriefingItem[] = [
  {
    id: 'metallica-chicago',
    category: 'Music',
    interestName: 'Metallica',
    signalType: 'tour_date',
    title: 'Metallica announced a Chicago show',
    description: 'Presale opens tomorrow at 10:00 AM. Tickets are expected to move quickly.',
    eventDate: new Date().toISOString(),
    location: 'Chicago, IL',
    priority: 'high',
    source: 'Ticketmaster / Bandsintown',
    status: 'new',
    actions: [
      { label: 'Ticketmaster', url: 'https://www.ticketmaster.com/search?q=Metallica%20Chicago', type: 'tickets' },
      buildCalendarAction({
        title: 'Metallica announced a Chicago show',
        description: 'Presale opens tomorrow at 10:00 AM.',
        eventDate: new Date().toISOString(),
        location: 'Chicago, IL',
      }),
    ],
    relatedItems: ['Metallica'],
  },
  {
    id: 'nate-podcast',
    category: 'Comedians',
    interestName: 'Nate Bargatze',
    signalType: 'podcast_appearance',
    title: 'Nate Bargatze appeared on SmartLess',
    description: 'A new interview episode is available on Spotify, YouTube, and Apple Podcasts.',
    eventDate: new Date().toISOString(),
    priority: 'news',
    source: 'Spotify / Apple Podcasts / YouTube',
    status: 'new',
    actions: [
      { label: 'Spotify', url: 'https://open.spotify.com/search/Nate%20Bargatze%20SmartLess', type: 'listen' },
      { label: 'YouTube', url: 'https://www.youtube.com/results?search_query=Nate%20Bargatze%20SmartLess', type: 'watch' },
      { label: 'Apple Podcasts', url: 'https://podcasts.apple.com/search?term=Nate%20Bargatze%20SmartLess', type: 'listen' },
    ],
    relatedItems: ['Nate Bargatze'],
  },
  {
    id: 'fantastic-four',
    category: 'Movies',
    interestName: 'Fantastic Four',
    signalType: 'showtime',
    title: 'Fantastic Four tickets are available',
    description: 'Nearby theaters added evening showtimes for opening weekend.',
    eventDate: new Date().toISOString(),
    location: 'Near your saved location',
    priority: 'upcoming',
    source: 'TMDB / Theater showtimes',
    status: 'new',
    actions: [
      { label: 'Showtimes', url: 'https://www.google.com/search?q=Fantastic%20Four%20showtimes%20near%20me', type: 'details' },
      { label: 'Trailer', url: 'https://www.youtube.com/results?search_query=Fantastic%20Four%20trailer', type: 'trailer' },
      { label: 'Streaming', url: 'https://www.google.com/search?q=Fantastic%20Four%20streaming', type: 'streaming' },
    ],
    relatedItems: ['Fantastic Four'],
  },
  {
    id: 'fortnite-patch',
    category: 'Video Games',
    interestName: 'Fortnite',
    signalType: 'patch_notes',
    title: 'Fortnite patch released',
    description: 'Balance changes, new event quests, and outage notes are live.',
    eventDate: new Date().toISOString(),
    priority: 'news',
    source: 'Epic / Publisher feeds',
    status: 'new',
    actions: [
      { label: 'Patch Notes', url: 'https://www.google.com/search?q=Fortnite%20patch%20notes', type: 'patch-notes' },
      { label: 'Store Page', url: 'https://www.google.com/search?q=Fortnite%20store%20page', type: 'store' },
    ],
    relatedItems: ['Fortnite'],
  },
];

const recommendations = [
  {
    title: 'Gojira',
    detail: 'Radar found a progressive metal overlap with your selected artists.',
    action: 'Add to Radar',
    requiresAny: ['Tool', 'Pantera'],
    reason: 'Fans of Tool and Pantera frequently follow Gojira for progressive and heavy metal overlap.',
  },
  {
    title: 'Mastodon',
    detail: 'Similar heavy riffs, tour activity, and high match with your metal preferences.',
    action: 'Watch Quietly',
    requiresAny: ['Tool', 'Pantera', 'Gojira', 'Lamb of God'],
    reason: 'Mastodon matches your heavy and progressive music cluster and often shares festival/tour audiences.',
  },
  {
    title: 'Lamb of God',
    detail: 'Recommended from your Metallica, Megadeth, and Pantera cluster.',
    action: 'Add to Radar',
    requiresAny: ['Metallica', 'Megadeth', 'Pantera'],
    reason: 'Thrash and groove metal listeners who follow Metallica, Megadeth, or Pantera often track Lamb of God.',
  },
];

const services = ['Spotify', 'Apple Music', 'YouTube', 'Apple Podcasts', 'Netflix', 'Disney+', 'Prime Video', 'Hulu', 'Steam', 'Xbox', 'PlayStation', 'Nintendo'];

const defaultSelection = (): CategorySelection => ({
  genres: [],
  suggestions: [],
  preferences: [],
  platforms: [],
  radius: '50',
});

const unique = (items: string[]) => Array.from(new Set(items));

function readStoredRadarProfile(): PersistedRadarProfile {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const storedProfile = window.localStorage.getItem(STORAGE_KEY);
    return storedProfile ? JSON.parse(storedProfile) as PersistedRadarProfile : {};
  } catch {
    return {};
  }
}

function writeStoredRadarProfile(profile: PersistedRadarProfile) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...profile,
        savedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Local mode remains usable even when browser storage is unavailable.
  }
}

function App() {
  const storedProfile = useMemo(() => readStoredRadarProfile(), []);
  const [screen, setScreen] = useState<AppScreen>(storedProfile.hasOpenedDashboard ? 'dashboard' : 'splash');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('home');
  const [accountMode, setAccountMode] = useState<AccountMode>(storedProfile.accountMode ?? 'local');
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('category');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(storedProfile.selectedCategoryIds ?? []);
  const [completedCategoryIds, setCompletedCategoryIds] = useState<string[]>(storedProfile.completedCategoryIds ?? []);
  const [hasOpenedDashboard, setHasOpenedDashboard] = useState(Boolean(storedProfile.hasOpenedDashboard));
  const [selections, setSelections] = useState<Record<string, CategorySelection>>(storedProfile.selections ?? {});
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>(storedProfile.selectedAlerts ?? ['Concerts', 'New albums', 'Trailers', 'Updates', 'Daily digest']);
  const [settings, setSettings] = useState<RadarSettings>(storedProfile.settings ?? defaultSettings);
  const [subscriptionTier] = useState<SubscriptionTier>(storedProfile.subscriptionTier ?? DEFAULT_SUBSCRIPTION_TIER);
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>(storedProfile.trackedItems ?? []);
  const [authMessage, setAuthMessage] = useState('');
  const features = useMemo(
    () => ({
      pro: hasPro(subscriptionTier),
      premium: hasPremium(subscriptionTier),
    }),
    [subscriptionTier],
  );

  const activeCategory = activeCategoryIndex === null ? null : categories[activeCategoryIndex];
  const activeSelection = activeCategory ? selections[activeCategory.id] ?? defaultSelection() : defaultSelection();
  const selectedCategoryNames = useMemo(
    () =>
      selectedCategoryIds
        .map((categoryId) => categories.find((category) => category.id === categoryId)?.name)
        .filter((name): name is string => Boolean(name)),
    [selectedCategoryIds],
  );
  const activeSteps = useMemo<OnboardingStep[]>(() => {
    if (!activeCategory) {
      return ['category'];
    }

    const steps: OnboardingStep[] = [];
    if (activeCategory.platforms?.length) {
      steps.push('platforms');
    }

    steps.push('genres', 'suggestions', 'preferences');

    if (activeCategory.location) {
      steps.push('location');
    }

    steps.push('summary');
    return steps;
  }, [activeCategory]);

  const generatedSuggestions = useMemo(() => {
    if (!activeCategory || activeSelection.genres.length === 0) {
      return [];
    }

    return unique(activeSelection.genres.flatMap((genre) => activeCategory.suggestions[genre] ?? []));
  }, [activeCategory, activeSelection.genres]);

  const onboardingProgress = useMemo(() => {
    const selectedCount = selectedCategoryIds.length;
    const completed = selectedCategoryIds.filter((categoryId) => completedCategoryIds.includes(categoryId)).length;

    if (!activeCategory) {
      return selectedCount ? Math.round((completed / selectedCount) * 100) : 0;
    }

    const stepIndex = Math.max(activeSteps.indexOf(onboardingStep), 0);
    return Math.round(((completed + (stepIndex + 1) / activeSteps.length) / Math.max(selectedCount, 1)) * 100);
  }, [activeCategory, activeSteps, completedCategoryIds, onboardingStep, selectedCategoryIds]);

  const visibleTrackedItems = useMemo(() => {
    if (selectedCategoryNames.length === 0) {
      return trackedItems;
    }

    return trackedItems.filter((item) => selectedCategoryNames.includes(item.category));
  }, [selectedCategoryNames, trackedItems]);

  const groupedTrackedItems = useMemo(() => {
    return visibleTrackedItems.reduce<Record<string, TrackedItem[]>>((groups, item) => {
      groups[item.category] = groups[item.category] ?? [];
      groups[item.category].push(item);
      return groups;
    }, {});
  }, [visibleTrackedItems]);

  useEffect(() => {
    writeStoredRadarProfile({
      accountMode,
      completedCategoryIds,
      hasOpenedDashboard,
      settings,
      selectedAlerts,
      selectedCategoryIds,
      selections,
      subscriptionTier,
      trackedItems,
    });
  }, [accountMode, completedCategoryIds, hasOpenedDashboard, settings, selectedAlerts, selectedCategoryIds, selections, subscriptionTier, trackedItems]);

  const updateSelection = (categoryId: string, updater: (current: CategorySelection) => CategorySelection) => {
    setSelections((current) => ({
      ...current,
      [categoryId]: updater(current[categoryId] ?? defaultSelection()),
    }));
  };

  const toggleSelection = (categoryId: string, key: keyof Pick<CategorySelection, 'genres' | 'suggestions' | 'preferences' | 'platforms'>, value: string) => {
    updateSelection(categoryId, (current) => {
      const currentValues = current[key];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [...currentValues, value];

      if (key === 'genres') {
        const nextSuggestions = unique(nextValues.flatMap((genre) => activeCategory?.suggestions[genre] ?? []));
        return {
          ...current,
          genres: nextValues,
          suggestions: current.suggestions.filter((suggestion) => nextSuggestions.includes(suggestion)),
        };
      }

      return {
        ...current,
        [key]: nextValues,
      };
    });
  };

  const addCustomSuggestion = (categoryId: string, value: string) => {
    const suggestion = value.trim();
    if (!suggestion) {
      return;
    }

    updateSelection(categoryId, (current) => ({
      ...current,
      suggestions: current.suggestions.some((item) => item.toLowerCase() === suggestion.toLowerCase())
        ? current.suggestions
        : [...current.suggestions, suggestion],
    }));
  };

  const goToAccountChoice = () => setScreen('accountChoice');

  const startLocalMode = () => {
    setAccountMode('local');
    setScreen('onboarding');
    setSelectedCategoryIds([]);
    setCompletedCategoryIds([]);
    setHasOpenedDashboard(false);
    resetOnboardingScreen();
  };

  const resetOnboardingScreen = () => {
    setActiveCategoryIndex(null);
    setOnboardingStep('category');
  };

  const handleAuthSubmit = (event: FormEvent<HTMLFormElement>, mode: AccountMode = 'account') => {
    event.preventDefault();
    setAccountMode(mode);
    setAuthMessage('');
    setScreen('onboarding');
    setSelectedCategoryIds([]);
    setCompletedCategoryIds([]);
    setHasOpenedDashboard(false);
    resetOnboardingScreen();
  };

  const manageRadars = () => {
    setScreen('onboarding');
    resetOnboardingScreen();
  };

  const toggleCategoryForOnboarding = (index: number) => {
    const category = categories[index];

    if (selectedCategoryIds.includes(category.id)) {
      setSelectedCategoryIds((current) => current.filter((categoryId) => categoryId !== category.id));
      setCompletedCategoryIds((current) => current.filter((categoryId) => categoryId !== category.id));
      setSelections((current) => {
        const nextSelections = { ...current };
        delete nextSelections[category.id];
        return nextSelections;
      });
      setTrackedItems((current) => current.filter((item) => item.category !== category.name));
      return;
    }

    setSelectedCategoryIds((current) => [...current, category.id]);
  };

  const startSelectedCategories = () => {
    const nextCategoryId = selectedCategoryIds.find((categoryId) => !completedCategoryIds.includes(categoryId));
    const nextCategoryIndex = categories.findIndex((category) => category.id === nextCategoryId);

    if (nextCategoryIndex < 0) {
      return;
    }

    const nextCategory = categories[nextCategoryIndex];
    setActiveCategoryIndex(nextCategoryIndex);
    setOnboardingStep(nextCategory.platforms?.length ? 'platforms' : 'genres');
  };

  const goBackStep = () => {
    if (!activeCategory) {
      return;
    }

    const currentIndex = activeSteps.indexOf(onboardingStep);
    if (currentIndex <= 0) {
      resetOnboardingScreen();
      return;
    }

    setOnboardingStep(activeSteps[currentIndex - 1]);
  };

  const goNextStep = () => {
    if (!activeCategory) {
      return;
    }

    const currentIndex = activeSteps.indexOf(onboardingStep);
    const nextStep = activeSteps[currentIndex + 1];

    if (nextStep) {
      setOnboardingStep(nextStep);
    }
  };

  const completeCategory = () => {
    if (!activeCategory) {
      return;
    }

    const nextCompletedCategoryIds = completedCategoryIds.includes(activeCategory.id)
      ? completedCategoryIds
      : [...completedCategoryIds, activeCategory.id];
    const nextCategoryId = selectedCategoryIds.find((categoryId) => !nextCompletedCategoryIds.includes(categoryId));
    const nextCategoryIndex = categories.findIndex((category) => category.id === nextCategoryId);

    setCompletedCategoryIds(nextCompletedCategoryIds);

    if (nextCategoryIndex >= 0) {
      const nextCategory = categories[nextCategoryIndex];
      setActiveCategoryIndex(nextCategoryIndex);
      setOnboardingStep(nextCategory.platforms?.length ? 'platforms' : 'genres');
      return;
    }

    openDashboard(nextCompletedCategoryIds);
  };

  const openDashboard = (completedIds = completedCategoryIds) => {
    const categoriesToUse = selectedCategoryIds.length
      ? categories.filter((category) => selectedCategoryIds.includes(category.id))
      : [];
    const selectedItems = categoriesToUse.flatMap((category) => {
      const selection = selections[category.id];
      if (!selection) {
        return [];
      }

      return [...selection.suggestions, ...selection.genres.slice(0, 2)].slice(0, 5).map((name) => ({
        id: `${category.id}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        category: category.name,
        name,
        preferences: selection.preferences,
        radius: category.location ? selection.radius : undefined,
        sourceIds: buildMockSourceIds(category.name, name),
        status: 'following' as TrackStatus,
      }));
    });

    if (selectedItems.length) {
      setTrackedItems((current) => uniqueTrackedItems([...selectedItems, ...current]));
    }

    setCompletedCategoryIds(completedIds);
    setScreen('dashboard');
    setDashboardTab('home');
    setHasOpenedDashboard(true);
  };

  const toggleAlert = (option: string) => {
    setSelectedAlerts((current) => (current.includes(option) ? current.filter((item) => item !== option) : [...current, option]));
  };

  const updateTrackedItem = (itemId: string, status: TrackStatus) => {
    setTrackedItems((current) => current.map((item) => (item.id === itemId ? { ...item, status } : item)));
  };

  const removeTrackedItem = (itemId: string) => {
    setTrackedItems((current) => current.filter((item) => item.id !== itemId));
  };

  const updateSettings = (updater: (current: RadarSettings) => RadarSettings) => {
    setSettings((current) => updater(current));
  };

  const resetRadar = () => {
    setSelectedCategoryIds([]);
    setCompletedCategoryIds([]);
    setSelections({});
    setTrackedItems([]);
    setSelectedAlerts([]);
    setHasOpenedDashboard(true);
    setDashboardTab('home');
  };

  const addRecommendation = (title: string, status: TrackStatus) => {
    const item: TrackedItem = {
      id: `recommendation-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      category: 'Music',
      name: title,
      status,
      rationale: 'Added from Discover recommendations.',
    };

    setTrackedItems((current) => uniqueTrackedItems([item, ...current]));
    setDashboardTab('radar');
  };

  return (
    <main className="app-shell">
      {screen === 'splash' && <SplashScreen onGetStarted={goToAccountChoice} />}
      {screen === 'accountChoice' && (
        <AccountChoiceScreen
          onSignIn={() => setScreen('signIn')}
          onContinueLocal={startLocalMode}
        />
      )}
      {screen === 'signIn' && (
        <SignInScreen
          authMessage={authMessage}
          onBack={() => setScreen('accountChoice')}
          onSubmit={handleAuthSubmit}
          onForgot={() => setAuthMessage('Password reset will be available when account sync is connected.')}
        />
      )}
      {screen === 'onboarding' && (
        <OnboardingScreen
          accountMode={accountMode}
          activeCategory={activeCategory}
          activeSelection={activeSelection}
          activeStep={onboardingStep}
          categories={categories}
          completedCategoryIds={completedCategoryIds}
          generatedSuggestions={generatedSuggestions}
          progress={onboardingProgress}
          hasOpenedDashboard={hasOpenedDashboard}
          selectedCategoryIds={selectedCategoryIds}
          onBackStep={goBackStep}
          onCategoryStart={startSelectedCategories}
          onCategoryToggle={toggleCategoryForOnboarding}
          onCompleteCategory={completeCategory}
          onCustomSuggestion={addCustomSuggestion}
          onSaveChanges={() => openDashboard()}
          onNextStep={goNextStep}
          onRadiusChange={(radius) => activeCategory && updateSelection(activeCategory.id, (current) => ({ ...current, radius }))}
          onToggle={(key, value) => activeCategory && toggleSelection(activeCategory.id, key, value)}
        />
      )}
      {screen === 'dashboard' && (
        <DashboardScreen
          activeTab={dashboardTab}
          groupedTrackedItems={groupedTrackedItems}
          selectedAlerts={selectedAlerts}
          selectedCategoryNames={selectedCategoryNames}
          settings={settings}
          trackedItems={visibleTrackedItems}
          onAddRecommendation={addRecommendation}
          onAlertToggle={toggleAlert}
          onManageRadars={manageRadars}
          onRemoveTrackedItem={removeTrackedItem}
          onResetRadar={resetRadar}
          onSettingsChange={updateSettings}
          onTabChange={setDashboardTab}
          onTrackedStatusChange={updateTrackedItem}
        />
      )}
    </main>
  );
}

function uniqueTrackedItems(items: TrackedItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.category}-${item.name}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function SplashScreen({ onGetStarted }: { onGetStarted: () => void }) {
  const audioContextRef = useRef<AudioContext | null>(null);

  const enableSonarAudio = () => {
    if (audioContextRef.current) {
      return;
    }

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) {
      return;
    }

    audioContextRef.current = new AudioContextClass();
  };

  const playSonarPing = () => {
    const audioContext = audioContextRef.current;
    if (!audioContext) {
      return;
    }

    if (audioContext.state === 'suspended') {
      void audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = audioContext.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(720, start);
    oscillator.frequency.exponentialRampToValueAtTime(140, start + 0.42);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.42);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.44);
  };

  return (
    <section className="screen splash-screen no-scroll-screen" aria-labelledby="splash-title" onPointerDown={enableSonarAudio}>
      <div className="radar-orbit" aria-hidden="true">
        <div className="radar-sweep" onAnimationIteration={playSonarPing} />
        <div className="radar-dot dot-one" />
        <div className="radar-dot dot-two" />
        <div className="radar-dot dot-three" />
      </div>

      <div className="brand-lockup">
        <p className="eyebrow">Personal intelligence dashboard</p>
        <h1 id="splash-title">Radar</h1>
        <p className="tagline">Never Miss What Matters.</p>
      </div>

      <button className="primary-button full-width" type="button" onClick={onGetStarted}>
        Get Started
      </button>
    </section>
  );
}

function AccountChoiceScreen({
  onSignIn,
  onContinueLocal,
}: {
  onSignIn: () => void;
  onContinueLocal: () => void;
}) {
  return (
    <section className="screen stacked-screen" aria-labelledby="account-title">
      <ScreenHeader
        kicker="Choose how Radar works for you"
        title="Set up your Radar"
        description="Use Radar locally on this device or create an account when you want syncing, cloud backup, family profiles, and shared interests."
      />

      <div className="choice-grid">
        <button className="choice-card" type="button" onClick={onSignIn}>
          <UserRound aria-hidden="true" />
          <span>Sign In / Create Account</span>
          <small>Sync across devices, keep cloud backups, and prepare for shared profiles.</small>
        </button>

        <button className="choice-card" type="button" onClick={onContinueLocal}>
          <RadarIcon aria-hidden="true" />
          <span>Continue Without Account</span>
          <small>Store data on this device, work offline, and set up your interests now.</small>
        </button>
      </div>
    </section>
  );
}

function SignInScreen({
  authMessage,
  onBack,
  onForgot,
  onSubmit,
}: {
  authMessage: string;
  onBack: () => void;
  onForgot: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, mode?: AccountMode) => void;
}) {
  return (
    <section className="screen stacked-screen" aria-labelledby="signin-title">
      <button className="ghost-button back-button" type="button" onClick={onBack}>
        <ChevronLeft size={18} aria-hidden="true" />
        Back
      </button>

      <ScreenHeader
        kicker="Account mode"
        title="Sign in or create your Radar account"
        description="Account sync will connect profiles, cloud backup, and shared interests as backend services come online."
      />

      <form className="auth-card" onSubmit={(event) => onSubmit(event, 'account')}>
        <label>
          Email
          <input type="email" name="email" placeholder="you@example.com" autoComplete="email" required />
        </label>
        <label>
          Password
          <input type="password" name="password" placeholder="Enter your password" autoComplete="current-password" required />
        </label>
        <button className="primary-button full-width" type="submit">
          Sign In
        </button>
        <button className="secondary-button full-width" type="submit">
          Create Account
        </button>
        <button className="text-button" type="button" onClick={onForgot}>
          Forgot Password
        </button>
        {authMessage && <p className="inline-note">{authMessage}</p>}
      </form>
    </section>
  );
}

function ScreenHeader({
  kicker,
  title,
  description,
}: {
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <header className="screen-header">
      <p className="eyebrow">{kicker}</p>
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}

function OnboardingScreen({
  accountMode,
  activeCategory,
  activeSelection,
  activeStep,
  categories: allCategories,
  completedCategoryIds,
  generatedSuggestions,
  progress,
  hasOpenedDashboard,
  selectedCategoryIds,
  onBackStep,
  onCategoryStart,
  onCategoryToggle,
  onCompleteCategory,
  onCustomSuggestion,
  onSaveChanges,
  onNextStep,
  onRadiusChange,
  onToggle,
}: {
  accountMode: AccountMode;
  activeCategory: CategoryConfig | null;
  activeSelection: CategorySelection;
  activeStep: OnboardingStep;
  categories: CategoryConfig[];
  completedCategoryIds: string[];
  generatedSuggestions: string[];
  progress: number;
  hasOpenedDashboard: boolean;
  selectedCategoryIds: string[];
  onBackStep: () => void;
  onCategoryStart: () => void;
  onCategoryToggle: (index: number) => void;
  onCompleteCategory: () => void;
  onCustomSuggestion: (categoryId: string, value: string) => void;
  onSaveChanges: () => void;
  onNextStep: () => void;
  onRadiusChange: (radius: string) => void;
  onToggle: (key: keyof Pick<CategorySelection, 'genres' | 'suggestions' | 'preferences' | 'platforms'>, value: string) => void;
}) {
  const completedCount = completedCategoryIds.length;
  const remainingSelectedCount = activeCategory
    ? selectedCategoryIds.filter((categoryId) => categoryId !== activeCategory.id && !completedCategoryIds.includes(categoryId)).length
    : selectedCategoryIds.filter((categoryId) => !completedCategoryIds.includes(categoryId)).length;

  return (
    <section className="screen stacked-screen onboarding-screen" aria-labelledby="onboarding-title">
      <div className="progress-shell" aria-label={`Onboarding progress ${progress}%`}>
        <span>{progress}%</span>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {!activeCategory && (
        <>
          <ScreenHeader
            kicker={accountMode === 'local' ? 'Local mode active' : 'Account setup'}
            title="Choose what is on your Radar"
            description="Select multiple categories first. Radar will then walk you through each selected category one at a time."
          />

          <div className="category-status">
            <span>{selectedCategoryIds.length} selected • {completedCount} complete</span>
            <div className="category-actions">
              <button className="secondary-button compact" disabled={remainingSelectedCount === 0} type="button" onClick={onCategoryStart}>
                Start selected setup
              </button>
              <button
                className="ghost-button compact"
                disabled={selectedCategoryIds.length === 0 && !hasOpenedDashboard}
                type="button"
                onClick={onSaveChanges}
              >
                Save changes
              </button>
            </div>
          </div>

          <div className="category-list" aria-label="Radar categories">
            {allCategories.map((category, index) => {
              const isCompleted = completedCategoryIds.includes(category.id);
              const isSelected = selectedCategoryIds.includes(category.id);
              return (
                <button
                  className={`category-card ${isSelected ? 'is-selected' : ''} ${isCompleted ? 'is-complete' : ''}`}
                  key={category.id}
                  type="button"
                  onClick={() => onCategoryToggle(index)}
                >
                  <span>
                    {(isSelected || isCompleted) && <Check size={16} aria-hidden="true" />}
                    {category.name}
                  </span>
                  <small>{category.eyebrow}</small>
                </button>
              );
            })}
          </div>
        </>
      )}

      {activeCategory && (
        <div className="step-card">
          <button className="ghost-button back-button" type="button" onClick={onBackStep}>
            <ChevronLeft size={18} aria-hidden="true" />
            Back
          </button>

          <p className="eyebrow">{activeCategory.name}</p>
          {activeStep === 'platforms' && (
            <ChoiceStep
              title="Which platforms should Radar monitor?"
              description="Video games skip location and start with platforms so updates match what you can play."
              options={activeCategory.platforms ?? []}
              selected={activeSelection.platforms}
              onToggle={(value) => onToggle('platforms', value)}
              actionLabel="Continue to genres"
              actionDisabled={activeSelection.platforms.length === 0}
              onNext={onNextStep}
            />
          )}

          {activeStep === 'genres' && (
            <ChoiceStep
              title={activeCategory.genreLabel}
              description={activeCategory.description}
              options={activeCategory.genres}
              selected={activeSelection.genres}
              onToggle={(value) => onToggle('genres', value)}
              actionLabel="Generate suggestions"
              actionDisabled={activeSelection.genres.length === 0}
              onNext={onNextStep}
            />
          )}

          {activeStep === 'suggestions' && (
            <ChoiceStep
              title={activeCategory.suggestionLabel}
              description={
                activeSelection.genres.length
                  ? 'These suggestions are generated only from the choices you made in the previous step.'
                  : 'Select at least one genre before Radar shows suggestions.'
              }
              options={unique([...generatedSuggestions, ...activeSelection.suggestions])}
              selected={activeSelection.suggestions}
              customEntryLabel={`Add a missing ${activeCategory.name.toLowerCase()} favorite`}
              customEntryPlaceholder="Type a name, title, team, brand, or event"
              onCustomAdd={(value) => activeCategory && onCustomSuggestion(activeCategory.id, value)}
              onToggle={(value) => onToggle('suggestions', value)}
              actionLabel="Continue to alert preferences"
              actionDisabled={activeSelection.suggestions.length === 0}
              emptyMessage="No suggestions are shown until a genre is selected."
              onNext={onNextStep}
            />
          )}

          {activeStep === 'preferences' && (
            <ChoiceStep
              title="What should Radar track?"
              description="Choose the update types you want surfaced as alerts, daily briefing items, or quiet watchlist signals."
              options={activeCategory.preferences}
              selected={activeSelection.preferences}
              onToggle={(value) => onToggle('preferences', value)}
              actionLabel={activeCategory.location ? 'Set location radius' : 'Review summary'}
              actionDisabled={activeSelection.preferences.length === 0}
              onNext={onNextStep}
            />
          )}

          {activeStep === 'location' && (
            <div>
              <h2>Location radius</h2>
              <p className="step-description">
                Radar uses this radius for nearby alerts, including concerts, comedy shows, showtimes, sports, signings, creator events, and local events.
              </p>
              <div className="pill-grid">
                {radii.map((radius) => (
                  <button
                    className={`pill-button ${activeSelection.radius === radius ? 'selected' : ''}`}
                    key={radius}
                    type="button"
                    onClick={() => onRadiusChange(radius)}
                  >
                    {radius} miles
                  </button>
                ))}
              </div>
              <button className="primary-button full-width" type="button" onClick={onNextStep}>
                Review summary
              </button>
            </div>
          )}

          {activeStep === 'summary' && (
            <SummaryStep
              category={activeCategory}
              remainingSelectedCount={remainingSelectedCount}
              selection={activeSelection}
              onComplete={onCompleteCategory}
            />
          )}
        </div>
      )}
    </section>
  );
}

function ChoiceStep({
  actionDisabled,
  actionLabel,
  customEntryLabel,
  customEntryPlaceholder,
  description,
  emptyMessage,
  onCustomAdd,
  onNext,
  onToggle,
  options,
  selected,
  title,
}: {
  actionDisabled: boolean;
  actionLabel: string;
  customEntryLabel?: string;
  customEntryPlaceholder?: string;
  description: string;
  emptyMessage?: string;
  onCustomAdd?: (value: string) => void;
  onNext: () => void;
  onToggle: (value: string) => void;
  options: string[];
  selected: string[];
  title: string;
}) {
  const [customValue, setCustomValue] = useState('');
  const handleCustomSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onCustomAdd?.(customValue);
    setCustomValue('');
  };

  return (
    <div>
      <h2>{title}</h2>
      <p className="step-description">{description}</p>
      {options.length === 0 && <p className="empty-message">{emptyMessage}</p>}
      <div className="pill-grid">
        {options.map((option) => (
          <button
            className={`pill-button ${selected.includes(option) ? 'selected' : ''}`}
            key={option}
            type="button"
            onClick={() => onToggle(option)}
          >
            {option}
          </button>
        ))}
      </div>
      {onCustomAdd && (
        <form className="custom-entry-card" onSubmit={handleCustomSubmit}>
          <label>
            {customEntryLabel ?? 'Add something Radar did not suggest'}
            <span>Enter an option if it is missing from the generated list.</span>
          </label>
          <div className="custom-entry-row">
            <input
              type="text"
              value={customValue}
              placeholder={customEntryPlaceholder ?? 'Type an option'}
              onChange={(event) => setCustomValue(event.target.value)}
            />
            <button className="secondary-button compact" type="submit" disabled={customValue.trim().length === 0}>
              Add
            </button>
          </div>
        </form>
      )}
      <button className="primary-button full-width" disabled={actionDisabled} type="button" onClick={onNext}>
        {actionLabel}
      </button>
    </div>
  );
}

function SummaryStep({
  category,
  remainingSelectedCount,
  selection,
  onComplete,
}: {
  category: CategoryConfig;
  remainingSelectedCount: number;
  selection: CategorySelection;
  onComplete: () => void;
}) {
  return (
    <div>
      <h2>{category.name} summary</h2>
      <p className="step-description">
        {remainingSelectedCount > 0
          ? `This category is ready. Save it and Radar will continue with ${remainingSelectedCount} more selected ${remainingSelectedCount === 1 ? 'category' : 'categories'}.`
          : 'This is the last selected category. Saving it will open your filtered home dashboard.'}
      </p>
      <div className="summary-grid">
        <SummaryRow label={category.platforms?.length ? 'Platforms' : 'Category'} values={category.platforms?.length ? selection.platforms : [category.name]} />
        <SummaryRow label="Genres / interests" values={selection.genres} />
        <SummaryRow label="Following" values={selection.suggestions.length ? selection.suggestions : ['No specific items selected yet']} />
        <SummaryRow label="Alerts" values={selection.preferences} />
        {category.location && <SummaryRow label="Radius" values={[`${selection.radius} miles`]} />}
      </div>
      <div className="button-stack">
        <button className="primary-button full-width" type="button" onClick={onComplete}>
          {remainingSelectedCount > 0 ? 'Save and continue' : 'Save and open filtered Radar'}
        </button>
      </div>
    </div>
  );
}

function SummaryRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <p>{values.join(', ')}</p>
    </div>
  );
}

function DashboardScreen({
  activeTab,
  groupedTrackedItems,
  selectedAlerts,
  selectedCategoryNames,
  settings,
  trackedItems,
  onAddRecommendation,
  onAlertToggle,
  onManageRadars,
  onRemoveTrackedItem,
  onResetRadar,
  onSettingsChange,
  onTabChange,
  onTrackedStatusChange,
}: {
  activeTab: DashboardTab;
  groupedTrackedItems: Record<string, TrackedItem[]>;
  selectedAlerts: string[];
  selectedCategoryNames: string[];
  settings: RadarSettings;
  trackedItems: TrackedItem[];
  onAddRecommendation: (title: string, status: TrackStatus) => void;
  onAlertToggle: (option: string) => void;
  onManageRadars: () => void;
  onRemoveTrackedItem: (itemId: string) => void;
  onResetRadar: () => void;
  onSettingsChange: (updater: (current: RadarSettings) => RadarSettings) => void;
  onTabChange: (tab: DashboardTab) => void;
  onTrackedStatusChange: (itemId: string, status: TrackStatus) => void;
}) {
  return (
    <section className="dashboard-shell" aria-label="Radar dashboard">
      <div className="dashboard-content">
        {activeTab === 'home' && (
          <HomeTab
            selectedCategoryNames={selectedCategoryNames}
            trackedItems={trackedItems}
          />
        )}
        {activeTab === 'radar' && (
          <RadarTab
            groupedTrackedItems={groupedTrackedItems}
            onManageRadars={onManageRadars}
            onRemove={onRemoveTrackedItem}
            onStatusChange={onTrackedStatusChange}
          />
        )}
        {activeTab === 'discover' && (
          <DiscoverTab
            trackedItems={trackedItems}
            onAddRecommendation={onAddRecommendation}
          />
        )}
        {activeTab === 'nearMe' && <NearMeTab trackedItems={trackedItems} />}
        {activeTab === 'alerts' && (
          <AlertsTab
            selectedAlerts={selectedAlerts}
            trackedItems={trackedItems}
            onAlertToggle={onAlertToggle}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsTab
            settings={settings}
            onResetRadar={onResetRadar}
            onSettingsChange={onSettingsChange}
          />
        )}
      </div>
      <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
    </section>
  );
}

function HomeTab({
  selectedCategoryNames,
  trackedItems,
}: {
  selectedCategoryNames: string[];
  trackedItems: TrackedItem[];
}) {
  const selectedNames = new Set(trackedItems.map((item) => item.name.toLowerCase()));
  const selectedBriefingItems = briefingItems.filter((item) =>
    item.relatedItems?.some((relatedItem) => selectedNames.has(relatedItem.toLowerCase())),
  );
  const integrationItems = buildIntegrationUpdates(trackedItems);
  const personalizedItems = uniqueBriefingItems([...selectedBriefingItems, ...integrationItems]);
  const highPriority = personalizedItems.filter((item) => item.priority === 'high');
  const upcoming = personalizedItems.filter((item) => item.priority === 'upcoming');
  const newReleases = personalizedItems.filter((item) =>
    ['new_episode', 'patch_or_release', 'product_availability', 'showtime'].includes(item.signalType),
  );
  const nearMeItems = mockNearMeSignalsForInterests(trackedItems);
  const visibleRecommendations = recommendations.filter((item) =>
    item.requiresAny.some((requiredItem) => selectedNames.has(requiredItem.toLowerCase())),
  );
  const recommendationSignals: RadarSignal[] = visibleRecommendations.map((item) => createSignal({
    id: `recommendation-${item.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    category: 'Recommendations',
    interestName: item.title,
    signalType: 'recommendation',
    title: item.title,
    description: item.detail,
    eventDate: new Date().toISOString(),
    priority: 'recommendation',
    source: 'Radar recommendation engine',
    actions: [
      { label: item.action, url: `https://www.google.com/search?q=${encodeURIComponent(item.title)}`, type: 'details' },
    ],
  }));

  return (
    <div className="tab-panel">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Since yesterday</p>
          <h1>Radar Briefing</h1>
        </div>
        <div className="pulse-badge">
          <Zap size={16} aria-hidden="true" />
          {personalizedItems.length} updates
        </div>
      </header>

      <section className="briefing-card">
        <h2>Daily Briefing</h2>
        <p>
          {selectedCategoryNames.length > 0
            ? `Filtered for ${selectedCategoryNames.join(', ')}.`
            : 'Your most important actionable updates in one place.'}
        </p>
        <div className="briefing-list">
          {personalizedItems.length === 0 && (
            <div className="recommendation-card">
              <strong>No updates yet</strong>
              <p>Radar will only show briefing items tied to the interests you selected during onboarding.</p>
            </div>
          )}
          {personalizedItems.map((item) => (
            <NotificationCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      <DashboardSection title="High Priority" icon={<AlertTriangle size={18} />}>
        {highPriority.map((item) => (
          <NotificationCard compact item={item} key={item.id} />
        ))}
      </DashboardSection>

      <DashboardSection title="Upcoming" icon={<CalendarDays size={18} />}>
        {upcoming.map((item) => (
          <NotificationCard compact item={item} key={item.id} />
        ))}
      </DashboardSection>

      <DashboardSection title="New Releases" icon={<Bell size={18} />}>
        {newReleases.map((item) => (
          <NotificationCard compact item={item} key={item.id} />
        ))}
      </DashboardSection>

      <DashboardSection title="Near Me" icon={<MapPin size={18} />}>
        {nearMeItems.length === 0 && (
          <div className="recommendation-card">
            <strong>No nearby discoveries yet</strong>
            <p>Radar will surface nearby concerts, showtimes, festivals, signings, sports, and creator events related to your interests.</p>
          </div>
        )}
        {nearMeItems.map((item) => (
          <NotificationCard compact item={item} key={item.id} />
        ))}
      </DashboardSection>

      <DashboardSection title="Recommendations" icon={<Sparkles size={18} />}>
        {visibleRecommendations.length === 0 && (
          <div className="recommendation-card">
            <strong>Recommendations are filtered</strong>
            <p>Radar will generate recommendations from the categories and interests you selected.</p>
          </div>
        )}
        {recommendationSignals.map((item) => (
          <NotificationCard compact item={item} key={item.id} />
        ))}
      </DashboardSection>
    </div>
  );
}

function detailForTrackedItem(item: TrackedItem) {
  const preferences = item.preferences ?? [];
  const nearMeEnabled = preferences.some((preference) => preference.toLowerCase().includes('near me'));

  if (nearMeEnabled && item.radius) {
    return `${item.status === 'watchlist' ? 'Tracking quietly' : 'Notifications enabled'} for nearby in-person updates within ${item.radius} miles.`;
  }

  return `${item.status === 'watchlist' ? 'Tracking quietly' : 'Notifications enabled'} for the update types you selected during onboarding.`;
}

function buildIntegrationUpdates(trackedItems: TrackedItem[]): BriefingItem[] {
  return mockSignalsForInterests(trackedItems);
}

function integrationTitleForItem(item: TrackedItem) {
  if (item.category === 'Podcasts') {
    return `${item.name}: latest episode monitoring`;
  }

  if (item.category === 'Music') {
    return `${item.name}: tour date monitoring`;
  }

  if (item.category === 'Comedians') {
    return `${item.name}: show date monitoring`;
  }

  if (item.category === 'Movies') {
    return `${item.name}: showtime and release monitoring`;
  }

  if (item.category === 'Video Games') {
    return `${item.name}: release and update monitoring`;
  }

  return `${item.name}: live data monitoring`;
}

function integrationDetailForItem(item: TrackedItem) {
  if (item.category === 'Podcasts') {
    return 'Radar will pull new episode drops, guest names, release timing, and links from podcast and video providers when connected.';
  }

  if (item.category === 'Music') {
    return `Radar will check tour dates and ticket sources${item.radius ? ` within ${item.radius} miles` : ''} for this selected artist.`;
  }

  if (item.category === 'Comedians') {
    return `Radar will check comedy show dates and ticket sources${item.radius ? ` within ${item.radius} miles` : ''} for this selected comedian.`;
  }

  if (item.category === 'Movies') {
    return `Radar will check showtimes, ticket links, trailers, and streaming windows${item.radius ? ` near you within ${item.radius} miles` : ''}.`;
  }

  if (item.category === 'Sports') {
    return `Radar will check game schedules, ticket availability, and nearby events${item.radius ? ` within ${item.radius} miles` : ''}.`;
  }

  if (item.category === 'Local Events') {
    return `Radar will check event calendars and ticket links${item.radius ? ` within ${item.radius} miles` : ''}.`;
  }

  if (item.category === 'Authors / Books') {
    return `Radar will check releases, interviews, and signing events${item.radius ? ` within ${item.radius} miles` : ''}.`;
  }

  if (item.category === 'YouTubers / Creators') {
    return `Radar will check uploads, live streams, product drops, and in-person creator events${item.radius ? ` within ${item.radius} miles` : ''}.`;
  }

  if (item.category === 'Products & Brands') {
    return 'Radar will check product availability, price drops, restocks, recalls, and new versions from commerce providers.';
  }

  if (item.category === 'Video Games') {
    return 'Radar will check release dates, DLC, patch notes, server outages, betas, and developer announcements.';
  }

  return 'Radar will check connected services for fresh updates tied to this selected interest.';
}

function providerSourceForCategory(category: string) {
  if (category === 'Podcasts') {
    return 'Spotify / Apple Podcasts / YouTube';
  }

  if (category === 'Music') {
    return 'Bandsintown / Ticketmaster';
  }

  if (category === 'Comedians' || category === 'Sports' || category === 'Local Events') {
    return 'Ticketmaster / Event providers';
  }

  if (category === 'Movies') {
    return 'TMDB / Theater showtimes';
  }

  if (category === 'Video Games') {
    return 'Steam / IGDB / Publisher feeds';
  }

  if (category === 'Products & Brands') {
    return 'Retail and recall feeds';
  }

  if (category === 'Authors / Books') {
    return 'Book release and event feeds';
  }

  if (category === 'YouTubers / Creators') {
    return 'YouTube / Creator feeds';
  }

  return 'Connected services';
}

function providerLinkForItem(item: TrackedItem) {
  const query = encodeURIComponent(item.name);

  if (item.category === 'Podcasts') {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.name} latest episode guest`)}`;
  }

  if (item.category === 'Music' || item.category === 'Comedians' || item.category === 'Sports' || item.category === 'Local Events') {
    return `https://www.ticketmaster.com/search?q=${query}`;
  }

  if (item.category === 'Movies') {
    return `https://www.google.com/search?q=${encodeURIComponent(`${item.name} showtimes near me`)}`;
  }

  if (item.category === 'TV Shows') {
    return `https://www.google.com/search?q=${encodeURIComponent(`${item.name} streaming availability`)}`;
  }

  if (item.category === 'Video Games') {
    return `https://www.google.com/search?q=${encodeURIComponent(`${item.name} patch notes release date`)}`;
  }

  if (item.category === 'Products & Brands') {
    return `https://www.google.com/search?q=${encodeURIComponent(`${item.name} price restock availability`)}`;
  }

  if (item.category === 'Authors / Books') {
    return `https://www.google.com/search?q=${encodeURIComponent(`${item.name} book release signing`)}`;
  }

  if (item.category === 'YouTubers / Creators') {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${item.name} latest`)}`;
  }

  return `https://www.google.com/search?q=${query}`;
}

function isInPersonCategory(category: string) {
  return ['Music', 'Movies', 'Podcasts', 'Sports', 'Local Events', 'Authors / Books', 'YouTubers / Creators', 'Comedians'].includes(category);
}

function buildNearMeDiscoveries(trackedItems: TrackedItem[]) {
  return mockNearMeSignalsForInterests(trackedItems);
}

function actionForCategory(category: string) {
  if (category === 'Podcasts') {
    return 'Find Latest Episode';
  }

  if (category === 'Music' || category === 'Comedians' || category === 'Sports' || category === 'Local Events') {
    return category === 'Music' ? 'View Tour Dates' : 'View Tickets';
  }

  if (category === 'Movies') {
    return 'View Showtimes';
  }

  if (category === 'TV Shows') {
    return 'Watch';
  }

  if (category === 'Podcasts') {
    return 'Listen';
  }

  if (category === 'Video Games') {
    return 'Read Patch Notes';
  }

  if (category === 'Products & Brands') {
    return 'View Product';
  }

  if (category === 'Authors / Books') {
    return 'View Release';
  }

  return 'View Update';
}

function uniqueBriefingItems(items: BriefingItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.category}-${item.title}`.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function NotificationCard({ compact = false, item }: { compact?: boolean; item: BriefingItem }) {
  return (
    <article className={`notification-card ${compact ? 'compact-card' : ''}`}>
      <div>
        <span className={`priority-dot ${item.priority}`} />
        <p className="notification-category">{item.category} • {item.signalType.replace(/_/g, ' ')}</p>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
        {(item.eventDate || item.location) && (
          <p className="source-line">
            {new Date(item.eventDate).toLocaleDateString()} {item.location ? `• ${item.location}` : ''}
          </p>
        )}
        {item.source && (
          <p className="source-line">
            {item.sourceStatus ? `${item.sourceStatus}: ` : ''}
            {item.source}
          </p>
        )}
      </div>
      <div className="signal-actions">
        {item.actions.map((action) => (
          <a className="action-button" href={action.url} key={`${item.id}-${action.label}`} rel="noreferrer" target="_blank">
            {actionIcon(action.label)}
            {action.label}
          </a>
        ))}
      </div>
    </article>
  );
}

function actionIcon(action: string) {
  if (action.includes('Ticket') || action.includes('Showtimes') || action.includes('Tour')) {
    return <Ticket size={15} aria-hidden="true" />;
  }

  if (action.includes('Listen') || action.includes('Episode')) {
    return <Headphones size={15} aria-hidden="true" />;
  }

  if (action.includes('Patch')) {
    return <Gamepad2 size={15} aria-hidden="true" />;
  }

  return <PlayCircle size={15} aria-hidden="true" />;
}

function DashboardSection({ children, icon, title }: { children: ReactNode; icon: ReactNode; title: string }) {
  return (
    <section className="dashboard-section">
      <h2>
        {icon}
        {title}
      </h2>
      <div className="section-list">{children}</div>
    </section>
  );
}

function RadarTab({
  groupedTrackedItems,
  onManageRadars,
  onRemove,
  onStatusChange,
}: {
  groupedTrackedItems: Record<string, TrackedItem[]>;
  onManageRadars: () => void;
  onRemove: (itemId: string) => void;
  onStatusChange: (itemId: string, status: TrackStatus) => void;
}) {
  const hasTrackedItems = Object.keys(groupedTrackedItems).length > 0;

  return (
    <div className="tab-panel">
      <ScreenHeader
        kicker="Everything you follow"
        title="Your Radar"
        description="Following sends notifications. Watchlist tracks quietly without notifications. Paused items stay saved but stop alerting."
      />

      <button className="primary-button full-width" type="button" onClick={onManageRadars}>
        Manage selected radars
      </button>

      {!hasTrackedItems && (
        <div className="recommendation-card">
          <strong>No radars selected</strong>
          <p>Add categories or interests to build your Radar.</p>
        </div>
      )}

      {Object.entries(groupedTrackedItems).map(([category, items]) => (
        <section className="radar-group" key={category}>
          <h2>{category}</h2>
          {items.map((item) => (
            <article className="tracked-card" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <p>{item.rationale ?? statusLabel(item.status)}</p>
              </div>
              <span className={`status-chip ${item.status}`}>{statusLabel(item.status)}</span>
              <div className="tracked-actions">
                <button type="button" onClick={() => onStatusChange(item.id, item.status === 'paused' ? 'following' : 'paused')}>
                  {item.status === 'paused' ? 'Resume' : 'Pause'}
                </button>
                <button type="button" onClick={() => onStatusChange(item.id, item.status === 'watchlist' ? 'following' : 'watchlist')}>
                  {item.status === 'watchlist' ? 'Notify me' : 'Watchlist'}
                </button>
                <button type="button" onClick={() => onRemove(item.id)}>
                  Remove
                </button>
              </div>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

function statusLabel(status: TrackStatus) {
  if (status === 'watchlist') {
    return 'Watchlist';
  }

  if (status === 'paused') {
    return 'Paused';
  }

  return 'Following';
}

function DiscoverTab({
  trackedItems,
  onAddRecommendation,
}: {
  trackedItems: TrackedItem[];
  onAddRecommendation: (title: string, status: TrackStatus) => void;
}) {
  const selectedNames = new Set(trackedItems.map((item) => item.name.toLowerCase()));
  const visibleRecommendations = recommendations.filter((item) =>
    item.requiresAny.some((requiredItem) => selectedNames.has(requiredItem.toLowerCase())),
  );
  const rationaleSource = recommendations
    .flatMap((item) => item.requiresAny)
    .filter((item, index, allItems) => selectedNames.has(item.toLowerCase()) && allItems.indexOf(item) === index);
  const nearbyDiscoveries = buildNearMeDiscoveries(trackedItems);

  return (
    <div className="tab-panel">
      <ScreenHeader
        kicker="Recommendations"
        title="Discover"
        description="Radar recommends related artists, creators, releases, products, and events with a short rationale."
      />

      <div className="because-card">
        <Sparkles aria-hidden="true" />
        <div>
          <strong>
            {rationaleSource.length
              ? `Because you follow ${rationaleSource.join(' and ')}`
              : 'Recommendations will personalize as you follow interests'}
          </strong>
          <p>
            {rationaleSource.length
              ? 'Radar found adjacent interests with matching activity and release signals.'
              : 'Discover stays empty until Radar has a specific selected interest to compare against.'}
          </p>
        </div>
      </div>

      <div className="recommendation-stack">
        {visibleRecommendations.length === 0 && (
          <article className="recommendation-card large">
            <strong>No recommendations yet</strong>
            <p>Select specific artists, games, shows, products, creators, or events during onboarding to generate relevant recommendations.</p>
          </article>
        )}
        {visibleRecommendations.map((item) => (
          <article className="recommendation-card large" key={item.title}>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
            <p className="source-line">
              Because you follow: {item.requiresAny.filter((requiredItem) => selectedNames.has(requiredItem.toLowerCase())).join(', ')}
            </p>
            <p>{item.reason}</p>
            <div className="button-row">
              <button className="primary-button compact" type="button" onClick={() => onAddRecommendation(item.title, 'following')}>
                Add to Radar
              </button>
              <button className="secondary-button compact" type="button" onClick={() => onAddRecommendation(item.title, 'watchlist')}>
                Watch quietly
              </button>
            </div>
          </article>
        ))}
      </div>

      <DashboardSection title="Near Me" icon={<MapPin size={18} />}>
        {nearbyDiscoveries.length === 0 && (
          <div className="recommendation-card large">
            <strong>No nearby discoveries yet</strong>
            <p>Select in-person interests like concerts, comedy, movies, sports, books, creators, or local events to discover nearby things that are not already on your Radar.</p>
          </div>
        )}
        {nearbyDiscoveries.map((item) => (
          <NotificationCard compact item={item} key={item.id} />
        ))}
      </DashboardSection>
    </div>
  );
}

function NearMeTab({ trackedItems }: { trackedItems: TrackedItem[] }) {
  const nearMeSignals = mockNearMeSignalsForInterests(trackedItems);
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortMode, setSortMode] = useState<'Soonest' | 'Category'>('Soonest');
  const nearMeCategories = ['All', ...unique(nearMeSignals.map((signal) => signal.category))];
  const filteredSignals = nearMeSignals
    .filter((signal) => categoryFilter === 'All' || signal.category === categoryFilter)
    .sort((first, second) => {
      if (sortMode === 'Category') {
        return first.category.localeCompare(second.category) || first.title.localeCompare(second.title);
      }

      return new Date(first.eventDate).getTime() - new Date(second.eventDate).getTime();
    });

  return (
    <div className="tab-panel">
      <ScreenHeader
        kicker="Location-based discovery"
        title="Near Me"
        description="Discover concerts, comedy shows, showtimes, sports, festivals, air shows, car shows, fairs, creator events, and author signings related to your selections."
      />

      <section className="settings-section">
        <h2>Filter nearby signals</h2>
        <div className="filter-bar" aria-label="Near Me category filters">
          {nearMeCategories.map((category) => (
            <button
              className={`filter-chip ${categoryFilter === category ? 'active-setting' : ''}`}
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <div className="filter-bar" aria-label="Near Me sorting">
          {(['Soonest', 'Category'] as const).map((option) => (
            <button
              className={`filter-chip ${sortMode === option ? 'active-setting' : ''}`}
              key={option}
              type="button"
              onClick={() => setSortMode(option)}
            >
              Sort: {option}
            </button>
          ))}
        </div>
      </section>

      <DashboardSection title="Happening near you" icon={<MapPin size={18} />}>
        {filteredSignals.length === 0 && (
          <div className="recommendation-card">
            <strong>No nearby discoveries yet</strong>
            <p>Add in-person interests and a location radius to find related things that are not already on your Radar.</p>
          </div>
        )}
        {filteredSignals.map((signal) => (
          <NotificationCard compact item={signal} key={signal.id} />
        ))}
      </DashboardSection>
    </div>
  );
}

function AlertsTab({
  selectedAlerts,
  trackedItems,
  onAlertToggle,
}: {
  selectedAlerts: string[];
  trackedItems: TrackedItem[];
  onAlertToggle: (option: string) => void;
}) {
  const selectedNames = new Set(trackedItems.map((item) => item.name.toLowerCase()));
  const relevantAlerts = briefingItems.filter((item) =>
    item.relatedItems?.some((relatedItem) => selectedNames.has(relatedItem.toLowerCase())),
  );
  const integrationAlerts = buildIntegrationUpdates(trackedItems);
  const actionableAlerts = uniqueBriefingItems([...relevantAlerts, ...integrationAlerts]);

  return (
    <div className="tab-panel">
      <ScreenHeader
        kicker="Today, week, month, category, priority"
        title="Alerts"
        description="Filter actionable notifications and tune which alert types are active."
      />

      <div className="filter-bar" aria-label="Alert filters">
        {['Today', 'Week', 'Month', 'Category', 'Priority'].map((filter) => (
          <button className="filter-chip" key={filter} type="button">
            {filter}
          </button>
        ))}
      </div>

      <section className="alert-types-card">
        <div className="selected-count">
          <Bell size={18} aria-hidden="true" />
          <strong>{selectedAlerts.length} Selected</strong>
        </div>

        {alertGroups.map((group) => (
          <div className="alert-group" key={group.name}>
            <h2>{group.name}</h2>
            <div className="pill-grid">
              {group.options.map((option) => (
                <button
                  className={`pill-button ${selectedAlerts.includes(option) ? 'selected' : ''}`}
                  key={`${group.name}-${option}`}
                  type="button"
                  onClick={() => onAlertToggle(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </section>

      <DashboardSection title="Actionable alerts" icon={<SlidersHorizontal size={18} />}>
        {actionableAlerts.length === 0 && (
          <div className="recommendation-card">
            <strong>No actionable alerts yet</strong>
            <p>Alerts will appear only for the specific interests you selected.</p>
          </div>
        )}
        {actionableAlerts.map((item) => (
          <NotificationCard compact item={item} key={`alert-${item.id}`} />
        ))}
      </DashboardSection>

      <p className="inline-note">{trackedItems.filter((item) => item.status === 'watchlist').length} watchlist items are tracking quietly with no notifications.</p>
    </div>
  );
}

function SettingsTab({
  settings,
  onResetRadar,
  onSettingsChange,
}: {
  settings: RadarSettings;
  onResetRadar: () => void;
  onSettingsChange: (updater: (current: RadarSettings) => RadarSettings) => void;
}) {
  const [newLocationName, setNewLocationName] = useState('');
  const toggleConnectedService = (service: string) => {
    onSettingsChange((current) => ({
      ...current,
      connectedServices: current.connectedServices.includes(service)
        ? current.connectedServices.filter((item) => item !== service)
        : [...current.connectedServices, service],
    }));
  };
  const addLocation = () => {
    const name = newLocationName.trim();
    if (!name) {
      return;
    }

    onSettingsChange((current) => ({
      ...current,
      locations: [
        ...current.locations,
        {
          id: `location-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
          name,
          radius: '50',
          isPrimary: current.locations.length === 0,
        },
      ],
    }));
    setNewLocationName('');
  };
  const removeLocation = (locationId: string) => {
    onSettingsChange((current) => {
      const locations = current.locations.filter((location) => location.id !== locationId);
      if (!locations.some((location) => location.isPrimary) && locations[0]) {
        locations[0] = { ...locations[0], isPrimary: true };
      }

      return { ...current, locations };
    });
  };
  const setPrimaryLocation = (locationId: string) => {
    onSettingsChange((current) => ({
      ...current,
      locations: current.locations.map((location) => ({
        ...location,
        isPrimary: location.id === locationId,
      })),
    }));
  };
  const updateLocationRadius = (locationId: string, radius: string) => {
    onSettingsChange((current) => ({
      ...current,
      locations: current.locations.map((location) => location.id === locationId ? { ...location, radius } : location),
    }));
  };

  return (
    <div className="tab-panel">
      <ScreenHeader
        kicker="Controls and integrations"
        title="Settings"
        description="Adjust notification cadence, locations, connected services, import/export, and future theme options."
      />

      <section className="settings-section">
        <h2>Notification frequency</h2>
        <div className="settings-grid">
          {['Immediate', 'Daily Digest', 'Weekly Digest'].map((option) => (
            <button
              className={`setting-card ${settings.notificationFrequency === option ? 'active-setting' : ''}`}
              key={option}
              type="button"
              onClick={() => onSettingsChange((current) => ({ ...current, notificationFrequency: option as RadarSettings['notificationFrequency'] }))}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2>Location settings</h2>
        <div className="location-list">
          {settings.locations.map((location) => (
            <article className="setting-card location-card" key={location.id}>
              <strong>{location.isPrimary ? 'Home: ' : 'Also Track: '}{location.name}</strong>
              <span>Radius: {location.radius} miles</span>
              <div className="tracked-actions">
                {radii.map((radius) => (
                  <button key={radius} type="button" onClick={() => updateLocationRadius(location.id, radius)}>
                    {radius}
                  </button>
                ))}
                <button type="button" onClick={() => setPrimaryLocation(location.id)}>Set primary</button>
                <button type="button" onClick={() => removeLocation(location.id)}>Remove</button>
              </div>
            </article>
          ))}
          <form className="custom-entry-card" onSubmit={(event) => { event.preventDefault(); addLocation(); }}>
            <label>
              Add location
              <span>Track nearby signals in another city.</span>
            </label>
            <div className="custom-entry-row">
              <input value={newLocationName} placeholder="City or place" onChange={(event) => setNewLocationName(event.target.value)} />
              <button className="secondary-button compact" type="submit">Add</button>
            </div>
          </form>
        </div>
      </section>

      <section className="settings-section">
        <h2>Sound settings</h2>
        <div className="settings-grid">
          {['Sonar Ping', 'Radar Sweep', 'Silent'].map((option) => (
            <button
              className={`setting-card ${settings.sound === option ? 'active-setting' : ''}`}
              key={option}
              type="button"
              onClick={() => onSettingsChange((current) => ({ ...current, sound: option as RadarSettings['sound'] }))}
            >
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2>Connected services</h2>
        <div className="service-grid">
          {services.map((service) => (
            <button
              className={`service-chip ${settings.connectedServices.includes(service) ? 'active-setting' : ''}`}
              key={service}
              type="button"
              onClick={() => toggleConnectedService(service)}
            >
              {service}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section radar-visualization">
        <RadarIcon aria-hidden="true" />
        <div>
          <h2>Radar visualization</h2>
          <p>Future useful view: center is you, dots are tracked interests, green is future, yellow is upcoming, and red is urgent.</p>
        </div>
      </section>

      <section className="settings-section">
        <h2>Import / export interests</h2>
        <div className="settings-grid">
          {['Export Interests', 'Import Interests'].map((option) => (
            <button className="setting-card" key={option} type="button">
              {option}
            </button>
          ))}
          <button className="setting-card danger-setting" type="button" onClick={onResetRadar}>
            Reset Radar
          </button>
        </div>
      </section>

      <section className="settings-section">
        <h2>Theme options</h2>
        <div className="settings-grid">
          {['Radar Dark', 'Radar Dark Green', 'High Contrast'].map((option) => (
            <button
              className={`setting-card ${settings.theme === option ? 'active-setting' : ''}`}
              key={option}
              type="button"
              onClick={() => onSettingsChange((current) => ({ ...current, theme: option as RadarSettings['theme'] }))}
            >
              {option}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function BottomNavigation({
  activeTab,
  onTabChange,
}: {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}) {
  const tabs: Array<{ id: DashboardTab; label: string; icon: ReactNode }> = [
    { id: 'home', label: 'Home', icon: <HomeIcon size={18} /> },
    { id: 'radar', label: 'Radar', icon: <RadarIcon size={18} /> },
    { id: 'discover', label: 'Discover', icon: <Compass size={18} /> },
    { id: 'nearMe', label: 'Near Me', icon: <MapPin size={18} /> },
    { id: 'alerts', label: 'Alerts', icon: <Bell size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {tabs.map((tab) => (
        <button
          className={activeTab === tab.id ? 'active' : ''}
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}

export default App;
