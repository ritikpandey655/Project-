import { initializeApp } from "firebase/app";
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

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// App Check has been removed to resolve auth/internal-error during development.
// This is a common issue if ReCaptcha Enterprise is not fully configured.
// For production, App Check should be re-enabled with a properly configured provider.

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
