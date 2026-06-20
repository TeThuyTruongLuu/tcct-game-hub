import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyB8VV4gk1Hl7u8dtNWevdj1lvqZEuDAfrc",
  authDomain: "tcct-storage.firebaseapp.com",
  projectId: "tcct-storage",
  storageBucket: "tcct-storage.firebasestorage.app",
  messagingSenderId: "480838528645",
  appId: "1:480838528645:web:d13d12ba5ab0aedaf183ec",
  measurementId: "G-HQ7F9XXP5W"
};

const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

const storage = getStorage(app);

export { db, storage };