
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/analytics";

// Helper to get env variable from both Vite and React formats
const getEnvVar = (key: string, fallback: string): string => {
  // Check Vite format (import.meta.env)
  if (typeof import.meta !== 'undefined' && import.meta.env?.[`VITE_${key}`]) {
    return import.meta.env[`VITE_${key}`];
  }
  // Check React format (process.env)
  if (typeof process !== 'undefined' && process.env?.[`REACT_APP_${key}`]) {
    return process.env[`REACT_APP_${key}`];
  }
  // Fallback to hardcoded value
  return fallback;
};

const firebaseConfig = {
  apiKey: getEnvVar('FIREBASE_API_KEY', "AIzaSyDJ48kwjfVfIm6Pi7v8Kc4fgd_PzZilZwY"),
  authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN', "pyqverse-e83f9.firebaseapp.com"),
  projectId: getEnvVar('FIREBASE_PROJECT_ID', "pyqverse-e83f9"),
  storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET', "pyqverse-e83f9.firebasestorage.app"),
  messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID', "72744122276"),
  appId: getEnvVar('FIREBASE_APP_ID', "1:72744122276:web:a28a8c0bff44ef76563331"),
  measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID', "G-C8G91QQYCH")
};

// Initialize Firebase (Singleton Pattern)
// We use the existing app if it exists to prevent 'Firebase App named [DEFAULT] already exists' errors
const app = firebase.apps.length > 0 ? firebase.app() : firebase.initializeApp(firebaseConfig);

// Services
// Using app.auth() and app.firestore() is safer than firebase.auth() in modular/compat environments
const auth = app.auth();
const db = app.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Analytics (Conditional for environment)
let analytics: any = null;
if (typeof window !== 'undefined') {
  // Safe check for analytics support
  firebase.analytics.isSupported().then((yes) => {
      if (yes) analytics = firebase.analytics();
  }).catch(() => {});
}

export { app as firebase, auth, db, analytics, googleProvider };
export default app;
