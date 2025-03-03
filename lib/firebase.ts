// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDcef9zNK_4t7RIgghpAnanc048HKg1mZw",
  authDomain: "hand-cricket-7cf10.firebaseapp.com",
  projectId: "hand-cricket-7cf10",
  storageBucket: "hand-cricket-7cf10.firebasestorage.app",
  messagingSenderId: "15004749703",
  appId: "1:15004749703:web:228439259e01f5af8ecd22",
  measurementId: "G-4DRTDR2LJS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getAnalytics(app);

export { database };