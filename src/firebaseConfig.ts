
import firebase from "firebase/app";
import "firebase/auth";
import "firebase/firestore";

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
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

export const auth = firebase.auth();
export const googleProvider = new firebase.auth.GoogleAuthProvider();
export const db = firebase.firestore();
