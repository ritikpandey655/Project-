# 🤖 PYQverse Android APK Build करने का Complete Guide

## 📱 APK क्या है?

APK = Android Package Kit
- यह Android app की installable file है
- Google Play Store पर upload करने के लिए चाहिए
- Users इसे download करके install कर सकते हैं

---

## 🎯 2 Types of APK

### 1. **Debug APK** (Testing के लिए)
- Development और testing के लिए
- Unsigned (कोई signature नहीं)
- Play Store पर upload नहीं कर सकते
- Direct install कर सकते हैं device पर

### 2. **Release APK** (Play Store के लिए)
- Production के लिए
- Signed (digital signature के साथ)
- ✅ **Play Store पर upload करते हैं यही**
- Optimized और minified

---

## विधि 1: Android Studio से Build करें (Recommended)

यह सबसे आसान और standard तरीका है।

### Prerequisites:

**जरूरी चीजें:**
1. ✅ Windows/Mac/Linux computer
2. ✅ Android Studio installed
3. ✅ Java JDK 17+ installed
4. ✅ PYQverse project files

---

### Step 1: Android Studio Install करें

**Download करें:**
```
https://developer.android.com/studio
```

**Install करें:**
1. Installer download करें
2. Run करें और follow करें instructions
3. Android SDK automatically install होगा
4. First launch पर SDK components download होंगे (~5GB)

---

### Step 2: Project Files को Local Machine पर लाएं

**Option A: GitHub से Clone करें**
```bash
git clone https://github.com/YOUR_USERNAME/pyqverse.git
cd pyqverse
```

**Option B: Emergent से Download करें**
1. Emergent में project के सभी files
2. Download as ZIP
3. Extract करें local folder में

---

### Step 3: Dependencies Install करें

Terminal/Command Prompt खोलें:

```bash
cd /path/to/pyqverse

# Install Node dependencies
yarn install

# Build web assets
yarn build

# Sync with Android
yarn android:sync
```

---

### Step 4: Android Studio में Project Open करें

**Open करें:**
1. Android Studio launch करें
2. **"Open"** या **"Open an Existing Project"** click करें
3. Navigate करें: `pyqverse/android` folder
4. **"OK"** click करें

**Wait करें:**
- Gradle sync होगा (~2-5 minutes)
- Dependencies download होंगे
- "Sync successful" message आएगा

---

### Step 5A: Debug APK Build करें (Testing)

**Build Menu से:**
1. Top menu में **Build** click करें
2. **Build Bundle(s) / APK(s)** → **Build APK(s)** select करें
3. Build process start होगा
4. Wait करें 2-5 minutes
5. Success notification आएगा

**APK Location:**
```
pyqverse/android/app/build/outputs/apk/debug/app-debug.apk
```

**Or Terminal से:**
```bash
cd pyqverse/android
./gradlew assembleDebug
```

**Testing:**
- इस APK को directly install कर सकते हैं
- USB से phone connect करें
- APK transfer करें और install करें
- या Android Studio से direct run करें

---

### Step 5B: Release APK Build करें (Play Store)

Play Store के लिए **signed release APK** चाहिए।

---

## 🔐 Step 6: Signing Key Generate करें

Play Store upload के लिए APK को sign करना जरूरी है।

### Generate Keystore:

**Terminal/Command Prompt में run करें:**

```bash
keytool -genkey -v -keystore pyqverse-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias pyqverse
```

**Prompts का जवाब दें:**
```
Enter keystore password: [कोई strong password]
Re-enter new password: [same password]

What is your first and last name?
  [Your Name]
  
What is the name of your organizational unit?
  [PYQverse या Company Name]
  
What is the name of your organization?
  [Your Organization]
  
What is the name of your City or Locality?
  [Your City]
  
What is the name of your State or Province?
  [Your State]
  
What is the two-letter country code for this unit?
  [IN]
  
Is CN=..., correct?
  [yes]

Enter key password for <pyqverse>
  [Press ENTER - same password]
```

**Output:**
```
Generating 2,048 bit RSA key pair...
[Storing pyqverse-release-key.jks]
```

**✅ File बन गई:** `pyqverse-release-key.jks`

**⚠️ IMPORTANT:**
- इस file को safe रखें
- Password याद रखें या note करें
- Backup बना लें
- कभी भी public मत करें
- अगर खो गई तो app update नहीं कर पाएंगे!

---

## 🔑 Step 7: Signing Configuration Setup

### Create gradle.properties:

**File बनाएं:** `pyqverse/android/gradle.properties`

**Add करें:**
```properties
PYQVERSE_RELEASE_STORE_FILE=pyqverse-release-key.jks
PYQVERSE_RELEASE_KEY_ALIAS=pyqverse
PYQVERSE_RELEASE_STORE_PASSWORD=YOUR_KEYSTORE_PASSWORD
PYQVERSE_RELEASE_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

**Replace करें:**
- `YOUR_KEYSTORE_PASSWORD` → आपका actual password
- `YOUR_KEY_PASSWORD` → आपका actual password

---

### Update build.gradle:

**File:** `pyqverse/android/app/build.gradle`

**Find करें** (around line 30):
```gradle
android {
    ...
}
```

**Add करें** signingConfigs:
```gradle
android {
    ...
    
    signingConfigs {
        release {
            if (project.hasProperty('PYQVERSE_RELEASE_STORE_FILE')) {
                storeFile file(PYQVERSE_RELEASE_STORE_FILE)
                storePassword PYQVERSE_RELEASE_STORE_PASSWORD
                keyAlias PYQVERSE_RELEASE_KEY_ALIAS
                keyPassword PYQVERSE_RELEASE_KEY_PASSWORD
            }
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 🚀 Step 8: Build Signed Release APK

### Terminal से:

```bash
cd pyqverse/android
./gradlew assembleRelease
```

**Wait करें:** 3-5 minutes

**Success Message:**
```
BUILD SUCCESSFUL in 3m 45s
```

**APK Location:**
```
pyqverse/android/app/build/outputs/apk/release/app-release.apk
```

---

### या Android Studio से:

1. **Build** menu → **Generate Signed Bundle / APK**
2. **APK** select करें → **Next**
3. **Key store path**: Browse → `pyqverse-release-key.jks` select करें
4. **Key store password**: Enter करें
5. **Key alias**: `pyqverse`
6. **Key password**: Enter करें
7. **Next** → **release** build variant select करें
8. **Finish**

**APK बन जाएगा** same location पर।

---

## 📦 Step 9: APK Verify करें

### Test करें Phone पर:

1. APK file को phone में transfer करें
2. File manager में APK पर tap करें
3. "Install from Unknown Sources" allow करें
4. Install करें
5. App खोलें और test करें

**सभी features check करें:**
- ✅ App opens
- ✅ Login/Signup works
- ✅ Practice questions load
- ✅ Doubt solver works
- ✅ All animations smooth
- ✅ No crashes

---

## ☁️ विधि 2: GitHub Actions से Automatic Build (Advanced)

अगर local machine पर Android Studio नहीं है:

### Create GitHub Action:

**File बनाएं:** `.github/workflows/android-build.yml`

```yaml
name: Android Build

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up JDK 17
      uses: actions/setup-java@v3
      with:
        java-version: '17'
        distribution: 'temurin'
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
    
    - name: Install Dependencies
      run: |
        yarn install
        yarn build
        npx cap sync android
    
    - name: Build Debug APK
      run: |
        cd android
        chmod +x ./gradlew
        ./gradlew assembleDebug
    
    - name: Upload APK
      uses: actions/upload-artifact@v3
      with:
        name: app-debug
        path: android/app/build/outputs/apk/debug/app-debug.apk
```

**Push करें GitHub पर:**
```bash
git add .github/workflows/android-build.yml
git commit -m "Add Android build workflow"
git push origin main
```

**Download APK:**
1. GitHub repository खोलें
2. **Actions** tab
3. Latest workflow run
4. **Artifacts** section में `app-debug.apk` download करें

---

## 📲 Google Play Store Upload Guide

### Step 1: Play Console Account

**Create करें:**
```
https://play.google.com/console
```

**Cost:** $25 (one-time registration fee)

---

### Step 2: Create New App

1. **"Create app"** button click करें
2. **App details** fill करें:
   - App name: **PYQverse**
   - Default language: **English**
   - App or game: **App**
   - Free or paid: **Free**
   - Declarations: Check all boxes
3. **Create app** click करें

---

### Step 3: Store Listing

**Basic Information:**
- **App name**: PYQverse - AI Exam Prep
- **Short description** (80 chars):
  ```
  Master UPSC, JEE, NEET with AI-powered Previous Year Questions practice
  ```
- **Full description** (4000 chars):
  ```
  [Use content from /app/PLAYSTORE_LISTING.md]
  ```

**Graphics:**
- **App icon**: 512x512 PNG (transparent background)
- **Feature graphic**: 1024x500 PNG
- **Phone screenshots**: Minimum 2, recommend 8 (1080x1920)
- **Tablet screenshots**: Optional

**Categorization:**
- **App category**: Education
- **Tags**: exam, education, study, upsc, jee, neet

**Contact details:**
- **Email**: support@pyqverse.in
- **Website**: https://www.pyqverse.in
- **Privacy policy**: https://www.pyqverse.in/privacy

---

### Step 4: Upload APK/AAB

**Create Release:**
1. **Production** → **Create new release**
2. **Upload**: `app-release.apk` (या app-release.aab)
3. **Release name**: 1.0.0
4. **Release notes**:
   ```
   🎉 PYQverse Android Launch!
   
   ✨ Features:
   • AI-powered question generation
   • Instant doubt solver with camera
   • Offline mode with downloads
   • Multi-exam support (UPSC, JEE, NEET, etc.)
   • Analytics and performance tracking
   • Mock test generator
   
   🚀 Start your exam preparation journey!
   ```

---

### Step 5: Content Rating

**Questionnaire:**
1. **Category**: Education
2. **Violence**: No
3. **Sexual content**: No
4. **Language**: No profanity
5. **Controlled substances**: No
6. **User-generated content**: No

**Rating**: Everyone

---

### Step 6: Target Audience

- **Target age**: 13+ (or All ages)
- **Appeal to children**: No

---

### Step 7: Submit for Review

1. सभी sections complete करें (✅ green checkmarks)
2. **Send for review** click करें
3. Wait 1-7 days for approval

---

## 📊 APK vs AAB

### APK (Android Package)
- ✅ Simple
- ✅ Works everywhere
- ✅ Can distribute directly
- ❌ Larger file size

### AAB (Android App Bundle) - Recommended
- ✅ Smaller download size (Google optimizes)
- ✅ Required for new apps on Play Store
- ✅ Better performance
- ❌ Only works on Play Store

**To build AAB:**
```bash
cd android
./gradlew bundleRelease
```

**Output:**
```
android/app/build/outputs/bundle/release/app-release.aab
```

---

## 🔧 Troubleshooting

### Issue 1: "Android SDK not found"
**Solution**: Install Android Studio, यह automatically SDK install करेगा

### Issue 2: "Gradle build failed"
**Solution**:
```bash
cd android
./gradlew clean
./gradlew assembleDebug
```

### Issue 3: "Signing config not found"
**Solution**: Check `gradle.properties` में passwords correct हैं

### Issue 4: "APK too large"
**Solution**: AAB use करें या minifyEnabled true करें

---

## 📝 Quick Command Reference

```bash
# Build web assets
yarn build

# Sync to Android
yarn android:sync

# Open in Android Studio
yarn android:open

# Build debug APK
cd android && ./gradlew assembleDebug

# Build release APK
cd android && ./gradlew assembleRelease

# Build AAB
cd android && ./gradlew bundleRelease
```

---

## ✅ Checklist

### Before Building:
- [ ] Android Studio installed
- [ ] Project dependencies installed (`yarn install`)
- [ ] Web assets built (`yarn build`)
- [ ] Android synced (`yarn android:sync`)
- [ ] Signing key generated (for release)

### For Play Store:
- [ ] Release APK/AAB built
- [ ] APK signed with key
- [ ] Tested on device
- [ ] App icon ready (512x512)
- [ ] Screenshots ready (8 images)
- [ ] Feature graphic ready (1024x500)
- [ ] Store listing written
- [ ] Privacy policy live
- [ ] Play Console account created

---

**अब APK build कर सकते हो और Play Store पर upload कर सकते हो! 🚀**

Complete guide: `/app/PLAYSTORE_LISTING.md` देखें
