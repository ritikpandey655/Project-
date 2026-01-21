# 🔄 Vercel Manual Redeploy Guide (Step-by-Step)

## विधि 1: Vercel Dashboard से Manual Redeploy

### Step 1: Vercel Dashboard खोलें
```
https://vercel.com/dashboard
```

1. अपने browser में जाएं
2. Vercel login करें
3. Dashboard खुल जाएगा

---

### Step 2: अपना Project Select करें

1. Dashboard पर **"PYQverse"** project दिखेगा
2. Project card पर **click** करें
3. Project overview page खुलेगा

---

### Step 3: Deployments Tab में जाएं

1. Top में tabs दिखेंगे: **Overview | Deployments | Analytics | Logs | Settings**
2. **"Deployments"** tab पर click करें
3. सभी deployments की list दिखेगी

---

### Step 4: Failed Deployment Select करें

1. List में सबसे ऊपर **latest deployment** होगा
2. Status दिखेगा:
   - ✅ **Ready** (green) - successful
   - ❌ **Failed** (red) - failed
   - 🔄 **Building** (yellow) - in progress

3. **Failed** deployment पर click करें

---

### Step 5: Three Dots Menu खोलें

1. Deployment details page खुलेगा
2. Top right corner में **"..."** (three dots) button दिखेगा
3. Three dots button पर **click** करें
4. Dropdown menu खुलेगा

---

### Step 6: Redeploy Option Select करें

Dropdown menu में options दिखेंगे:
- ✅ **Redeploy** ← इसे select करें
- Instant Rollback
- Download Deployment
- Delete Deployment

**"Redeploy"** पर click करें

---

### Step 7: Confirm Redeploy

1. Confirmation popup खुलेगा:
   ```
   "Are you sure you want to redeploy?"
   ```

2. **"Redeploy"** button पर click करें (confirm)

---

### Step 8: Build Monitor करें

1. नया deployment automatically start हो जाएगा
2. Status: **Building** दिखेगा
3. Real-time build logs दिखेंगे

**Build Logs देखने के लिए**:
- **"Building"** status पर click करें
- **"Build Logs"** tab open करें
- Live logs stream होंगे

---

### Step 9: Wait for Completion

Build process में 2-3 minutes लगते हैं:

```
⏳ Installing dependencies... (~1 min)
⏳ Building application... (~1-2 min)
⏳ Uploading... (~30 sec)
✅ Deployment Ready!
```

---

### Step 10: Verify Success

**Success होने पर**:
- Status: ✅ **Ready** (green)
- URL: **Visit** button दिखेगा
- Domain: www.pyqverse.in live होगा

**Click करें**:
- **"Visit"** button पर click करें
- या directly: https://www.pyqverse.in

---

## विधि 2: Environment Variables Add करके Auto-Redeploy

अगर environment variables missing हैं:

### Step 1: Settings में जाएं

1. Project page पर **"Settings"** tab click करें
2. Left sidebar में **"Environment Variables"** click करें

---

### Step 2: Variables Add करें

1. **"Add New"** button click करें
2. **Key** field में variable name डालें (जैसे: `VITE_FIREBASE_API_KEY`)
3. **Value** field में value डालें
4. **Environment** select करें: **Production** ✅
5. **"Save"** click करें

**सभी variables add करें**:
```
VITE_FIREBASE_API_KEY=AIzaSyDJ48kwjfVfIm6Pi7v8Kc4fgd_PzZilZwY
VITE_FIREBASE_AUTH_DOMAIN=pyqverse-e83f9.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=pyqverse-e83f9
VITE_FIREBASE_STORAGE_BUCKET=pyqverse-e83f9.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=72744122276
VITE_FIREBASE_APP_ID=1:72744122276:web:a28a8c0bff44ef76563331
VITE_FIREBASE_MEASUREMENT_ID=G-C8G91QQYCH
API_KEY=AIzaSyCOGUM81Ex7pU_-QSFPgx3bdo_eQDAAfj0
GEMINI_API_KEY=AIzaSyCOGUM81Ex7pU_-QSFPgx3bdo_eQDAAfj0
GROQ_API_KEY=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
APP_DOMAIN=https://www.pyqverse.in
```

---

### Step 3: Redeploy (अब विधि 1 follow करें)

Variables add करने के बाद:
1. **Deployments** tab में जाएं
2. Failed deployment select करें
3. Three dots → **Redeploy**
4. Confirm करें

---

## विधि 3: New Commit Push करके Auto-Deploy

सबसे आसान तरीका:

### Step 1: Emergent में Code Update करें

कोई भी छोटा change करें (test के लिए):
```
README.md में कुछ add करें
या
कोई comment add करें
```

---

### Step 2: Save to GitHub

1. Emergent में **"Save to GitHub"** button click करें
2. Repository: **pyqverse** select करें
3. Branch: **main** select करें
4. **"Push to GitHub"** click करें

---

### Step 3: Auto-Deploy होगा

GitHub पर push होते ही:
- Vercel automatically detect करेगा
- New deployment start होगा
- 2-3 minutes में live!

---

## 🔍 Build Logs कैसे देखें?

अगर फिर से fail हो:

### Step 1: Deployments → Failed Deployment

1. **Deployments** tab खोलें
2. Failed deployment पर click करें

---

### Step 2: Build Logs Tab

1. Top में tabs में से **"Build Logs"** click करें
2. पूरा log दिखेगा

---

### Step 3: Error ढूंढें

Logs में search करें:
- ❌ **"Error"**
- ❌ **"Failed"**
- ❌ **"not defined"**
- ❌ **"Module not found"**

**Common Error**:
```
Error: VITE_FIREBASE_API_KEY is not defined
```

**Solution**: Environment variable add करें (विधि 2)

---

## ✅ Quick Summary

### Manual Redeploy Steps:
```
1. Vercel Dashboard खोलें
2. PYQverse project select करें
3. Deployments tab → Failed deployment
4. Three dots (...) → Redeploy
5. Confirm → Wait 2-3 mins
6. Visit website ✅
```

### If Environment Variables Missing:
```
1. Settings → Environment Variables
2. Add all 11 variables (list above)
3. Deployments → Redeploy
4. Success! ✅
```

---

## 🎯 Expected Result

**Successful Deployment**:
```
Status: ✅ Ready
Domain: www.pyqverse.in
Visit: Click to open website
```

**Visit करने पर**:
- Homepage load होगा
- सभी features काम करेंगे
- Login/signup working
- Practice questions loading

---

## 🚨 अगर फिर भी Fail हो?

### Check Build Logs:
```
Deployments → Failed → Build Logs tab
```

### Common Issues:

1. **"Environment variable not defined"**
   → Add missing variable in Settings

2. **"Build command failed"**
   → Check TypeScript errors

3. **"Module not found"**
   → Check if dependency in package.json

4. **"Out of memory"**
   → Settings → General → Node.js 20.x

---

## 💡 Pro Tips

1. **Always check Build Logs first** - Exact error बताता है

2. **Environment Variables critical हैं** - सबसे पहले यही add करें

3. **Auto-deploy best है** - GitHub push → automatic deploy

4. **Instant Rollback available** - अगर new deployment fail हो
   - Three dots → Instant Rollback
   - पुराने working version पर वापस जाएं

---

**अब manually redeploy कर सकते हैं! 🚀**
