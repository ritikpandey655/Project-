
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/analytics";

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
