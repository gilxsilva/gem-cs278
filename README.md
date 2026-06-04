<div align="center">

# ✦ gem

### places worth remembering

A social map for recommendations that actually mean something —  
from people whose taste you trust.

---

*Built for CS278 · Social Computing · Stanford University*

</div>

---

## Why we built this

Every time you open Google Maps, Yelp, or TripAdvisor, you get the same thing: thousands of strangers rating the same places in the same way. The algorithm surfaces what's popular. Not what's good. Not what's right for *you*.

But here's what actually happens when you need a recommendation: you text a friend. You ask your roommate. You remember that one thing your dad mentioned when he drove through town. You trust people, not star ratings.

Gem is built around that instinct.

It's a map where every pin is a personal recommendation — from someone whose taste you know, whose judgment you've tested, whose opinions come with context. Not "4.2 stars (1,847 reviews)." Just: *"Get the cortado and sit outside if it's sunny. Feels like a tiny reset."*

That's a gem.

---

## What it does

Gem lets you drop pins on places that matter to you, follow people whose taste you trust, and browse a feed of recommendations that comes from your actual circle — not an opaque algorithm.

The result is a living, personal map that gets more useful as the people around you use it.

---

## Features

### ✦ The Feed

Two modes, one screen.

**Discover** surfaces all public gems with a trending strip at the top — the most-saved places across the network, right now. Posts from people you follow get a subtle `circle` badge so you always know whose voice you're hearing.

**Circle** collapses the feed to just your people. No noise. Only gems from accounts you've explicitly chosen to follow.

Both modes support category filters: Study Gems, Food Spots, Coffee Runs, Moments, Hidden Gems, Late Night.

---

### 🗺 The Map

An interactive Google Maps view with custom-styled light and dark themes. Every gem gets a color-coded, icon-labeled pin. Tap a pin to see a slide-up preview; tap through to the full detail.

Filter by category or switch to **Circle mode** to see only your network's pins. The map defaults to Stanford's campus and expands from there.

---

### ✦ Drop a Gem

The compose screen asks three things: what's the place, what category does it live in, and why does it matter. Add a photo and a note. The location picker searches the Supabase database first, then falls back to OpenStreetMap for anything not in the index — with a manual entry option if you're somewhere truly off the grid.

Good gems are specific. The onboarding teaches this from the start.

---

### 📚 Collections

Organize saves into named collections — *Study Spots*, *Date Nights*, *Places to Show My Parents*. Each collection can be public (visible on your profile) or private (just for you). Collections turn a scattered list of saves into something navigable.

---

### 👤 Profiles

Every user gets a profile with display name, `@handle`, bio, and two taste-specific fields: a **taste tagline** (a single sentence about what you look for in a place) and **taste tags** (up to 8 free-form tags that describe your sensibility). These signals help people decide whether to follow you.

Profiles show follower and following counts, your gem count, your public collections, and a preview of your latest gem.

---

### 👥 The Follow Graph

Follow people whose recommendations you trust. Unfollow when that changes. Your following list directly controls what you see in Circle mode — making the follow decision meaningful rather than social obligation.

---

### 🔖 Save & Bookmark

Heart a gem to save it. Bookmark it to a specific collection. The save count on each gem is public, providing lightweight social proof without turning the app into a popularity contest.

---

### 🚩 Reporting

Tap the `···` menu on any gem to report it. Five reasons: Spam, Inappropriate content, Misinformation, Not a real place, or Other. Reports go directly to the Gem team for review. The onboarding covers this — because community health is part of the product, not an afterthought.

---

### 🌐 Language Support

English and Spanish, switchable in Settings. Language preference persists across sessions.

---

### 🌙 Light & Dark Mode

Full theme support throughout. Warm cream and deep navy in light mode. A dark-roasted warm dark mode that doesn't look like every other dark UI.

---

## Screenshots

> *Screenshots coming soon — add images to this section before final submission.*

<!-- SCREENSHOT GUIDE:
  Recommended shots (in order):
  1. Login screen — the logo + "places worth remembering" tagline
  2. Onboarding step 1 — the ✦ welcome screen
  3. Onboarding step 3 — the interactive "which gem is better?" choice game
  4. Feed (Discover mode) — showing the trending strip + a few cards with circle badges
  5. Feed (Circle mode) — the filtered view with the empty state if needed
  6. Map — pins in category colors, one selected with preview sheet
  7. AddPin — the compose screen with location picker open
  8. Profile — showing taste tags, tagline, and collections grid
  9. PinDetail — full detail view
  10. Settings — language picker or theme toggle
  
  Tip: Use two phones or the iOS simulator with different accounts to show
  the social features (circle feed, follow state, etc.) in context.
-->

| Login | Feed | Map | Profile |
|---|---|---|---|
| *(add screenshot)* | *(add screenshot)* | *(add screenshot)* | *(add screenshot)* |

---

## Social Computing Concepts

*This section addresses the CS278 framing directly.*

Gem is designed around several core ideas from social computing research:

**Trust networks over broadcast networks.** The follow graph in Gem is not decorative. Circle mode makes your social graph the actual content filter. Who you follow determines what you see — making the follow relationship load-bearing in a way that most social apps don't require.

**Social proof at the right scale.** Save counts are visible, but kept secondary. A gem with 12 saves from people in your network means more than one with 200 saves from strangers. The trending section is a lightweight ambient awareness signal — not a ranked algorithmic feed.

**User-generated norms.** The onboarding runs a 7-step interactive tutorial that explicitly teaches users what a "good gem" looks like, using live examples and an interactive choice game. We're not just onboarding users to a product — we're onboarding them to a community standard.

**Taste as a trust signal.** Profiles include taste taglines and taste tags — fields that have no equivalent in standard social apps. They let you evaluate *whether* to follow someone before following them. This shifts the follow decision from social pressure ("they followed me") to genuine taste alignment.

**Place-based social interaction.** Gems are anchored to real geographic locations. This makes the social graph spatially legible — your circle's recommendations form a literal map of trusted places. The social and physical layers reinforce each other.

**Moderation as community responsibility.** The report flow is covered in onboarding, not buried in settings. Reports go to the Gem team directly. The framing — "help keep gem useful" — positions moderation as participation, not policing.

**Parasocial trust.** You don't have to know someone personally to follow them. Someone with a taste tagline that resonates, or a collection that maps to yours, is worth following even if you've never met. Gem supports both close-circle discovery and interest-aligned discovery.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | React Native (Expo ~54) |
| **Navigation** | React Navigation — Native Stack + Bottom Tabs |
| **Backend** | Supabase (PostgreSQL + Row-Level Security) |
| **Auth** | Supabase Auth — Google OAuth (implicit flow) |
| **Database queries** | Supabase JS client + custom `get_feed` RPC |
| **Storage** | Supabase Storage (`gem-images` bucket) |
| **Maps** | Google Maps via `react-native-maps` |
| **Place search** | OpenStreetMap / Nominatim (free, no API key) |
| **Icons** | Ionicons via `@expo/vector-icons` |
| **Localization** | i18next + react-i18next (EN / ES) |
| **Session storage** | AsyncStorage |
| **Image picker** | expo-image-picker |
| **OAuth browser** | expo-web-browser + expo-linking |
| **Build & deploy** | EAS (Expo Application Services) |

---

## Project Structure

```
gem/
├── App.js                  # Root: auth listener, onboarding gate, navigation shell
├── supabase.js             # Supabase client (auth + DB + storage)
├── constants.js            # Categories, theme tokens, map styles, Stanford coords
│
├── screens/
│   ├── Login.js            # Google sign-in, guest demo mode
│   ├── OnboardingScreen.js # 7-step interactive onboarding (shown once per user)
│   ├── FeedView.js         # Discover + Circle feed with trending strip
│   ├── MapView.js          # Interactive map with category pins
│   ├── AddPin.js           # Compose screen — drop a new gem
│   ├── PinDetail.js        # Full gem detail view
│   ├── PostComments.js     # Comments thread
│   ├── Profile.js          # User profile, collections, taste fields, follow graph
│   ├── Search.js           # Search gems and users
│   ├── CollectionDetail.js # View all gems in a collection
│   ├── Settings.js         # Language, theme, sign out
│   └── CommunityGuide.js   # Community guidelines
│
├── components/
│   ├── SaveToCollectionModal.js  # Bottom sheet: save a gem to a collection
│   └── ReportModal.js            # Bottom sheet: report a gem (5 categories)
│
├── services/
│   ├── places.js           # Place search via Nominatim + Supabase, geocoding
│   └── share.js            # Native share sheet for gems
│
├── localization/
│   ├── i18n.js             # i18next setup, AsyncStorage language persistence
│   └── translations/
│       ├── en.json
│       └── es.json
│
└── assets/
    ├── logo.png            # App wordmark (used throughout the app)
    ├── icon.png            # App icon
    ├── adaptive-icon.png   # Android adaptive icon
    └── splash-icon.png     # Splash screen
```

---

## Running Locally

### Prerequisites

- Node.js 20+
- [Expo Go](https://expo.dev/go) installed on your phone
- A Supabase project (or use the existing one if you have the credentials)

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd gem

# Install dependencies
npm install

# Start the dev server
npx expo start
```

Scan the QR code with Expo Go. The app will load on your device.

### Environment

Supabase credentials are configured directly in `supabase.js`. The app connects to the existing project by default — no additional setup needed to run against the live database.

If you want to point to your own Supabase project, update `SUPABASE_URL` and `SUPABASE_ANON` in `supabase.js` and run the migrations from the project's database schema.

### Building for distribution

```bash
npm install -g eas-cli
eas login
eas update --auto
```

Share the EAS update URL with testers — they open it in Expo Go directly.

---

## Team

Built with care by three Stanford students for CS278.

| | Name | |
|---|---|---|
| | **Eva Wanek** | [GitHub](#) |
| | **Gil Silva** | [GitHub](#) |
| | **Yujen Lin** | [GitHub](#) |

---

## What's next

A few ideas we didn't have time for but think about:

**Mutual recommendations.** Surfacing gems from friends-of-friends when someone you follow saves a place — a soft second-degree social proof signal.

**Collaborative collections.** Shared collections for trips, neighborhoods, or friend groups — a natural extension of the current collections model.

**Place memories.** The ability to revisit a gem you've been to and add a note: *"went here, it lived up to it."* Turning recommendations into records.

**Travel mode.** Temporarily expanding your map radius when you're somewhere new, and seeing who in your network has gems there.

**Taste matching.** Finding accounts with overlapping taste tags to suggest new people to follow — interest graph meets place graph.

---

<div align="center">

*Made at Stanford · Spring 2026*

✦

</div>
