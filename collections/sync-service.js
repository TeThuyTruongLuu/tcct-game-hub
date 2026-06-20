import { 
  collection, 
  getDocs, 
  query, 
  where, 
  doc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { db, storage } from "./app-firebase.js";

const COLLECTION_NAME = "goods_cards";

async function runBackgroundPhotoSync() {
  if (navigator.connection && navigator.connection.type === "none") {
    return;
  }

  const syncQuery = query(
    collection(db, COLLECTION_NAME), 
    where("need_sync_photo", "==", true)
  );
  
  try {
    const querySnapshot = await getDocs(syncQuery);
    
    for (const cardDoc of querySnapshot.docs) {
      const cardData = cardDoc.data();
      await uploadLocalPhotoToStorage(cardData);
    }
  } catch (error) {
    document.dispatchEvent(new CustomEvent("syncError", { detail: error }));
  }
}

async function uploadLocalPhotoToStorage(cardData) {
  try {
    const response = await fetch(cardData.local_photo_uri);
    const blob = await response.blob();
    
    const storageRef = ref(storage, `real_photos/${cardData.card_id}.jpg`);
    await uploadBytes(storageRef, blob);
    
    const downloadUrl = await getDownloadURL(storageRef);
    
    const cardRef = doc(db, COLLECTION_NAME, cardData.card_id);
    await updateDoc(cardRef, {
      real_photo_url: downloadUrl,
      need_sync_photo: false,
      updated_at: new Date().toISOString()
    });
  } catch (error) {
    throw error;
  }
}

function initializeSyncListener() {
  document.addEventListener("online", runBackgroundPhotoSync, false);
  runBackgroundPhotoSync();
}

export { initializeSyncListener };