import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyBXH7JgXIWzi9RiePl8CW0Fucr-mv7R9xM",
  authDomain: "hand-cricket-multiplayer.firebaseapp.com",
  databaseURL: "https://hand-cricket-multiplayer-default-rtdb.firebaseio.com",
  projectId: "hand-cricket-multiplayer",
  storageBucket: "hand-cricket-multiplayer.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:1234567890abcdef123456"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export { database };