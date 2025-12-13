import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyDJ48kwjfVfIm6Pi7v8Kc4fgd_PzZilZwY",
  authDomain: "pyqverse-e83f9.firebaseapp.com",
  projectId: "pyqverse-e83f9",
  storageBucket: "pyqverse-e83f9.firebasestorage.app",
  messagingSenderId: "72744122276",
  appId: "1:72744122276:web:a28a8c0bff44ef76563331",
  measurementId: "G-C8G91QQYCH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize App Check (Security)
if (typeof window !== "undefined") {
  // For localhost development, enable debug tokens
  if (location.hostname === "localhost") {
    // @ts-ignore
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  // ⚠️ PASTE YOUR SITE KEY BELOW (Replace the text inside quotes) ⚠️
  const SITE_KEY = "6LdbsyosAAAAAKfHrzy32xfo4C6tTy_RpBEqYgua";

  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });
    console.log("🛡️ App Check Initialized with Site Key");
  } catch (e) {
    console.warn("App Check failed to load. Did you paste the Site Key?", e);
  }
}

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);

let analytics: any = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch((err) => {
  console.log("Firebase Analytics not supported:", err);
});

const googleProvider = new GoogleAuthProvider();

export { app, auth, db, analytics, googleProvider };
export default app;