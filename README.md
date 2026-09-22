# PetConnect (Mobile Application)

A native mobile application built with **React Native**, **Expo SDK 57**, and **Firebase** (Authentication & Cloud Firestore).

---

## Features

- **Pet Discovery & Advanced Search**: Filter adoptable pets by species, breed, location, tags, and gender.
- **Rich Media & Video Profiles**: Multi-photo carousel showcases and native HD video playback.
- **Firebase Authentication**: Email & password authentication with persistent session management via `AsyncStorage`.
- **Cloud Firestore Backend**: Real-time cloud sync for pets, adoption applications, and saved favorites.
- **Adoption State Machine & Ownership Protection**:
  - Pet owners receive incoming adoption requests in real-time.
  - Only the verified pet owner can approve or decline an application.
  - Acceptance atomically marks the pet as adopted and declines competing pending applications.
  - Prevention against duplicate applications for the same pet.
- **Offline / Demo Mode**: Graceful fallback to local persistence if offline or before cloud credentials are configured.
- **EAS Build Ready**: Standalone Android APK build configuration (`eas.json`).

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Development Server
```bash
npx expo start -c
```
- Scan the QR code using the **Expo Go** app on your Android or iOS device.

### 3. Build Standalone Android APK
```bash
npx eas login
npx eas build -p android --profile preview
```

---

## Project Structure

```
PetConnect23/
├── assets/images/        # App icons, splash screens, adaptive icons
├── firestore.rules       # Cloud Firestore security rules
├── app.json              # Expo & Android native configuration
├── eas.json              # EAS Build APK profile
├── .env.example          # Firebase environment variables template
└── src/
    ├── app/              # Expo Router file-based screens
    ├── components/       # Reusable UI components
    ├── constants/        # Theme palette (terracotta primary)
    ├── context/          # PetContext global state provider
    ├── data/             # Initial demo pets dataset
    ├── services/         # Firebase Auth, Firestore & Storage adapters
    └── types/            # TypeScript data models
```

