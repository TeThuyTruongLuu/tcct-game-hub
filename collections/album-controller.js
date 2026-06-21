import { 
  subscribeToCards, 
  updateCardOwnership, 
  updateCardDetails,
  removeCardOwnership,
  toggleWishlistStatus,
  setCardVisibility,
  setCollectionVisibility
} from "./card-service.js";

let allCardsData = [];
let currentPathArray = [];
let searchQuery = "";
let currentSelectedCardId = null;
let capturedAddCardPhotoUri = null;
let filterWishlistOnly = false;

function initializeAlbum() {
  subscribeToCards((cards) => {
    allCardsData = cards;
    renderProgress(cards);
    renderAlbumView();
  });
  
  setupSearchEventListener();
  setupModalEventListeners();
  setupAddCardEventListeners();
  setupWishlistToggleHeader();
}

function renderProgress(cards) {
  const visibleCards = cards.filter(card => !card.is_hidden && !card.is_collection_hidden);
  const total = visibleCards.length;
  const ownedCount = visibleCards.filter(card => card.is_owned).length;
  
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  
  if (progressBar && progressText) {
    if (total > 0) {
      progressBar.style.width = `${(ownedCount / total) * 100}%`;
    } else {
      progressBar.style.width = "0%";
    }
    progressText.textContent = `${ownedCount}/${total} Thẻ`;
  }
}

function setupSearchEventListener() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim();
      renderAlbumView();
    });
  }
}

function setupWishlistToggleHeader() {
  const searchContainer = document.querySelector(".search-container");
  if (searchContainer && !document.getElementById("btn-filter-wishlist")) {
    const wishlistBtn = document.createElement("button");
    wishlistBtn.id = "btn-filter-wishlist";
    wishlistBtn.style.width = "100%";
    wishlistBtn.style.padding = "10px";
    wishlistBtn.style.marginTop = "8px";
    wishlistBtn.style.border = "1px solid var(--border-color)";
    wishlistBtn.style.borderRadius = "10px";
    wishlistBtn.style.fontSize = "13px";
    wishlistBtn.style.fontWeight = "600";
    wishlistBtn.style.cursor = "pointer";
    wishlistBtn.style.background = "var(--card-bg)";
    wishlistBtn.style.color = "var(--text-main)";
    wishlistBtn.style.boxShadow = "var(--shadow-sm)";
    wishlistBtn.textContent = "❤️ Xem danh sách ước (Wishlist)";
    
    wishlistBtn.addEventListener("click", () => {
      filterWishlistOnly = !filterWishlistOnly;
      if (filterWishlistOnly) {
        wishlistBtn.style.background = "#fee2e2";
        wishlistBtn.style.color = "#dc2626";
        wishlistBtn.style.borderColor = "#fca5a5";
        wishlistBtn.textContent = "❤️ Đang hiện Wishlist (Bấm để hủy)";
      } else {
        wishlistBtn.style.background = "var(--card-bg)";
        wishlistBtn.style.color = "var(--text-main)";
        wishlistBtn.style.borderColor = "var(--border-color)";
        wishlistBtn.textContent = "❤️ Xem danh sách ước (Wishlist)";
      }
      renderAlbumView();
    });
    searchContainer.appendChild(wishlistBtn);
  }
}

function parseAdvancedSearch(queryStr) {
  if (!queryStr) return [];
  
  let orClauses = queryStr.split("/").map(c => c.trim()).filter(c => c);
  
  return orClauses.map(clause => {
    let andTokens = [];
    let regex = /\[([^\]]+)\]|"(html_safe_exact|[^"]+)"|(\S+)/g;
    let match;
    
    while ((match = regex.exec(clause)) !== null) {
      if (match[1]) {
        andTokens.push({ type: "folder", value: match[1].trim().toLowerCase() });
      } else if (match[2]) {
        andTokens.push({ type: "exact", value: match[2].trim().toLowerCase() });
      } else if (match[3] && match[3] !== "&") {
        andTokens.push({ type: "partial", value: match[3].trim().toLowerCase() });
      }
    }
    return andTokens;
  });
}

function matchCardWithAdvancedSearch(card, orClauses) {
  if (orClauses.length === 0) return true;
  
  let cardName = card.card_name.toLowerCase();
  let cardFolder = (card.collection_name || "").toLowerCase();
  let cardNote = (card.user_note || "").toLowerCase();
  
  return orClauses.some(andTokens => {
    if (andTokens.length === 0) return false;
    
    return andTokens.every(token => {
      if (token.type === "folder") {
        if (token.value === "wishlist") return card.is_wishlist === true;
        return cardFolder.includes(token.value);
      }
      if (token.type === "exact") {
        return cardName === token.value || cardNote === token.value;
      }
      if (token.type === "partial") {
        return cardName.includes(token.value) || cardFolder.includes(token.value) || cardNote.includes(token.value);
      }
      return false;
    });
  });
}

function renderBreadcrumbs() {
  const breadcrumbsContainer = document.getElementById("breadcrumbs-container");
  if (!breadcrumbsContainer) return;
  
  breadcrumbsContainer.innerHTML = "";

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

  currentPathArray.forEach((folder, index) => {
    const separator = document.createElement("span");
    separator.className = "breadcrumb-separator";
    separator.textContent = " > ";
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
  if (!container) return;
  
  container.innerHTML = "";

  if (searchQuery !== "" || filterWishlistOnly) {
    let orClauses = parseAdvancedSearch(searchQuery);
    const matchedCards = allCardsData.filter(card => {
      if (card.is_hidden || card.is_collection_hidden) return false;
      if (filterWishlistOnly && !card.is_wishlist) return false;
      return matchCardWithAdvancedSearch(card, orClauses);
    });

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

  const filteredCards = allCardsData.filter(card => {
    if (card.is_collection_hidden) return false;
    if (!card.collection_name) return currentPathArray.length === 0;
    const cardParts = card.collection_name.split(" > ").map(p => p.trim());
    
    for (let i = 0; i < currentPathArray.length; i++) {
      if (cardParts[i] !== currentPathArray[i]) return false;
    }
    return true;
  });

  const subFolderMap = new Map();
  const directCardsInThisLevel = [];

  filteredCards.forEach(card => {
    const cardParts = card.collection_name ? card.collection_name.split(" > ").map(p => p.trim()) : [];
    if (cardParts.length > currentPathArray.length) {
      const nextFolderName = cardParts[currentPathArray.length];
      subFolderMap.set(nextFolderName, (subFolderMap.get(nextFolderName) || 0) + 1);
    } else {
      if (!card.is_hidden) {
        directCardsInThisLevel.push(card);
      }
    }
  });

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

  if (directCardsInThisLevel.length > 0) {
    const gridElement = document.createElement("div");
    gridElement.className = "album-grid";
    if (subFolderMap.size > 0) gridElement.style.marginTop = "16px";

    directCardsInThisLevel.forEach(card => {
      gridElement.appendChild(createCardDOM(card));
    });
    container.appendChild(gridElement);
  }

  const currentLevelGroups = allCardsData.filter(card => {
    if (!card.collection_name) return false;
    const cardParts = card.collection_name.split(" > ").map(p => p.trim());
    for (let i = 0; i < currentPathArray.length; i++) {
      if (cardParts[i] !== currentPathArray[i]) return false;
    }
    return cardParts.length === currentPathArray.length + 1;
  });

  const uniqueGroups = [...new Set(currentLevelGroups.map(c => c.collection_name.split(" > ").pop().trim()))];
  
  uniqueGroups.forEach(gName => {
    const fullGroupName = currentPathArray.length > 0 ? `${currentPathArray.join(" > ")} > ${gName}` : gName;
    const groupCards = allCardsData.filter(c => c.collection_name === fullGroupName);
    const isGroupHidden = groupCards.every(c => c.is_collection_hidden);
    
    if (isGroupHidden) {
      const folderElement = document.createElement("div");
      folderElement.className = "folder-item";
      folderElement.style.opacity = "0.5";
      folderElement.innerHTML = `
        <div class="folder-info">
          <span class="folder-icon">📁</span>
          <span class="folder-name" style="text-decoration: line-through;">${gName} (Đang ẩn)</span>
        </div>
        <span class="folder-count">Hiện lại</span>
      `;
      folderElement.querySelector(".folder-count").addEventListener("click", async (e) => {
        e.stopPropagation();
        await setCollectionVisibility(fullGroupName, false);
      });
      if (container.firstChild && container.firstChild.className === "list-container") {
        container.firstChild.appendChild(folderElement);
      } else {
        const listContainer = document.createElement("div");
        listContainer.className = "list-container";
        listContainer.appendChild(folderElement);
        container.insertBefore(listContainer, container.firstChild);
      }
    }
  });

  if (subFolderMap.size === 0 && directCardsInThisLevel.length === 0 && uniqueGroups.length === 0) {
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
    <div class="card-image-box" style="position: relative;">
      <img src="${imageUrl}" alt="${card.card_name}">
      <span class="card-wishlist-heart" style="position: absolute; top: 4px; right: 4px; font-size: 14px; cursor: pointer; user-select: none; z-index: 10;">
        ${card.is_wishlist ? "❤️" : "🤍"}
      </span>
    </div>
    <div class="card-item-name">${card.card_name}</div>
  `;
  
  cardElement.querySelector(".card-wishlist-heart").addEventListener("click", async (e) => {
    e.stopPropagation();
    await toggleWishlistStatus(card.card_id, card.is_wishlist);
  });

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
  const toggleVisibilityBtn = document.getElementById("btn-toggle-visibility");
  
  if (toggleVisibilityBtn) {
    toggleVisibilityBtn.textContent = card.is_hidden ? "Hiện thẻ này" : "Ẩn khỏi album";
  }

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

  const ownedZone = document.getElementById("modal-owned-zone");
  if (ownedZone && !document.getElementById("btn-remove-ownership")) {
    const removeBtn = document.createElement("button");
    removeBtn.id = "btn-remove-ownership";
    removeBtn.className = "btn";
    removeBtn.style.background = "#ef4444";
    removeBtn.style.color = "white";
    removeBtn.style.marginTop = "8px";
    removeBtn.textContent = "Bỏ khỏi bộ sưu tập";
    removeBtn.addEventListener("click", async () => {
      if (currentSelectedCardId) {
        await removeCardOwnership(currentSelectedCardId);
        closeCardModal();
      }
    });
    ownedZone.appendChild(removeBtn);
  }

  const toggleVisibilityBtn = document.getElementById("btn-toggle-visibility");
  if (toggleVisibilityBtn) {
    toggleVisibilityBtn.addEventListener("click", async () => {
      if (currentSelectedCardId) {
        const targetCard = allCardsData.find(c => c.card_id === currentSelectedCardId);
        if (targetCard) {
          await setCardVisibility(currentSelectedCardId, !targetCard.is_hidden);
          closeCardModal();
        }
      }
    });
  } else {
    const modalContent = document.querySelector(".modal-content");
    if (modalContent && !document.getElementById("btn-toggle-visibility")) {
      const visibilityBtn = document.createElement("button");
      visibilityBtn.id = "btn-toggle-visibility";
      visibilityBtn.className = "btn";
      visibilityBtn.style.background = "#64748b";
      visibilityBtn.style.color = "white";
      visibilityBtn.style.marginTop = "8px";
      visibilityBtn.textContent = "Ẩn khỏi album";
      visibilityBtn.addEventListener("click", async () => {
        if (currentSelectedCardId) {
          const targetCard = allCardsData.find(c => c.card_id === currentSelectedCardId);
          if (targetCard) {
            await setCardVisibility(currentSelectedCardId, !targetCard.is_hidden);
            closeCardModal();
          }
        }
      });
      modalContent.appendChild(visibilityBtn);
    }
  }
  
  const currentGroup = currentPathArray.join(" > ");
  if (currentGroup) {
    const ownedZone = document.getElementById("modal-owned-zone");
    if (ownedZone && !document.getElementById("btn-hide-this-collection")) {
      const hideCollBtn = document.createElement("button");
      hideCollBtn.id = "btn-hide-this-collection";
      hideCollBtn.className = "btn btn-secondary";
      hideCollBtn.style.marginTop = "8px";
      hideCollBtn.textContent = "Ẩn toàn bộ thư mục này";
      hideCollBtn.addEventListener("click", async () => {
        if (currentPathArray.length > 0) {
          await setCollectionVisibility(currentGroup, true);
          currentPathArray.pop();
          closeCardModal();
        }
      });
      ownedZone.appendChild(hideCollBtn);
    }
  }
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
      destinationType: navigator.camera.DestinationType.FILE_URI,
      sourceType: navigator.camera.PictureSourceType.CAMERA
    }
  );
}

function setupAddCardEventListeners() {
  const addModal = document.getElementById("add-card-modal");
  if (!addModal) return;
  
  document.getElementById("btn-open-add-modal").addEventListener("click", () => {
    capturedAddCardPhotoUri = null;
    document.getElementById("add-card-name").value = "";
    document.getElementById("add-collection-name").value = currentPathArray.join(" > ");
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
        destinationType: navigator.camera.DestinationType.FILE_URI,
        sourceType: navigator.camera.PictureSourceType.CAMERA
      }
    );
  });
  
  document.getElementById("btn-submit-add-card").addEventListener("click", async () => {
    const name = document.getElementById("add-card-name").value.trim();
    const collectionNameInput = document.getElementById("add-collection-name").value.trim();
    const note = document.getElementById("add-note").value.trim();
    
    if (!name || !collectionNameInput) return;
    
    const formattedCollectionName = collectionNameInput.split(">").map(p => p.trim()).join(" > ");
    const cardId = "custom_" + Date.now();
    
    await initializeCard(cardId, name, formattedCollectionName, "Normal", "");
    await updateCardOwnership(cardId, "manual");
    await updateCardDetails(cardId, note, capturedAddCardPhotoUri);
    
    addModal.classList.add("hidden");
  });
}

export { initializeAlbum };