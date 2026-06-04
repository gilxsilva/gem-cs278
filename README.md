# gem — CS278 @ Stanford

A social map app for sharing your favorite places with friends. Drop pins, browse by category, and discover where your circles recommend.

---

## Quick start

```bash
cd gem
npx expo start
```

Scan the QR code with **Expo Go** on your phone (iOS or Android).

---

## Folder structure

```
gem/
├── App.js              # Root: navigation stack, auth state, theme toggle
├── supabase.js         # Supabase client
├── constants.js        # Categories, theme colors, Stanford coords, map styles
├── app.json            # Expo config (name, bundle ID, EAS project ID)
├── screens/
│   ├── Login.js        # Google sign-in
│   ├── OnboardingScreen.js  # First-time user onboarding
│   ├── FeedView.js     # Social feed with circle/following filters
│   ├── MapView.js      # Interactive map with pins and category filter
│   ├── AddPin.js       # Compose a new gem (name, category, note, photo, location)
│   ├── PinDetail.js    # Full detail view for a single gem
│   ├── PostComments.js # Comments on a gem
│   ├── Profile.js      # User profile, collections, taste tags
│   ├── Search.js       # Search gems and users
│   ├── Settings.js     # App settings, language, theme toggle
│   ├── CollectionDetail.js  # View a saved collection
│   └── CommunityGuide.js    # Community guidelines
├── components/
│   ├── SaveToCollectionModal.js
│   └── ReportModal.js
├── services/
│   ├── places.js       # Location search via OpenStreetMap/Nominatim
│   └── share.js        # Native share sheet
├── localization/
│   ├── i18n.js         # i18next setup (English + Spanish)
│   └── translations/
└── assets/             # App icon, splash screen, logo
```

---

## Class submission (EAS / Expo Go)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas update:configure
eas update --auto
```

Share the link from the EAS dashboard. Teammates scan it with Expo Go.

---

## Theme

The app supports **light and dark mode**. Toggle via the Settings screen.
