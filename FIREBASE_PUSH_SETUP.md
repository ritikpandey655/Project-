# Firebase Setup for Android Push Notifications

## Overview
PYQverse Android app requires Firebase Cloud Messaging (FCM) for push notifications.

## Steps to Enable Push Notifications

### 1. Go to Firebase Console
Visit: https://console.firebase.google.com/project/pyqverse-e83f9

### 2. Add Android App
1. Click on "Add App" or the Android icon
2. Enter Android package name: `in.pyqverse.app`
3. Enter App nickname: PYQverse Android
4. Click "Register app"

### 3. Download google-services.json
1. After registering, download the `google-services.json` file
2. Place it in: `/app/android/app/google-services.json`
   ```bash
   cp ~/Downloads/google-services.json /app/android/app/
   ```

### 4. Verify File Location
```bash
ls -la /app/android/app/google-services.json
```

### 5. Rebuild the App
```bash
cd /app
yarn build
yarn android:sync
```

### 6. Test Push Notifications
Open Android Studio and run the app. Check logs for FCM token:
```
Push registration success, token: [YOUR_FCM_TOKEN]
```

## Sending Test Notifications

### From Firebase Console
1. Go to Firebase Console > Cloud Messaging
2. Click "Send your first message"
3. Enter notification title and text
4. Select your app (in.pyqverse.app)
5. Send test message

### From Backend (Node.js)
```javascript
const admin = require('firebase-admin');

// Initialize with service account
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Send notification
const message = {
  notification: {
    title: 'PYQverse Daily Challenge',
    body: 'Your daily practice set is ready!'
  },
  token: userFcmToken
};

admin.messaging().send(message);
```

## Notification Types for PYQverse

### 1. Daily Practice Reminder
```javascript
{
  title: "Time to Practice! 📚",
  body: "Your daily streak is waiting. Let's keep it going!"
}
```

### 2. Exam Alert
```javascript
{
  title: "🎯 UPSC Prelims Alert",
  body: "Only 30 days left! Practice 50 questions today."
}
```

### 3. Achievement Unlocked
```javascript
{
  title: "🏆 Achievement Unlocked!",
  body: "You've solved 100 questions! Keep it up!"
}
```

### 4. Current Affairs Update
```javascript
{
  title: "📰 Today's Current Affairs",
  body: "5 new important topics added. Check now!"
}
```

## Integration with App Features

### Save FCM Token to Firestore
Token is automatically saved when user logs in:
```typescript
// In capacitorInit.ts (already implemented)
PushNotifications.addListener('registration', token => {
  Preferences.set({ key: 'fcm_token', value: token.value });
  // Also save to Firestore user document
  firebase.firestore().collection('users').doc(userId).update({
    fcmToken: token.value
  });
});
```

### Handle Notification Click
```typescript
PushNotifications.addListener('pushNotificationActionPerformed', notification => {
  const data = notification.notification.data;
  
  // Navigate based on notification type
  if (data.type === 'practice') {
    navigate('practice');
  } else if (data.type === 'currentAffairs') {
    navigate('currentAffairs');
  }
});
```

## Notification Scheduling (Optional)
Use Firebase Cloud Functions to schedule daily reminders:

```javascript
exports.sendDailyReminder = functions.pubsub
  .schedule('every day 09:00')
  .timeZone('Asia/Kolkata')
  .onRun(async (context) => {
    const users = await admin.firestore().collection('users').get();
    
    users.forEach(async (user) => {
      const fcmToken = user.data().fcmToken;
      if (fcmToken) {
        await admin.messaging().send({
          notification: {
            title: 'Good Morning! 🌅',
            body: 'Start your day with 10 practice questions'
          },
          token: fcmToken
        });
      }
    });
  });
```

## Troubleshooting

### Token Not Received
1. Check AndroidManifest.xml has `POST_NOTIFICATIONS` permission
2. Verify google-services.json is in correct location
3. Clean and rebuild: `cd android && ./gradlew clean`

### Notifications Not Showing
1. Check device settings > App > Notifications enabled
2. Test with Firebase Console test message
3. Check logcat for errors

### Build Fails
If you see "google-services.json not found":
1. Ensure file is at `/app/android/app/google-services.json`
2. Not in `/app/android/google-services.json` (wrong location)
3. Sync again: `yarn android:sync`

## Important Notes
- ✅ FCM token changes on app reinstall
- ✅ Always save latest token to Firestore
- ✅ Handle token refresh in production
- ✅ Test on real device (emulator may have issues)

## Status
- [x] Firebase SDK integrated
- [x] Push notification listeners added
- [x] Token storage implemented
- [ ] **TODO**: Download google-services.json from Firebase Console
- [ ] **TODO**: Test notifications on device

---

**Once google-services.json is added, rebuild the app and push notifications will work!**
