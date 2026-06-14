import { useMemo, useState } from 'react';
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

type AppScreen = 'splash' | 'accountChoice' | 'signIn' | 'onboarding' | 'dashboard';
type DashboardTab = 'home' | 'radar' | 'discover' | 'alerts' | 'settings';
type OnboardingStep = 'category' | 'platforms' | 'genres' | 'suggestions' | 'preferences' | 'location' | 'summary';
type AccountMode = 'local' | 'account';
type TrackStatus = 'following' | 'watchlist' | 'paused';

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
};

type BriefingItem = {
  id: string;
  category: string;
  title: string;
  detail: string;
  priority: 'high' | 'upcoming' | 'news' | 'recommendation';
  action: string;
  relatedItems?: string[];
};

const STORAGE_KEY = 'radar-local-profile-v1';
const radii = ['25', '50', '100', '250', '500'];

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
    name: 'Products',
    options: ['Price drops', 'Restocks', 'New versions', 'Recalls', 'Availability'],
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
    title: 'Metallica announced a Chicago show',
    detail: 'Presale opens tomorrow at 10:00 AM. Tickets are expected to move quickly.',
    priority: 'high',
    action: 'Buy Tickets',
    relatedItems: ['Metallica'],
  },
  {
    id: 'nate-podcast',
    category: 'Comedians',
    title: 'Nate Bargatze appeared on SmartLess',
    detail: 'A new interview episode is available on Spotify, YouTube, and Apple Podcasts.',
    priority: 'news',
    action: 'Listen',
    relatedItems: ['Nate Bargatze'],
  },
  {
    id: 'fantastic-four',
    category: 'Movies',
    title: 'Fantastic Four tickets are available',
    detail: 'Nearby theaters added evening showtimes for opening weekend.',
    priority: 'upcoming',
    action: 'View Showtimes',
    relatedItems: ['Fantastic Four'],
  },
  {
    id: 'fortnite-patch',
    category: 'Video Games',
    title: 'Fortnite patch released',
    detail: 'Balance changes, new event quests, and outage notes are live.',
    priority: 'news',
    action: 'Read Patch Notes',
    relatedItems: ['Fortnite'],
  },
];

const recommendations = [
  {
    title: 'Gojira',
    detail: 'Radar found a progressive metal overlap with your selected artists.',
    action: 'Add to Radar',
    requiresAny: ['Tool', 'Pantera'],
  },
  {
    title: 'Mastodon',
    detail: 'Similar heavy riffs, tour activity, and high match with your metal preferences.',
    action: 'Watch Quietly',
    requiresAny: ['Tool', 'Pantera', 'Gojira', 'Lamb of God'],
  },
  {
    title: 'Lamb of God',
    detail: 'Recommended from your Metallica, Megadeth, and Pantera cluster.',
    action: 'Add to Radar',
    requiresAny: ['Metallica', 'Megadeth', 'Pantera'],
  },
];

const services = ['Spotify', 'Apple Music', 'YouTube', 'Netflix', 'Disney+', 'Prime Video', 'Hulu', 'Steam', 'Xbox', 'PlayStation', 'Nintendo'];

const defaultSelection = (): CategorySelection => ({
  genres: [],
  suggestions: [],
  preferences: [],
  platforms: [],
  radius: '50',
});

const unique = (items: string[]) => Array.from(new Set(items));

function App() {
  const [screen, setScreen] = useState<AppScreen>('splash');
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>('home');
  const [accountMode, setAccountMode] = useState<AccountMode>('local');
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('category');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [completedCategoryIds, setCompletedCategoryIds] = useState<string[]>([]);
  const [hasOpenedDashboard, setHasOpenedDashboard] = useState(false);
  const [selections, setSelections] = useState<Record<string, CategorySelection>>({});
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>(['Concerts', 'New albums', 'Trailers', 'Updates', 'Daily digest']);
  const [trackedItems, setTrackedItems] = useState<TrackedItem[]>([]);
  const [authMessage, setAuthMessage] = useState('');

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
        status: 'following' as TrackStatus,
      }));
    });

    if (selectedItems.length) {
      setTrackedItems((current) => uniqueTrackedItems([...selectedItems, ...current]));
    }

    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          accountMode,
          completedCategoryIds: completedIds,
          selectedCategoryIds,
          selections,
          savedAt: new Date().toISOString(),
        }),
      );
    } catch {
      // Local mode still works if browser storage is unavailable.
    }

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
          trackedItems={visibleTrackedItems}
          onAddRecommendation={addRecommendation}
          onAlertToggle={toggleAlert}
          onManageRadars={manageRadars}
          onRemoveTrackedItem={removeTrackedItem}
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
  return (
    <section className="screen splash-screen no-scroll-screen" aria-labelledby="splash-title">
      <div className="radar-orbit" aria-hidden="true">
        <div className="radar-sweep" />
        <div className="radar-dot dot-one" />
        <div className="radar-dot dot-two" />
        <div className="radar-dot dot-three" />
      </div>

      <div className="brand-lockup">
        <div className="logo-mark">
          <RadarIcon size={42} strokeWidth={1.7} />
        </div>
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
              options={generatedSuggestions}
              selected={activeSelection.suggestions}
              onToggle={(value) => onToggle('suggestions', value)}
              actionLabel="Continue to alert preferences"
              actionDisabled={generatedSuggestions.length === 0}
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
  description,
  emptyMessage,
  onNext,
  onToggle,
  options,
  selected,
  title,
}: {
  actionDisabled: boolean;
  actionLabel: string;
  description: string;
  emptyMessage?: string;
  onNext: () => void;
  onToggle: (value: string) => void;
  options: string[];
  selected: string[];
  title: string;
}) {
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
  trackedItems,
  onAddRecommendation,
  onAlertToggle,
  onManageRadars,
  onRemoveTrackedItem,
  onTabChange,
  onTrackedStatusChange,
}: {
  activeTab: DashboardTab;
  groupedTrackedItems: Record<string, TrackedItem[]>;
  selectedAlerts: string[];
  selectedCategoryNames: string[];
  trackedItems: TrackedItem[];
  onAddRecommendation: (title: string, status: TrackStatus) => void;
  onAlertToggle: (option: string) => void;
  onManageRadars: () => void;
  onRemoveTrackedItem: (itemId: string) => void;
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
        {activeTab === 'alerts' && (
          <AlertsTab
            selectedAlerts={selectedAlerts}
            trackedItems={trackedItems}
            onAlertToggle={onAlertToggle}
          />
        )}
        {activeTab === 'settings' && <SettingsTab />}
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
  const generatedItems: BriefingItem[] = trackedItems.slice(0, 5).map((item) => ({
    id: `personalized-${item.id}`,
    category: item.category,
    title: `${item.name} is on your Radar`,
    detail: detailForTrackedItem(item),
    priority: item.status === 'watchlist' ? 'recommendation' : 'news',
    action: actionForCategory(item.category),
  }));
  const personalizedItems = uniqueBriefingItems([...selectedBriefingItems, ...generatedItems]);
  const highPriority = personalizedItems.filter((item) => item.priority === 'high');
  const upcoming = personalizedItems.filter((item) => item.priority === 'upcoming');
  const news = personalizedItems.filter((item) => item.priority === 'news');
  const visibleRecommendations = recommendations.filter((item) =>
    item.requiresAny.some((requiredItem) => selectedNames.has(requiredItem.toLowerCase())),
  );

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

      <DashboardSection title="News" icon={<Bell size={18} />}>
        {news.map((item) => (
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
        {visibleRecommendations.map((item) => (
          <div className="recommendation-card" key={item.title}>
            <strong>{item.title}</strong>
            <p>{item.detail}</p>
            <button className="secondary-button compact" type="button">
              {item.action}
            </button>
          </div>
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

function actionForCategory(category: string) {
  if (category === 'Music' || category === 'Comedians' || category === 'Sports' || category === 'Local Events') {
    return 'View Tickets';
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
        <p className="notification-category">{item.category}</p>
        <h3>{item.title}</h3>
        <p>{item.detail}</p>
      </div>
      <button className="action-button" type="button">
        {actionIcon(item.action)}
        {item.action}
      </button>
    </article>
  );
}

function actionIcon(action: string) {
  if (action.includes('Ticket') || action.includes('Showtimes')) {
    return <Ticket size={15} aria-hidden="true" />;
  }

  if (action.includes('Listen')) {
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

      <section className="near-me-card">
        <MapPin aria-hidden="true" />
        <div>
          <p className="eyebrow">Near Me</p>
          <h2>Local signals based on your interests</h2>
          <p>Concerts, comedy, sports, festivals, air shows, car shows, fairs, farmers markets, and food festivals.</p>
        </div>
      </section>
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
        {relevantAlerts.length === 0 && (
          <div className="recommendation-card">
            <strong>No actionable alerts yet</strong>
            <p>Alerts will appear only for the specific interests you selected.</p>
          </div>
        )}
        {relevantAlerts.map((item) => (
          <NotificationCard compact item={item} key={`alert-${item.id}`} />
        ))}
      </DashboardSection>

      <p className="inline-note">{trackedItems.filter((item) => item.status === 'watchlist').length} watchlist items are tracking quietly with no notifications.</p>
    </div>
  );
}

function SettingsTab() {
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
            <button className="setting-card" key={option} type="button">
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2>Location settings</h2>
        <div className="settings-grid">
          {['Current location', 'Multiple locations', 'Travel mode'].map((option) => (
            <button className="setting-card" key={option} type="button">
              {option}
            </button>
          ))}
        </div>
      </section>

      <section className="settings-section">
        <h2>Connected services</h2>
        <div className="service-grid">
          {services.map((service) => (
            <button className="service-chip" key={service} type="button">
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

      <div className="settings-grid">
        <button className="setting-card" type="button">
          Sound settings
        </button>
        <button className="setting-card" type="button">
          Import / export
        </button>
        <button className="setting-card" type="button">
          Theme options
        </button>
      </div>
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
