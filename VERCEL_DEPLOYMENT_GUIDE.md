# 🚀 PYQverse - Vercel Deployment Guide

## ✅ आपका Setup पहले से Ready है!

आपका domain **www.pyqverse.in** पहले से Vercel पर configured है। अब बस नया version deploy करना है।

---

## 📋 Pre-Deployment Checklist

### ✅ Already Done:
- [x] Domain configured: www.pyqverse.in
- [x] Vercel account setup
- [x] vercel.json configured
- [x] Build scripts ready
- [x] Environment variables template created

### ⚠️ Todo Before Deployment:
- [ ] Add environment variables to Vercel
- [ ] Test build locally
- [ ] Commit code to Git
- [ ] Deploy via Vercel CLI or Dashboard

---

## 🚀 Option 1: Vercel Dashboard से Deploy (आसान तरीका)

### Step 1: Code को Git Repository में Push करें

```bash
# अगर git initialized नहीं है
cd /app
git init
git add .
git commit -m "PYQverse Android + Web ready for deployment"

# अपने GitHub repository में push करें
git remote add origin https://github.com/YOUR_USERNAME/pyqverse.git
git push -u origin main
```

### Step 2: Vercel Dashboard में जाएं

1. **Login करें**: https://vercel.com
2. **"Add New Project"** पर click करें
3. **Import Git Repository** - अपना GitHub repo select करें
4. **Project Settings**:
   - Framework Preset: **Vite**
   - Build Command: `yarn build`
   - Output Directory: `dist`
   - Install Command: `yarn install`

### Step 3: Environment Variables Add करें

Vercel Dashboard में "Environment Variables" section में जाकर ये add करें:

```bash
# API Keys
API_KEY=AIzaSyCOGUM81Ex7pU_-QSFPgx3bdo_eQDAAfj0
GEMINI_API_KEY=AIzaSyCOGUM81Ex7pU_-QSFPgx3bdo_eQDAAfj0
GROQ_API_KEY=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
NEXT_PUBLIC_API_KEY=AIzaSyCOGUM81Ex7pU_-QSFPgx3bdo_eQDAAfj0

# App Configuration
APP_DOMAIN=https://www.pyqverse.in
NODE_ENV=production

# Firebase Configuration
VITE_FIREBASE_API_KEY=AIzaSyDJ48kwjfVfIm6Pi7v8Kc4fgd_PzZilZwY
VITE_FIREBASE_AUTH_DOMAIN=pyqverse-e83f9.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=pyqverse-e83f9
VITE_FIREBASE_STORAGE_BUCKET=pyqverse-e83f9.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=72744122276
VITE_FIREBASE_APP_ID=1:72744122276:web:a28a8c0bff44ef76563331
VITE_FIREBASE_MEASUREMENT_ID=G-C8G91QQYCH
```

### Step 4: Domain Configure करें

1. **Project Settings** → **Domains**
2. **www.pyqverse.in** already configured होगा
3. अगर नहीं है तो:
   - "Add Domain" click करें
   - `www.pyqverse.in` type करें
   - DNS records verify करें

### Step 5: Deploy करें!

**"Deploy"** button पर click करें और wait करें (2-3 minutes)।

---

## 🚀 Option 2: Vercel CLI से Deploy (Fast तरीका)

### Step 1: Vercel CLI Install करें

```bash
npm install -g vercel
```

### Step 2: Vercel में Login करें

```bash
vercel login
```

### Step 3: Project Link करें

```bash
cd /app
vercel link
```

Follow prompts:
- Select your team/account
- Link to existing project? **Yes**
- Project name: **pyqverse** (या जो भी name है)

### Step 4: Environment Variables Set करें

```bash
# Production environment variables
vercel env add API_KEY production
vercel env add GEMINI_API_KEY production
vercel env add GROQ_API_KEY production
vercel env add VITE_FIREBASE_API_KEY production
vercel env add VITE_FIREBASE_AUTH_DOMAIN production
vercel env add VITE_FIREBASE_PROJECT_ID production
vercel env add VITE_FIREBASE_STORAGE_BUCKET production
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID production
vercel env add VITE_FIREBASE_APP_ID production
vercel env add VITE_FIREBASE_MEASUREMENT_ID production

# या एक साथ .env file से
vercel env pull .env.production
```

### Step 5: Deploy करें!

```bash
# Production deployment
vercel --prod
```

यह automatically:
- ✅ Code build करेगा
- ✅ www.pyqverse.in पर deploy करेगा
- ✅ SSL certificate configure करेगा
- ✅ CDN setup करेगा

---

## 🔧 Local Build Test (Deploy से पहले)

```bash
cd /app

# Build test
yarn build

# अगर error आए तो fix करें
# कोई error नहीं? Perfect! ✅

# Preview test
yarn preview

# Browser में check करें: http://localhost:3000
```

---

## 📊 Deployment के बाद Verify करें

### 1. Website Check करें
```
https://www.pyqverse.in
```

### 2. Test करें:
- ✅ Homepage load हो रहा है?
- ✅ Login/Signup काम कर रहा है?
- ✅ Practice questions load हो रहे हैं?
- ✅ Doubt solver काम कर रहा है?
- ✅ Analytics show हो रहा है?
- ✅ All animations smooth हैं?

### 3. API Endpoints Check करें
```
https://www.pyqverse.in/api/health
```

Expected response:
```json
{
  "status": "online",
  "environment": "production",
  "env": {
    "gemini": "Active",
    "groq": "Active"
  }
}
```

---

## 🔐 Security Checklist (Vercel पर)

### Environment Variables
- ✅ सभी API keys environment variables में हैं (code में नहीं)
- ✅ Firebase keys properly configured
- ✅ CORS properly set
- ✅ Security headers added

### Domain & SSL
- ✅ HTTPS enabled (automatic with Vercel)
- ✅ SSL certificate (automatic)
- ✅ www redirect configured

---

## 🚨 Common Issues & Solutions

### Issue 1: Build Fails
```bash
# Check build locally first
cd /app
yarn build

# Fix any errors before deploying
```

### Issue 2: Environment Variables Not Working
```bash
# Vercel Dashboard में check करें:
# Settings → Environment Variables
# सभी variables VITE_ prefix के साथ हों (frontend के लिए)
```

### Issue 3: API Not Working
```bash
# vercel.json में API routing check करें
# /api/* routes properly configured होने चाहिए
```

### Issue 4: Firebase Connection Issues
```bash
# Firebase config में domain add करें:
# Firebase Console → Project Settings → Authorized Domains
# Add: www.pyqverse.in
```

### Issue 5: 404 Errors on Routes
```bash
# vercel.json में rewrites check करें
# SPA routing के लिए properly configured है ✅
```

---

## 📱 Android App + Web का Coordination

### Backend API URL
Android app और web app दोनों same API use करेंगे:

**Production**:
```
https://www.pyqverse.in/api/*
```

### Android App में Update करें
```typescript
// capacitor.config.ts
server: {
  androidScheme: 'https',
  hostname: 'www.pyqverse.in'
}
```

---

## 🔄 Update Deployment Process

### Future Updates Deploy करने के लिए:

**Method 1: Git Push (Automatic)**
```bash
git add .
git commit -m "Update description"
git push origin main
```
Vercel automatically detect करके deploy कर देगा! ✅

**Method 2: Vercel CLI**
```bash
cd /app
vercel --prod
```

---

## 📊 Vercel Dashboard Features

### Analytics
- **Real-time visitors**
- **Page views**
- **Performance metrics**
- **Error tracking**

### Logs
- **Build logs**: Deployment issues debug करने के लिए
- **Function logs**: API errors track करने के लिए
- **Edge logs**: Request/response monitoring

### Monitoring
- **Uptime monitoring**
- **Performance insights**
- **Bandwidth usage**

---

## 💰 Vercel Pricing (आपके Use Case के लिए)

### Hobby Plan (Free)
- ✅ Unlimited deployments
- ✅ SSL certificate
- ✅ 100GB bandwidth/month
- ✅ Serverless functions
- ⚠️ No commercial use

### Pro Plan ($20/month)
- ✅ Commercial use allowed
- ✅ 1TB bandwidth/month
- ✅ Advanced analytics
- ✅ Password protection
- ✅ Better support

**Recommendation**: Pro plan लें अगर यह commercial app है।

---

## 🎯 Deployment Checklist

### Before Deployment
- [ ] Local build test successful
- [ ] All features working locally
- [ ] Environment variables ready
- [ ] Git repository ready
- [ ] Domain DNS configured

### During Deployment
- [ ] Code pushed to Git
- [ ] Vercel project created/linked
- [ ] Environment variables added
- [ ] Domain configured
- [ ] Deploy initiated

### After Deployment
- [ ] Website accessible at www.pyqverse.in
- [ ] All pages loading correctly
- [ ] API endpoints working
- [ ] Firebase authentication working
- [ ] Analytics tracking
- [ ] Mobile responsiveness verified

---

## 📞 Support & Resources

### Vercel Documentation
- Deployment: https://vercel.com/docs/deployments
- Environment Variables: https://vercel.com/docs/environment-variables
- Custom Domains: https://vercel.com/docs/custom-domains

### PYQverse Documentation
- Build Guide: `/app/ANDROID_BUILD_GUIDE.md`
- API Documentation: `/app/api/index.js`
- Deployment Health: `/app/DEPLOYMENT_HEALTH_REPORT.md`

---

## 🎉 Quick Deploy Commands

```bash
# Complete deployment in 3 commands
cd /app
git push origin main          # Push to Git
vercel --prod                 # Deploy to Vercel

# या Dashboard से:
# 1. Git push
# 2. Vercel auto-deploys! ✅
```

---

## ✅ Final Checklist

- [ ] Code committed to Git
- [ ] Environment variables in Vercel
- [ ] Domain www.pyqverse.in configured
- [ ] Build successful
- [ ] Deployed to production
- [ ] Website accessible
- [ ] All features tested
- [ ] Analytics setup
- [ ] Monitoring active

---

**अब Deploy करने के लिए ready हैं! 🚀**

Choose:
- **Option 1**: Vercel Dashboard (GUI, आसान)
- **Option 2**: Vercel CLI (Terminal, fast)

दोनों में से कोई भी choose करें और deploy करें!
