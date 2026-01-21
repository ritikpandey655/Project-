# PYQverse Android App - Build Guide

## Overview
PYQverse has been successfully converted from PWA to a full functional Android app using Capacitor 7!

## Features Integrated
✅ **Native Android App** with Capacitor
✅ **Push Notifications** via Firebase Cloud Messaging
✅ **Camera Access** for Doubt Solver image uploads
✅ **File System Access** for offline papers and downloads
✅ **Native Share** functionality
✅ **Network Status** monitoring
✅ **Offline Storage** with Preferences API
✅ **Splash Screen** with PYQverse branding
✅ **Status Bar** customization
✅ **Animated Logo Icon** maintained across the app

## Prerequisites
- **Node.js**: v20+ installed
- **Android Studio**: Latest version (2024+)
- **Java JDK**: 17 or higher
- **Android SDK**: API 33 or higher

## Quick Start

### 1. Install Dependencies
```bash
cd /app
yarn install
```

### 2. Build Web Assets
```bash
yarn build
```

### 3. Sync with Android
```bash
yarn android:sync
```

### 4. Open in Android Studio
```bash
yarn android:open
```

## Build Commands

### Development Build (Debug APK)
```bash
# Build web assets + sync
yarn android:build

# Build APK
yarn android:build:apk

# Or directly from Android Studio:
# Build > Build Bundle(s) / APK(s) > Build APK(s)
```
**Output**: `/app/android/app/build/outputs/apk/debug/app-debug.apk`

### Production Build (Release APK for Play Store)
```bash
# Build release APK
yarn android:build:release
```
**Output**: `/app/android/app/build/outputs/apk/release/app-release-unsigned.apk`

### Run on Device/Emulator
```bash
yarn android:run
```

## App Configuration

### App Details
- **App Name**: PYQverse
- **Package Name**: `in.pyqverse.app`
- **Domain**: www.pyqverse.in
- **Primary Color**: #5B2EFF (PYQverse Prime)

### Permissions Included
- Internet access
- Camera (for doubt solver)
- Storage (for offline papers)
- Push notifications
- Network state monitoring

## Icon & Branding
- ✅ App icon integrated (192x192 and 512x512)
- ✅ Splash screen with brand color (#5B2EFF)
- ✅ Animated logo maintained in app UI
- 🔄 **NEW**: Adaptive icon for Android 13+

## Firebase Configuration
The app uses the existing Firebase configuration from `/app/src/firebaseConfig.ts`:
- **Project ID**: pyqverse-e83f9
- **Authentication**: Enabled
- **Firestore**: Enabled
- **Analytics**: Enabled

### Enable Push Notifications (FCM)
1. Go to Firebase Console > Project Settings
2. Add Android app with package: `in.pyqverse.app`
3. Download `google-services.json`
4. Place it in: `/app/android/app/google-services.json`
5. Rebuild the app

## Payment Integration
Both payment options are configured:
1. **Web Payments** (PhonePe/Razorpay) - Already working
2. **Google Play Billing** - Ready for integration (requires Play Console setup)

## Signing the Release APK

### Generate Keystore
```bash
keytool -genkey -v -keystore pyqverse-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias pyqverse
```

### Sign APK
1. Update `/app/android/gradle.properties`:
```properties
PYQVERSE_RELEASE_STORE_FILE=pyqverse-release-key.jks
PYQVERSE_RELEASE_KEY_ALIAS=pyqverse
PYQVERSE_RELEASE_STORE_PASSWORD=YOUR_STORE_PASSWORD
PYQVERSE_RELEASE_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

2. Update `/app/android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        storeFile file(PYQVERSE_RELEASE_STORE_FILE)
        storePassword PYQVERSE_RELEASE_STORE_PASSWORD
        keyAlias PYQVERSE_RELEASE_KEY_ALIAS
        keyPassword PYQVERSE_RELEASE_KEY_PASSWORD
    }
}
buildTypes {
    release {
        signingConfig signingConfigs.release
        ...
    }
}
```

3. Build signed APK:
```bash
cd android && ./gradlew assembleRelease
```

## Google Play Store Deployment

### Prerequisites
- Google Play Console account ($25 one-time fee)
- Signed release APK
- App screenshots (1080x1920 for phone, 1920x1080 for tablet)
- Feature graphic (1024x500)
- App description (Hindi + English)

### Steps
1. Create app in Play Console
2. Upload signed APK
3. Add store listing:
   - **Title**: PYQverse - AI Exam Prep
   - **Short Description**: Master UPSC, JEE, NEET with AI-powered PYQ practice
   - **Full Description**: (Use content from manifest.json)
4. Set content rating (Everyone, Educational)
5. Add privacy policy URL: https://pyqverse.in/privacy
6. Submit for review

## Direct APK Distribution
You can also distribute the debug APK directly:
1. Build APK: `yarn android:build:apk`
2. Share APK file from: `/app/android/app/build/outputs/apk/debug/app-debug.apk`
3. Users need to enable "Install from Unknown Sources"

## Testing

### Test on Physical Device
1. Enable USB Debugging on Android phone
2. Connect via USB
3. Run: `yarn android:run`

### Test on Emulator
1. Open Android Studio
2. AVD Manager > Create Virtual Device
3. Select device (Pixel 6, API 33+)
4. Run: `yarn android:run`

## Troubleshooting

### Build Fails
```bash
# Clean build
cd android
./gradlew clean

# Rebuild
./gradlew assembleDebug
```

### Capacitor Sync Issues
```bash
npx cap sync android --force
```

### Update Capacitor Plugins
```bash
yarn capacitor:update
```

## Native Features Usage in Code

### Camera
```typescript
import { takePicture, pickImage } from './src/capacitorInit';

const imageDataUrl = await takePicture(); // Take photo
const imageDataUrl = await pickImage(); // Pick from gallery
```

### Share
```typescript
import { shareContent } from './src/capacitorInit';

await shareContent('Check out PYQverse', 'Best exam prep app', 'https://pyqverse.in');
```

### Push Notifications
Automatically registered on app start. Token saved in Preferences.

### Network Status
```typescript
import { getNetworkStatus } from './src/capacitorInit';

const status = await getNetworkStatus();
console.log(status.connected, status.connectionType);
```

## Next Steps
1. ✅ Test all features on physical device
2. ✅ Setup Firebase FCM for push notifications
3. ✅ Generate signing key for release
4. ✅ Create Play Store assets (screenshots, graphics)
5. ✅ Submit to Play Store

## Support
- **Website**: www.pyqverse.in
- **Support Email**: support@pyqverse.in
- **Package Name**: in.pyqverse.app

---

**Built with ❤️ using Capacitor 7 + React 19 + Firebase**
