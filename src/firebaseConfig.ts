import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

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

// Initialize Services
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Initialize Analytics conditionally
let analytics = null;
isSupported().then(yes => {
  if (yes) analytics = getAnalytics(app);
});

export { app, auth, db, analytics, googleProvider };
export default app;