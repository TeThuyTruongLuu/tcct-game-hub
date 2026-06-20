import { 
  subscribeToCards, 
  updateCardOwnership, 
  updateCardDetails,
  initializeCard
} from "./card-service.js";

let allCardsData = [];
let currentPathArray = [];
let searchQuery = "";
let currentSelectedCardId = null;
let capturedAddCardPhotoUri = null;

function initializeAlbum() {
  subscribeToCards((cards) => {
    allCardsData = cards;
    renderProgress(cards);
    renderAlbumView();
  });
  
  setupSearchEventListener();
  setupModalEventListeners();
  setupAddCardEventListeners();
}

function renderProgress(cards) {
  const total = cards.length;
  const ownedCount = cards.filter(card => card.is_owned).length;
  
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  
  if (total > 0) {
    progressBar.style.width = `${(ownedCount / total) * 100}%`;
  } else {
    progressBar.style.width = "0%";
  }
  
  progressText.textContent = `${ownedCount}/${total} Thẻ`;
}

function setupSearchEventListener() {
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderAlbumView();
  });
}

function renderBreadcrumbs() {
  const breadcrumbsContainer = document.getElementById("breadcrumbs-container");
  breadcrumbsContainer.innerHTML = "";

  // Nút Gốc ban đầu
  const rootItem = document.createElement("span");
  rootItem.className = `breadcrumb-item ${currentPathArray.length === 0 ? "active" : ""}`;
  rootItem.textContent = "Gốc";
  if (currentPathArray.length > 0) {
    rootItem.addEventListener("click", () => {
      currentPathArray = [];
      renderAlbumView();
    });
  }
  breadcrumbsContainer.appendChild(rootItem);

  // Tạo các nút nhảy cóc cho từng cấp thư mục cha
  currentPathArray.forEach((folder, index) => {
    const separator = document.createElement("span");
    separator.className = "breadcrumb-separator";
    separator.textContent = "❯";
    breadcrumbsContainer.appendChild(separator);

    const item = document.createElement("span");
    const isLast = index === currentPathArray.length - 1;
    item.className = `breadcrumb-item ${isLast ? "active" : ""}`;
    item.textContent = folder;
    
    if (!isLast) {
      item.addEventListener("click", () => {
        currentPathArray = currentPathArray.slice(0, index + 1);
        renderAlbumView();
      });
    }
    breadcrumbsContainer.appendChild(item);
  });
}

function renderAlbumView() {
  renderBreadcrumbs();
  
  const container = document.getElementById("album-grid-container");
  container.innerHTML = "";

  // TRƯỜNG HỢP 1: Người dùng đang TÌM KIẾM toàn cục (Bỏ qua cấu trúc cây folder để hiện kết quả phẳng)
  if (searchQuery !== "") {
    const matchedCards = allCardsData.filter(card => 
      card.card_name.toLowerCase().includes(searchQuery) || 
      (card.collection_name && card.collection_name.toLowerCase().includes(searchQuery))
    );

    if (matchedCards.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">Không tìm thấy kết quả phù hợp</div>`;
      return;
    }

    const gridElement = document.createElement("div");
    gridElement.className = "album-grid";
    matchedCards.forEach(card => gridElement.appendChild(createCardDOM(card)));
    container.appendChild(gridElement);
    return;
  }

  // TRƯỜNG HỢP 2: Duyệt cây thư mục lồng nhau bình thường
  const filteredCards = allCardsData.filter(card => {
    if (!card.collection_name) return currentPathArray.length === 0;
    const cardParts = card.collection_name.split(" ❯ ").map(p => p.trim());
    
    for (let i = 0; i < currentPathArray.length; i++) {
      if (cardParts[i] !== currentPathArray[i]) return false;
    }
    return true;
  });

  const subFolderMap = new Map(); // folder_name -> count_total_cards_inside
  const directCardsInThisLevel = [];

  filteredCards.forEach(card => {
    const cardParts = card.collection_name ? card.collection_name.split(" ❯ ").map(p => p.trim()) : [];
    if (cardParts.length > currentPathArray.length) {
      const nextFolderName = cardParts[currentPathArray.length];
      subFolderMap.set(nextFolderName, (subFolderMap.get(nextFolderName) || 0) + 1);
    } else {
      directCardsInThisLevel.push(card);
    }
  });

  // Vẽ danh sách Thư mục con (nếu có) kèm bộ đếm số lượng goods bên trong cực clean
  if (subFolderMap.size > 0) {
    const listContainer = document.createElement("div");
    listContainer.className = "list-container";
    
    Array.from(subFolderMap.keys()).sort().forEach(folderName => {
      const folderElement = document.createElement("div");
      folderElement.className = "folder-item";
      folderElement.innerHTML = `
        <div class="folder-info">
          <span class="folder-icon">📁</span>
          <span class="folder-name">${folderName}</span>
        </div>
        <span class="folder-count">${subFolderMap.get(folderName)} item</span>
      `;
      folderElement.addEventListener("click", () => {
        currentPathArray.push(folderName);
        renderAlbumView();
      });
      listContainer.appendChild(folderElement);
    });
    container.appendChild(listContainer);
  }

  // Vẽ lưới các thẻ Card nằm trực tiếp tại cấp thư mục này
  if (directCardsInThisLevel.length > 0) {
    const gridElement = document.createElement("div");
    gridElement.className = "album-grid";
    if (subFolderMap.size > 0) gridElement.style.marginTop = "16px";

    directCardsInThisLevel.forEach(card => {
      gridElement.appendChild(createCardDOM(card));
    });
    container.appendChild(gridElement);
  }

  if (subFolderMap.size === 0 && directCardsInThisLevel.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted); font-size:13px;">Thư mục trống</div>`;
  }
}

function createCardDOM(card) {
  const cardElement = document.createElement("div");
  cardElement.className = `card-item ${card.is_owned ? "owned" : "not-owned"}`;
  
  let imageUrl = "";
  if (card.is_owned && card.real_photo_url) {
    imageUrl = card.real_photo_url;
  } else if (card.is_owned && card.local_photo_uri) {
    imageUrl = card.local_photo_uri;
  } else {
    imageUrl = card.reference_image_url ? card.reference_image_url.replace("collections/", "") : "assets/default_card.png";
  }
  
  cardElement.innerHTML = `
    <img src="${imageUrl}" alt="${card.card_name}">
    <div class="card-item-name">${card.card_name}</div>
  `;
  cardElement.addEventListener("click", () => openCardModal(card));
  return cardElement;
}

function openCardModal(card) {
  currentSelectedCardId = card.card_id;
  document.getElementById("modal-card-name").textContent = card.card_name;
  document.getElementById("modal-collection-name").textContent = card.collection_name || "Gốc";
  
  const modalImage = document.getElementById("modal-card-image");
  if (card.is_owned && card.real_photo_url) {
    modalImage.src = card.real_photo_url;
  } else if (card.is_owned && card.local_photo_uri) {
    modalImage.src = card.local_photo_uri;
  } else {
    modalImage.src = card.reference_image_url ? card.reference_image_url.replace("collections/", "") : "assets/default_card.png";
  }
  
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
      updateCardOwnership(currentSelectedCardId, "camera");
      closeCardModal();
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

function captureRealPhoto(cardId) {
  if (typeof navigator.camera === "undefined") return;
  navigator.camera.getPicture(
    async (imageURI) => {
      const noteValue = document.getElementById("modal-note-input").value;
      await updateCardDetails(cardId, noteValue, imageURI);
      closeCardModal();
    },
    () => {},
    {
      quality: 60,
      destinationType: Camera.DestinationType.FILE_URI,
      sourceType: Camera.PictureSourceType.CAMERA
    }
  );
}

function setupAddCardEventListeners() {
  const addModal = document.getElementById("add-card-modal");
  
  document.getElementById("btn-open-add-modal").addEventListener("click", () => {
    capturedAddCardPhotoUri = null;
    document.getElementById("add-card-name").value = "";
    // Tự động điền phân cấp thư mục hiện tại bồ đang đứng làm gợi ý mẫu
    document.getElementById("add-collection-name").value = currentPathArray.join(" ❯ ");
    document.getElementById("add-note").value = "";
    addModal.classList.remove("hidden");
  });
  
  document.getElementById("close-add-modal").addEventListener("click", () => {
    addModal.classList.add("hidden");
  });
  
  document.getElementById("btn-add-take-photo").addEventListener("click", () => {
    if (typeof navigator.camera === "undefined") return;
    navigator.camera.getPicture(
      (imageURI) => { capturedAddCardPhotoUri = imageURI; },
      () => {},
      {
        quality: 60,
        destinationType: Camera.DestinationType.FILE_URI,
        sourceType: Camera.PictureSourceType.CAMERA
      }
    );
  });
  
  document.getElementById("btn-submit-add-card").addEventListener("click", async () => {
    const name = document.getElementById("add-card-name").value.trim();
    const collectionNameInput = document.getElementById("add-collection-name").value.trim();
    const note = document.getElementById("add-note").value.trim();
    
    if (!name || !collectionNameInput) return;
    
    // Chuẩn hóa chuỗi nhập vào để tránh lỗi khoảng cách dư thừa giữa các kí tự phân tách ❯
    const formattedCollectionName = collectionNameInput.split("❯").map(p => p.trim()).join(" ❯ ");
    const cardId = "custom_" + Date.now();
    
    await initializeCard(cardId, name, formattedCollectionName, "Normal", "");
    await updateCardOwnership(cardId, "manual");
    await updateCardDetails(cardId, note, capturedAddCardPhotoUri);
    
    addModal.classList.add("hidden");
  });
}

export { initializeAlbum };