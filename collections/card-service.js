import { 
  doc, 
  setDoc, 
  updateDoc, 
  collection, 
  onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./app-firebase.js";

const COLLECTION_NAME = "goods_cards";

function createDefaultCardData(cardId, cardName, collectionName, rarity, referenceImageUrl) {
  return {
    card_id: cardId,
    card_name: cardName,
    collection_name: collectionName,
    rarity: rarity,
    reference_image_url: referenceImageUrl,
    is_owned: false,
    obtained_method: null,
    user_note: "",
    real_photo_url: "",
    local_photo_uri: "",
    need_sync_photo: false,
    updated_at: null
  };
}

async function initializeCard(cardId, cardName, collectionName, rarity, referenceImageUrl) {
  const cardRef = doc(db, COLLECTION_NAME, cardId);
  const cardData = createDefaultCardData(cardId, cardName, collectionName, rarity, referenceImageUrl);
  await setDoc(cardRef, cardData, { merge: true });
}

function subscribeToCards(onUpdate) {
  const cardsCollection = collection(db, COLLECTION_NAME);
  return onSnapshot(cardsCollection, (snapshot) => {
    const cards = [];
    snapshot.forEach((doc) => {
      cards.push(doc.data());
    });
    onUpdate(cards);
  });
}

async function updateCardOwnership(cardId, method) {
  const cardRef = doc(db, COLLECTION_NAME, cardId);
  await updateDoc(cardRef, {
    is_owned: true,
    obtained_method: method,
    updated_at: new Date().toISOString()
  });
}

async function updateCardDetails(cardId, note, localPhotoUri) {
  const cardRef = doc(db, COLLECTION_NAME, cardId);
  const updateData = {
    user_note: note,
    updated_at: new Date().toISOString()
  };
  
  if (localPhotoUri) {
    updateData.local_photo_uri = localPhotoUri;
    updateData.need_sync_photo = true;
  }
  
  await updateDoc(cardRef, updateData);
}

export { 
  initializeCard, 
  subscribeToCards, 
  updateCardOwnership, 
  updateCardDetails 
};