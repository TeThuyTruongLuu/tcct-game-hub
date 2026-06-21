import { 
  subscribeToCards, 
  updateCardOwnership, 
  updateCardDetails,
  removeCardOwnership,
  toggleWishlistStatus,
  toggleFavoriteStatus,
  setCardVisibility,
  setCollectionVisibility,
  initializeCard
} from "./card-service.js";

let allCardsData = [];
let currentPathArray = [];
let searchQuery = "";
let currentSelectedCardId = null;
let capturedAddCardPhotoUri = null;
let filterStatus = "all"; 
let groupFoldersInOwned = true;

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

function setupWishlistToggleHeader() {
  const searchContainer = document.querySelector(".search-container");
  if (!searchContainer) return;

  let wrapper = document.getElementById("filter-buttons-wrapper");
  if (!wrapper) {
    wrapper = document.createElement("div");
    wrapper.id = "filter-buttons-wrapper";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.gap = "10px";
    wrapper.style.marginTop = "12px";
    searchContainer.appendChild(wrapper);
  }

  wrapper.innerHTML = "";

  const rowFilters = document.createElement("div");
  rowFilters.style.display = "grid";
  rowFilters.style.gridTemplateColumns = "repeat(4, 1fr)";
  rowFilters.style.gap = "6px";

  const statuses = [
    { id: "all", label: "Tất cả" },
    { id: "owned", label: "Đã sở hữu" },
    { id: "favorite", label: "Yêu thích" },
    { id: "wishlist", label: "Wishlist" }
  ];

  statuses.forEach(status => {
    const btn = document.createElement("button");
    btn.textContent = status.label;
    btn.style.padding = "8px 4px";
    btn.style.fontSize = "12px";
    btn.style.fontWeight = "600";
    btn.style.border = "1px solid var(--border-color)";
    btn.style.borderRadius = "8px";
    btn.style.cursor = "pointer";
    
    if (filterStatus === status.id) {
      btn.style.backgroundColor = "var(--text-main)";
      btn.style.color = "#ffffff";
    } else {
      btn.style.backgroundColor = "var(--card-bg)";
      btn.style.color = "var(--text-main)";
    }

    btn.addEventListener("click", () => {
      filterStatus = status.id;
      if (filterStatus !== "owned") {
        currentPathArray = [];
      }
      setupWishlistToggleHeader();
      renderAlbumView();
    });

    rowFilters.appendChild(btn);
  });

  wrapper.appendChild(rowFilters);

  if (filterStatus === "owned") {
    const rowToggle = document.createElement("div");
    rowToggle.style.display = "flex";
    rowToggle.style.justifyContent = "flex-end";
    rowToggle.style.alignItems = "center";
    rowToggle.style.gap = "8px";

    const label = document.createElement("label");
    label.style.fontSize = "12px";
    label.style.fontWeight = "600";
    label.style.color = "var(--text-muted)";
    label.style.cursor = "pointer";
    label.textContent = "Hiển thị theo thư mục";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = groupFoldersInOwned;
    checkbox.style.cursor = "pointer";

    const handleToggle = () => {
      groupFoldersInOwned = !groupFoldersInOwned;
      if (!groupFoldersInOwned) {
        currentPathArray = [];
      }
      setupWishlistToggleHeader();
      renderAlbumView();
    };

    label.addEventListener("click", handleToggle);
    checkbox.addEventListener("change", handleToggle);

    rowToggle.appendChild(checkbox);
    rowToggle.appendChild(label);
    wrapper.appendChild(rowToggle);
  }
}

function setupSearchEventListener() {
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderAlbumView();
    });
  }
}

function getFilteredCards() {
  let cards = allCardsData.filter(card => !card.is_hidden && !card.is_collection_hidden);

  if (filterStatus === "owned") {
    cards = cards.filter(card => card.is_owned);
  } else if (filterStatus === "favorite") {
    cards = cards.filter(card => card.is_favorite);
  } else if (filterStatus === "wishlist") {
    cards = cards.filter(card => card.is_wishlist);
  }

  if (searchQuery) {
    cards = cards.filter(card => {
      const nameMatch = card.card_name && card.card_name.toLowerCase().includes(searchQuery);
      const collectionMatch = card.collection_name && card.collection_name.toLowerCase().includes(searchQuery);
      return nameMatch || collectionMatch;
    });
  }

  return cards;
}

function renderAlbumView() {
  const container = document.getElementById("album-grid-container");
  if (!container) return;
  container.innerHTML = "";

  const filteredCards = getFilteredCards();
  const isBrowsingFolders = (filterStatus === "all" || (filterStatus === "owned" && groupFoldersInOwned)) && !searchQuery;

  if (isBrowsingFolders) {
    renderFolderDepthView(filteredCards, container);
  } else {
    document.getElementById("breadcrumbs-container").innerHTML = "";
    renderCardsGrid(filteredCards, container);
  }
}

function renderFolderDepthView(cards, container) {
  const currentDepth = currentPathArray.length;
  renderBreadcrumbs();

  const subFoldersMap = {};
  const cardsInThisFolder = [];

  cards.forEach(card => {
    const parts = card.collection_name.split(">").map(p => p.trim());
    let match = true;
    for (let i = 0; i < currentDepth; i++) {
      if (parts[i] !== currentPathArray[i]) {
        match = false;
        break;
      }
    }

    if (match) {
      if (parts.length > currentDepth) {
        const nextFolder = parts[currentDepth];
        if (!subFoldersMap[nextFolder]) {
          subFoldersMap[nextFolder] = { total: 0, owned: 0 };
        }
        subFoldersMap[nextFolder].total++;
        if (card.is_owned) {
          subFoldersMap[nextFolder].owned++;
        }
      } else {
        cardsInThisFolder.push(card);
      }
    }
  });

  const listContainer = document.createElement("div");
  listContainer.className = "list-container";

  Object.keys(subFoldersMap).sort().forEach(folderName => {
    const stats = subFoldersMap[folderName];
    const folderItem = document.createElement("div");
    folderItem.className = "folder-item";
    folderItem.innerHTML = `
      <div class="folder-info">
        <span class="folder-icon">📁</span>
        <span class="folder-name">${folderName}</span>
      </div>
      <span class="folder-count">${stats.owned}/${stats.total}</span>
    `;
    folderItem.addEventListener("click", () => {
      currentPathArray.push(folderName);
      renderAlbumView();
    });
    listContainer.appendChild(folderItem);
  });

  if (listContainer.children.length > 0) {
    container.appendChild(listContainer);
  }

  if (cardsInThisFolder.length > 0) {
    const gridContainer = document.createElement("div");
    renderCardsGrid(cardsInThisFolder, gridContainer);
    container.appendChild(gridContainer);
  }
}

function renderBreadcrumbs() {
  const container = document.getElementById("breadcrumbs-container");
  if (!container) return;
  container.innerHTML = "";

  const rootItem = document.createElement("span");
  rootItem.className = `breadcrumb-item ${currentPathArray.length === 0 ? "active" : ""}`;
  rootItem.textContent = "Gốc";
  rootItem.addEventListener("click", () => {
    if (currentPathArray.length > 0) {
      currentPathArray = [];
      renderAlbumView();
    }
  });
  container.appendChild(rootItem);

  currentPathArray.forEach((folder, index) => {
    const separator = document.createElement("span");
    separator.className = "breadcrumb-separator";
    separator.textContent = "❯";
    container.appendChild(separator);

    const item = document.createElement("span");
    const isActive = index === currentPathArray.length - 1;
    item.className = `breadcrumb-item ${isActive ? "active" : ""}`;
    item.textContent = folder;
    
    if (!isActive) {
      item.addEventListener("click", () => {
        currentPathArray = currentPathArray.slice(0, index + 1);
        renderAlbumView();
      });
    }
    container.appendChild(item);
  });
}

function renderCardsGrid(cards, container) {
  container.className = "album-grid";

  if (cards.length === 0) {
    const noData = document.createElement("div");
    noData.style.gridColumn = "1 / -1";
    noData.style.textAlign = "center";
    noData.style.padding = "40px 0";
    noData.style.color = "var(--text-muted)";
    noData.style.fontSize = "14px";
    noData.style.fontWeight = "600";
    noData.textContent = "Không tìm thấy thẻ nào phù hợp";
    container.appendChild(noData);
    return;
  }

  cards.forEach(card => {
    const cardEl = document.createElement("div");
    cardEl.className = `card-item ${!card.is_owned ? "not-owned" : ""}`;

    const imageBox = document.createElement("div");
    imageBox.className = "card-image-box";
    imageBox.style.position = "relative";

    const img = document.createElement("img");
    img.src = card.real_photo_url || card.reference_image_url || "assets/default-card.png";
    img.alt = card.card_name;
    imageBox.appendChild(img);

    const badgesContainer = document.createElement("div");
    badgesContainer.className = "card-badges-overlay";

    if (card.is_favorite) {
      const favBadge = document.createElement("span");
      favBadge.className = "card-badge-icon badge-favorite";
      favBadge.innerHTML = "★";
      badgesContainer.appendChild(favBadge);
    }

    if (card.is_wishlist) {
      const wishBadge = document.createElement("span");
      wishBadge.className = "card-badge-icon badge-wishlist";
      wishBadge.innerHTML = "❤";
      badgesContainer.appendChild(wishBadge);
    }

    imageBox.appendChild(badgesContainer);

    const nameEl = document.createElement("div");
    nameEl.className = "card-item-name";
    nameEl.textContent = card.card_name;

    cardEl.appendChild(imageBox);
    cardEl.appendChild(nameEl);

    cardEl.addEventListener("click", () => {
      openCardModal(card.card_id);
    });

    container.appendChild(cardEl);
  });
}

function openCardModal(cardId) {
  const card = allCardsData.find(c => c.card_id === cardId);
  if (!card) return;

  currentSelectedCardId = cardId;
  document.getElementById("modal-card-name").textContent = card.card_name;
  document.getElementById("modal-collection-name").textContent = card.collection_name;
  
  const modalImg = document.getElementById("modal-card-image");
  modalImg.src = card.real_photo_url || card.reference_image_url || "assets/default-card.png";

  const noteInput = document.getElementById("modal-note-input");
  noteInput.value = card.user_note || "";

  updateModalActionButtons(card);
  document.getElementById("card-modal").classList.remove("hidden");
}

function updateModalActionButtons(card) {
  const btnOwned = document.getElementById("btn-toggle-owned");
  const btnFavorite = document.getElementById("btn-toggle-favorite");
  const btnWishlist = document.getElementById("btn-toggle-wishlist");

  if (card.is_owned) {
    btnOwned.textContent = "Bỏ sở hữu";
    btnOwned.className = "btn btn-secondary";
  } else {
    btnOwned.textContent = "Đã sở hữu";
    btnOwned.className = "btn btn-success";
  }

  if (card.is_favorite) {
    btnFavorite.textContent = "Bỏ yêu thích";
    btnFavorite.className = "btn btn-secondary";
  } else {
    btnFavorite.textContent = "Yêu thích";
    btnFavorite.className = "btn btn-success";
  }

  if (card.is_wishlist) {
    btnWishlist.textContent = "Bỏ Wishlist";
    btnWishlist.className = "btn btn-secondary";
  } else {
    btnWishlist.textContent = "Thêm Wishlist";
    btnWishlist.className = "btn btn-success";
  }
}

function setupModalEventListeners() {
  const cardModal = document.getElementById("card-modal");
  const closeModal = document.getElementById("close-modal");

  if (closeModal) {
    closeModal.addEventListener("click", () => {
      cardModal.classList.add("hidden");
      currentSelectedCardId = null;
    });
  }

  document.getElementById("btn-toggle-owned").addEventListener("click", async () => {
    if (!currentSelectedCardId) return;
    const card = allCardsData.find(c => c.card_id === currentSelectedCardId);
    if (!card) return;

    if (card.is_owned) {
      await removeCardOwnership(currentSelectedCardId);
    } else {
      await updateCardOwnership(currentSelectedCardId);
    }
    const updatedCard = allCardsData.find(c => c.card_id === currentSelectedCardId);
    if (updatedCard) updateModalActionButtons(updatedCard);
  });

  document.getElementById("btn-toggle-favorite").addEventListener("click", async () => {
    if (!currentSelectedCardId) return;
    await toggleFavoriteStatus(currentSelectedCardId);
    const updatedCard = allCardsData.find(c => c.card_id === currentSelectedCardId);
    if (updatedCard) updateModalActionButtons(updatedCard);
  });

  document.getElementById("btn-toggle-wishlist").addEventListener("click", async () => {
    if (!currentSelectedCardId) return;
    await toggleWishlistStatus(currentSelectedCardId);
    const updatedCard = allCardsData.find(c => c.card_id === currentSelectedCardId);
    if (updatedCard) updateModalActionButtons(updatedCard);
  });

  document.getElementById("btn-save-details").addEventListener("click", async () => {
    if (!currentSelectedCardId) return;
    const note = document.getElementById("modal-note-input").value.trim();
    await updateCardDetails(currentSelectedCardId, note);
    cardModal.classList.add("hidden");
    currentSelectedCardId = null;
  });
}

function setupAddCardEventListeners() {
  const addModal = document.getElementById("add-card-modal");
  const btnOpen = document.getElementById("btn-open-add-modal");
  const btnClose = document.getElementById("close-add-modal");

  if (btnOpen) {
    btnOpen.addEventListener("click", () => {
      document.getElementById("add-card-name").value = "";
      document.getElementById("add-collection-name").value = currentPathArray.join(" > ");
      document.getElementById("add-note").value = "";
      addModal.classList.remove("hidden");
    });
  }

  if (btnClose) {
    btnClose.addEventListener("click", () => {
      addModal.classList.add("hidden");
    });
  }

  document.getElementById("btn-submit-add-card").addEventListener("click", async () => {
    const name = document.getElementById("add-card-name").value.trim();
    const collectionNameInput = document.getElementById("add-collection-name").value.trim();
    const note = document.getElementById("add-note").value.trim();
    
    if (!name || !collectionNameInput) return;
    
    const formattedCollectionName = collectionNameInput.split(">").map(p => p.trim()).join(" > ");
    const cardId = "custom_" + Date.now();
    
    await initializeCard(cardId, name, formattedCollectionName, "Normal", "");
    await updateCardOwnership(cardId);
    if (note) {
      await updateCardDetails(cardId, note);
    }
    addModal.classList.add("hidden");
  });
}

export { initializeAlbum };