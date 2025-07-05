// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBtpLSSNBj9lHtzibLh5QSRAPg3iQ46Q3g",
  authDomain: "tcct-minigames.firebaseapp.com",
  databaseURL: "https://tcct-minigames-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "tcct-minigames",
  storageBucket: "tcct-minigames.firebasestorage.app",
  messagingSenderId: "604780847536",
  appId: "1:604780847536:web:f8015bde5ef469b04c7675",
  measurementId: "G-1GGDZR6VY5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };
