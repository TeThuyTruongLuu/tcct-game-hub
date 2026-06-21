import { 
  doc, 
  setDoc, 
  collection, 
  onSnapshot,
  getDocs,
  updateDoc
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
      const isCollectionHidden = hiddenCollections.includes(normalizedCollection);

      let cleanImgUrl = globalCard.reference_image_url || "";
      if (cleanImgUrl.startsWith("collections/")) {
        cleanImgUrl = cleanImgUrl.replace("collections/", "");
      }

      return {
        ...globalCard,
        collection_name: normalizedCollection,
        reference_image_url: cleanImgUrl,
        is_owned: userData.is_owned || false,
        is_wishlist: userData.is_wishlist || false,
        is_favorite: userData.is_favorite || false,
        user_note: userData.user_note || "",
        real_photo_url: userData.real_photo_url || "",
        local_photo_uri: userData.local_photo_uri || "",
        is_hidden: userData.is_hidden || false,
        is_collection_hidden: isCollectionHidden
      };
    });

    onUpdate(finalCards);
  };

  const unsubGlobal = onSnapshot(globalCollectionRef, (snapshot) => {
    globalCards = snapshot.docs.map(doc => doc.data());
    combineAndEmit();
  });

  const unsubUserCards = onSnapshot(userCardsCollectionRef, (snapshot) => {
    userCardsMap = {};
    snapshot.docs.forEach(doc => {
      userCardsMap[doc.id] = doc.data();
    });
    combineAndEmit();
  });

  const unsubUserDoc = onSnapshot(doc(db, USER_COLLECTIONS, username), (snapshot) => {
    if (snapshot.exists() && snapshot.data().hidden_collections) {
      hiddenCollections = snapshot.data().hidden_collections;
    } else {
      hiddenCollections = [];
    }
    combineAndEmit();
  });

  return () => {
    unsubGlobal();
    unsubUserCards();
    unsubUserDoc();
  };
}

async function updateCardOwnership(cardId, localPhotoUri = "") {
  const username = getCurrentUsername();
  const cardDocRef = doc(db, USER_COLLECTIONS, username, "cards", cardId);
  
  const snap = await getDocs(collection(db, USER_COLLECTIONS, username, "cards"));
  let wasInWishlist = false;
  snap.docs.forEach(d => {
    if (d.id === cardId && d.data().is_wishlist) {
      wasInWishlist = true;
    }
  });

  let updates = {
    is_owned: true,
    local_photo_uri: localPhotoUri,
    need_sync_photo: localPhotoUri !== "",
    updated_at: new Date().toISOString()
  };

  if (wasInWishlist) {
    updates.is_wishlist = false;
    updates.is_favorite = true;
  }

  await setDoc(cardDocRef, updates, { merge: true });
}

async function removeCardOwnership(cardId) {
  const username = getCurrentUsername();
  const cardDocRef = doc(db, USER_COLLECTIONS, username, "cards", cardId);
  await setDoc(cardDocRef, {
    is_owned: false,
    is_favorite: false,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

async function toggleWishlistStatus(cardId) {
  const username = getCurrentUsername();
  const cardDocRef = doc(db, USER_COLLECTIONS, username, "cards", cardId);
  const snapshot = await getDocs(collection(db, USER_COLLECTIONS, username, "cards"));
  let currentWishlist = false;
  
  snapshot.docs.forEach(d => {
    if (d.id === cardId && d.data().is_wishlist) {
      currentWishlist = d.data().is_wishlist;
    }
  });

  await setDoc(cardDocRef, {
    is_wishlist: !currentWishlist,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

async function toggleFavoriteStatus(cardId) {
  const username = getCurrentUsername();
  const cardDocRef = doc(db, USER_COLLECTIONS, username, "cards", cardId);
  const snapshot = await getDocs(collection(db, USER_COLLECTIONS, username, "cards"));
  let currentFavorite = false;
  
  snapshot.docs.forEach(d => {
    if (d.id === cardId && d.data().is_favorite) {
      currentFavorite = d.data().is_favorite;
    }
  });

  await setDoc(cardDocRef, {
    is_favorite: !currentFavorite,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

async function updateCardDetails(cardId, userNote) {
  const username = getCurrentUsername();
  const cardDocRef = doc(db, USER_COLLECTIONS, username, "cards", cardId);
  await setDoc(cardDocRef, {
    user_note: userNote,
    updated_at: new Date().toISOString()
  }, { merge: true });
}

async function setCardVisibility(cardId, isHidden) {
  const username = getCurrentUsername();
  const cardDocRef = doc(db, USER_COLLECTIONS, username, "cards", cardId);
  await setDoc(cardDocRef, {
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
    reference_image_url: referenceImageUrl,
    updated_at: new Date().toISOString()
  };
  await setDoc(cardRef, cardData, { merge: true });
}

export {
  subscribeToCards,
  updateCardOwnership,
  removeCardOwnership,
  toggleWishlistStatus,
  toggleFavoriteStatus,
  updateCardDetails,
  setCardVisibility,
  setCollectionVisibility,
  initializeCard
};