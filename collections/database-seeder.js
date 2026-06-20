import { initializeCard } from "./card-service.js";

async function seedInitialCardsData() {
  const initialCards = [
    {
      id: "card_tcct_001",
      name: "Diệp Tu - Quân Mạc Tiếu",
      collection: "Toàn Chức Cao Thủ - Chibi Series",
      rarity: "SSR",
      image: "https://placehold.co/200x300?text=Diep+Tu"
    },
    {
      id: "card_tcct_002",
      name: "Tô Mộc Tranh - Mộc Vũ Tranh Phong",
      collection: "Toàn Chức Cao Thủ - Chibi Series",
      rarity: "SR",
      image: "https://placehold.co/200x300?text=To+Muc+Tranh"
    },
    {
      id: "card_tcct_003",
      name: "Dụ Văn Châu - Sách Khắc Tát Nh爾",
      collection: "Toàn Chức Cao Thủ - Chibi Series",
      rarity: "SR",
      image: "https://placehold.co/200x300?text=Du+Van+Chau"
    },
    {
      id: "card_tcct_004",
      name: "Hoàng Thiếu Thiên - Dạ Vũ Thanh Phiền",
      collection: "Toàn Chức Cao Thủ - Chibi Series",
      rarity: "SSR",
      image: "https://placehold.co/200x300?text=Hoang+Thieu+Thien"
    },
    {
      id: "card_tcct_005",
      name: "Chu Trạch Khải - Nhất Thương Xuyên Vân",
      collection: "Toàn Chức Cao Thủ - Chibi Series",
      rarity: "SSR",
      image: "https://placehold.co/200x300?text=Chu+Trach+Khai"
    }
  ];

  try {
    for (const card of initialCards) {
      await initializeCard(card.id, card.name, card.collection, card.rarity, card.image);
    }
  } catch (error) {
    document.dispatchEvent(new CustomEvent("seedError", { detail: error }));
  }
}

export { seedInitialCardsData };