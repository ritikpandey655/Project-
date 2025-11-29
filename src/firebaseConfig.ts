
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDJ48kwjfVfIm6Pi7v8Kc4fgd_PzZilZwY",
  authDomain: "pyqverse-e83f9.firebaseapp.com",
  projectId: "pyqverse-e83f9",
  storageBucket: "pyqverse-e83f9.firebasestorage.app",
  messagingSenderId: "72744122276",
  appId: "1:72744122276:web:a28a8c0bff44ef76563331",
  measurementId: "G-C8G91QQYCH"
};

// Initialize Firebase with explicit any cast to avoid TS strict type errors with compat
const firebaseApp: any = firebase;
const app = !firebaseApp.apps.length ? firebaseApp.initializeApp(firebaseConfig) : firebaseApp.app();

export const auth = firebaseApp.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

export const db = firebaseApp.firestore();

// Enable offline persistence (Compat Mode - Stable)
try {
  db.enablePersistence({ synchronizeTabs: true });
} catch (err: any) {
  if (err.code === 'failed-precondition') {
    console.warn("Persistence failed: Multiple tabs open.");
  } else if (err.code === 'unimplemented') {
    console.warn("Persistence not supported by browser.");
  }
}

export default firebaseApp;