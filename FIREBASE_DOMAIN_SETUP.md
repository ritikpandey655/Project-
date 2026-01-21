# Firebase Domain Configuration for www.pyqverse.in

## ⚠️ Important: Deploy से पहले Firebase में Domain Add करें

### क्यों जरूरी है?
Firebase Authentication केवल authorized domains से ही requests accept करता है। अगर domain add नहीं किया तो login/signup काम नहीं करेगा।

---

## 🔧 Step-by-Step Guide

### Step 1: Firebase Console में जाएं
```
https://console.firebase.google.com/project/pyqverse-e83f9
```

### Step 2: Authentication Settings
1. Left sidebar में **"Authentication"** पर click करें
2. Top में **"Settings"** tab पर click करें
3. Scroll down to **"Authorized domains"** section

### Step 3: Domain Add करें
1. **"Add domain"** button पर click करें
2. Type करें: `www.pyqverse.in`
3. **"Add"** पर click करें

### Step 4: Verify करें
अब आपकी Authorized domains list में होना चाहिए:
```
✅ localhost (already there)
✅ pyqverse-e83f9.firebaseapp.com (already there)
✅ www.pyqverse.in (newly added)
```

---

## 🎯 Testing After Deployment

### Test Login Flow:
1. Website खोलें: https://www.pyqverse.in
2. Login/Signup button click करें
3. Google sign-in काम करना चाहिए ✅

### अगर Error आए:
```
Error: This domain is not authorized for OAuth operations
```

**Solution**: Firebase Console में domain properly add करें (ऊपर steps follow करें)

---

## 📝 Additional Firebase Settings

### Google Sign-In Configuration
1. **Authentication** → **Sign-in method**
2. **Google** provider enabled होना चाहिए ✅
3. **Authorized domains** में www.pyqverse.in add होना चाहिए ✅

### Project Settings
1. **Project Settings** (gear icon)
2. **General** tab
3. **Your apps** section में web app होना चाहिए
4. Firebase config values match करें (already in code)

---

## ✅ Verification Checklist

- [ ] Firebase Console में login किया
- [ ] Authentication → Settings → Authorized domains
- [ ] www.pyqverse.in added
- [ ] Google Sign-in enabled
- [ ] Domain verified

---

**यह setup करने के बाद ही Vercel पर deploy करें!**
