
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/analytics";
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
const app = firebase.initializeApp(firebaseConfig);

// Auth & Analytics (Compat)
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

let analytics: any = null;
if (typeof window !== 'undefined') {
  try {
     analytics = firebase.analytics();
  } catch(e) {
     console.log("Firebase Analytics failed:", e);
  }
}

// Firestore (Modular - required for storageService compatibility)
const db = getFirestore(app);

export { app, auth, db, analytics, googleProvider };
export default app;
