
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyDJ48kwjfVfIm6Pi7v8Kc4fgd_PzZilZwY",
  authDomain: "pyqverse-e83f9.firebaseapp.com",
  projectId: "pyqverse-e83f9",
  storageBucket: "pyqverse-e83f9.firebasestorage.app",
  messagingSenderId: "72744122276",
  appId: "1:72744122276:web:a28a8c0bff44ef76563331",
  measurementId: "G-C8G91QQYCH"
};

// Initialize Firebase (Singleton Pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Services
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Analytics (Conditional for environment)
let analytics = null;
isSupported().then((yes) => {
    if (yes) analytics = getAnalytics(app);
});

export { app as firebase, auth, db, analytics, googleProvider };
export default app;
