// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database"; // Import Realtime Database

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAfR2ilodCVSSQbSz1HhYwREfXpbqLz6So",
  authDomain: "hand-cricket-b9e4c.firebaseapp.com",
  projectId: "hand-cricket-b9e4c",
  storageBucket: "hand-cricket-b9e4c.appspot.com", // Fixed typo (firebasestorage.app -> appspot.com)
  messagingSenderId: "879539357076",
  appId: "1:879539357076:web:57ebc670755d84277ffb81",
  measurementId: "G-MKBML2XEKW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app); // Initialize Realtime Database

export { database };
