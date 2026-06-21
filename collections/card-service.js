import { 
  doc, 
  setDoc, 
  collection, 
  onSnapshot,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { db } from "./app-firebase.js";

const GLOBAL_CARDS_COLLECTION = "goods_cards";
const USER_COLLECTIONS = "user_collections";

function getCurrentUsername() {
  const username = localStorage.getItem("username");
  return username ? username.trim() : "anonymous_user";
}

function subscribeToCards(onUpdate) {
  const username = getCurrentUsername();
  
  const globalCollectionRef = collection(db, GLOBAL_CARDS_COLLECTION);
  const userCardsCollectionRef = collection(db, USER_COLLECTIONS, username, "cards");
  const userDocRef = doc(db, USER_COLLECTIONS, username);

  let globalCards = [];
  let userCardsMap = {};
  let hiddenCollections = [];

  const combineAndEmit = () => {
    if (globalCards.length === 0) {
      onUpdate([]);
      return;
    }

    const finalCards = globalCards.map(globalCard => {
      const userData = userCardsMap[globalCard.card_id] || {};
      let originalCollection = globalCard.collection_name || "Khác";
      let normalizedCollection = originalCollection.replace(/ ❯ /g, " > ");
      
      return {
        ...globalCard,
        collection_name: normalizedCollection,
        is_owned: userData.is_owned ?? false,
        obtained_method: userData.obtained_method ?? null,
        user_note: userData.user_note ?? "",
        real_photo_url: userData.real_photo_url ?? "",
        local_photo_uri: userData.local_photo_uri ?? "",
        need_sync_photo: userData.need_sync_photo ?? false,
        updated_at: userData.updated_at ?? null,
        is_hidden: userData.is_hidden ?? false,
        is_wishlist: userData.is_wishlist ?? false,
        is_collection_hidden: hiddenCollections.includes(normalizedCollection)
      };
    });

    onUpdate(finalCards);
  };

  const unsubscribeGlobal = onSnapshot(globalCollectionRef, (snapshot) => {
    globalCards = [];
    snapshot.forEach((doc) => {
      globalCards.push(doc.data());
    });
    combineAndEmit();
  });

  const unsubscribeUserCards = onSnapshot(userCardsCollectionRef, (snapshot) => {
    userCardsMap = {};
    snapshot.forEach((doc) => {
      userCardsMap[doc.id] = doc.data();
    });
    combineAndEmit();
  });
  
  const unsubscribeUserDoc = onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists() && docSnap.data().hidden_collections) {
      hiddenCollections = docSnap.data().hidden_collections;
    } else {
      hiddenCollections = [];
    }
    combineAndEmit();
  });

  return () => {
    unsubscribeGlobal();
    unsubscribeUserCards();
    unsubscribeUserDoc();
  };
}

async function updateCardOwnership(cardId, method) {
  const username = getCurrentUsername();
  const userCardRef = doc(db, USER_COLLECTIONS, username, "cards", cardId);
  
  await setDoc(userCardRef, {
    is_owned: true,
    obtained_method: method,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

async function updateCardDetails(cardId, note, localPhotoUri) {
  const username = getCurrentUsername();
  const userCardRef = doc(db, USER_COLLECTIONS, username, "cards", cardId);
  
  const updateData = {
    user_note: note,
    updated_at: new Date().toISOString()
  };
  
  if (localPhotoUri) {
    updateData.local_photo_uri = localPhotoUri;
    updateData.need_sync_photo = true;
  }
  
  await setDoc(userCardRef, updateData, { merge: true });
}

async function removeCardOwnership(cardId) {
  const username = getCurrentUsername();
  const userCardRef = doc(db, USER_COLLECTIONS, username, "cards", cardId);
  
  await setDoc(userCardRef, {
    is_owned: false,
    obtained_method: null,
    user_note: "",
    real_photo_url: "",
    local_photo_uri: "",
    need_sync_photo: false,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

async function toggleWishlistStatus(cardId, currentStatus) {
  const username = getCurrentUsername();
  const userCardRef = doc(db, USER_COLLECTIONS, username, "cards", cardId);
  
  await setDoc(userCardRef, {
    is_wishlist: !currentStatus,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

async function setCardVisibility(cardId, isHidden) {
  const username = getCurrentUsername();
  const userCardRef = doc(db, USER_COLLECTIONS, username, "cards", cardId);
  
  await setDoc(userCardRef, {
    is_hidden: isHidden,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

async function setCollectionVisibility(collectionName, isHidden) {
  const username = getCurrentUsername();
  const userDocRef = doc(db, USER_COLLECTIONS, username);

  const userSnap = await getDocs(collection(db, USER_COLLECTIONS));
  let currentHidden = [];
  
  for (const d of userSnap.docs) {
    if (d.id === username && d.data().hidden_collections) {
      currentHidden = d.data().hidden_collections;
    }
  }

  if (isHidden) {
    if (!currentHidden.includes(collectionName)) {
      currentHidden.push(collectionName);
    }
  } else {
    currentHidden = currentHidden.filter(name => name !== collectionName);
  }

  await setDoc(userDocRef, {
    hidden_collections: currentHidden,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

async function initializeCard(cardId, cardName, collectionName, rarity, referenceImageUrl) {
  const cardRef = doc(db, GLOBAL_CARDS_COLLECTION, cardId);
  const cardData = {
    card_id: cardId,
    card_name: cardName,
    collection_name: collectionName.replace(/ ❯ /g, " > "),
    rarity: rarity,
    reference_image_url: referenceImageUrl
  };
  await setDoc(cardRef, cardData, { merge: true });
}

export { 
  initializeCard, 
  subscribeToCards, 
  updateCardOwnership, 
  updateCardDetails,
  removeCardOwnership,
  toggleWishlistStatus,
  setCardVisibility,
  setCollectionVisibility
};