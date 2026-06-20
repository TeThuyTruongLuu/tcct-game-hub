import { 
  subscribeToCards, 
  updateCardOwnership, 
  updateCardDetails 
} from "./card-service.js";

let currentSelectedCardId = null;

function initializeAlbum() {
  subscribeToCards((cards) => {
    renderProgress(cards);
    renderGrid(cards);
  });
  
  setupModalEventListeners();
}

function renderProgress(cards) {
  const total = cards.length;
  const ownedCount = cards.filter(card => card.is_owned).length;
  
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  
  if (total > 0) {
    const percentage = (ownedCount / total) * 100;
    progressBar.style.width = `${percentage}%`;
  } else {
    progressBar.style.width = "0%";
  }
  
  progressText.textContent = `${ownedCount}/${total} Thẻ`;
}

function renderGrid(cards) {
  const gridContainer = document.getElementById("album-grid");
  gridContainer.innerHTML = "";
  
  cards.forEach((card) => {
    const cardElement = document.createElement("div");
    cardElement.className = `card-item ${card.is_owned ? "owned" : "not-owned"}`;
    
    const imageUrl = card.is_owned && card.local_photo_uri 
      ? card.local_photo_uri 
      : `../${card.reference_image_url}`;
    
    cardElement.innerHTML = `
      <img src="${imageUrl}" alt="${card.card_name}">
      <div class="card-item-name">${card.card_name}</div>
    `;
    
    cardElement.addEventListener("click", () => openCardModal(card));
    gridContainer.appendChild(cardElement);
  });
}

function openCardModal(card) {
  currentSelectedCardId = card.card_id;
  
  document.getElementById("modal-card-name").textContent = card.card_name;
  document.getElementById("modal-collection-name").textContent = card.collection_name;
  
  const modalImage = document.getElementById("modal-card-image");
  modalImage.src = card.is_owned && card.local_photo_uri 
    ? card.local_photo_uri 
    : `../${card.reference_image_url}`;
  
  const actionZone = document.getElementById("modal-action-zone");
  const ownedZone = document.getElementById("modal-owned-zone");
  const noteInput = document.getElementById("modal-note-input");
  
  if (card.is_owned) {
    actionZone.classList.add("hidden");
    ownedZone.classList.remove("hidden");
    noteInput.value = card.user_note || "";
  } else {
    actionZone.classList.remove("hidden");
    ownedZone.classList.add("hidden");
    noteInput.value = "";
  }
  
  document.getElementById("card-modal").classList.remove("hidden");
}

function closeCardModal() {
  document.getElementById("card-modal").classList.add("hidden");
  currentSelectedCardId = null;
}

function setupModalEventListeners() {
  document.getElementById("close-modal").addEventListener("click", closeCardModal);
  
  document.getElementById("btn-manual-own").addEventListener("click", async () => {
    if (currentSelectedCardId) {
      await updateCardOwnership(currentSelectedCardId, "manual");
      closeCardModal();
    }
  });
  
  document.getElementById("btn-camera-scan").addEventListener("click", () => {
    if (currentSelectedCardId) {
      triggerCameraScan(currentSelectedCardId);
    }
  });
  
  document.getElementById("btn-take-photo").addEventListener("click", () => {
    if (currentSelectedCardId) {
      captureRealPhoto(currentSelectedCardId);
    }
  });
  
  document.getElementById("btn-save-details").addEventListener("click", async () => {
    if (currentSelectedCardId) {
      const noteValue = document.getElementById("modal-note-input").value;
      await updateCardDetails(currentSelectedCardId, noteValue, null);
      closeCardModal();
    }
  });
}

function triggerCameraScan(cardId) {
  updateCardOwnership(cardId, "camera");
  closeCardModal();
}

function captureRealPhoto(cardId) {
  if (typeof navigator.camera === "undefined") {
    return;
  }
  
  navigator.camera.getPicture(
    async (imageURI) => {
      const noteValue = document.getElementById("modal-note-input").value;
      await updateCardDetails(cardId, noteValue, imageURI);
      closeCardModal();
    },
    (message) => {},
    {
      quality: 50,
      destinationType: Camera.DestinationType.FILE_URI,
      sourceType: Camera.PictureSourceType.CAMERA
    }
  );
}

export { initializeAlbum };