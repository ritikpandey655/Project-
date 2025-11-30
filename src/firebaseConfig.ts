import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDJ48kwjfVfIm6Pi7v8Kc4fgd_PzZilZwY",
  authDomain: "pyqverse-e83f9.firebaseapp.com",
  projectId: "pyqverse-e83f9",
  storageBucket: "pyqverse-e83f9.firebasestorage.app",
  messagingSenderId: "72744122276",
  appId: "1:72744122276:web:a28a8c0bff44ef76563331",
  measurementId: "G-C8G91QQYCH"
};

const firebaseApp: any = firebase;
const app = !firebaseApp.apps.length ? firebaseApp.initializeApp(firebaseConfig) : firebaseApp.app();

export const auth = firebaseApp.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();

// Initialize Firestore with modern persistence settings to prevent deprecation warnings
initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const db = firebaseApp.firestore();

export default firebaseApp;