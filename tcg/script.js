import { db } from './firebase.js';
import { ref, set, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Biến toàn cục
let cardData = [];
let myDeck = [];
let myHand = [];
let roomId = '';
let playerRole = '';
let playerName = '';

// Lắng nghe nút tham gia phòng
document.getElementById('joinBtn').addEventListener('click', async () => {
  const name = document.getElementById('nameInput').value.trim();
  roomId = document.getElementById('roomInput').value.trim();
  if (!name || !roomId) return alert("Điền đủ tên và phòng");

  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  const data = snap.val() || {};

  if (!data.player1) {
    playerRole = 'player1';
  } else if (!data.player2) {
    playerRole = 'player2';
  } else {
    alert('Phòng đã đủ người!');
    return;
  }

  playerName = name;
  document.getElementById('lobby').classList.add('hidden');
  document.querySelector('.play-area').classList.remove('hidden');
  alert(`Bạn là ${playerRole.toUpperCase()}!`);

  // Load card data
  const res = await fetch('cards.json');
  cardData = await res.json();

  // Chia deck ngẫu nhiên
  myDeck = cardData.sort(() => Math.random() - 0.5).slice(0, 3);
  await set(ref(db, `rooms/${roomId}/${playerRole}`), {
    name,
    cards: myDeck.map(c => c.id),
    ready: false
  });

  // Render nút rút bài
  if (playerRole === 'player1') {
    initDeckView('.z2p1', 'deckP1', drawCardP1);
  } else {
    initDeckView('.z2p2', 'deckP2', drawCardP2);
  }
});

// Vẽ nút rút bài và setup sự kiện
function initDeckView(zoneSelector, btnId, drawFn) {
  const z = document.querySelector(zoneSelector);
  z.innerHTML = `<img src="img/card-back.jpg" style="width:100%;height:100%;border-radius:0.5rem;cursor:pointer;" id="${btnId}">`;
  document.getElementById(btnId).addEventListener('click', drawFn);
}

// Rút bài player1
function drawCardP1() {
  if (myDeck.length === 0) return;
  const card = myDeck.shift();
  myHand.push(card);
  appendCardToHand(card, '.z6p1');
}

// Rút bài player2
function drawCardP2() {
  if (myDeck.length === 0) return;
  const card = myDeck.shift();
  myHand.push(card);
  appendCardToHand(card, '.z6p2');
}

// Tìm thông tin card theo id
function findCard(cardId) {
  return cardData.find(c => c.id === cardId);
}

// Gắn thẻ vào khu tay bài
function appendCardToHand(card, zoneSelector) {
  const z6 = document.querySelector(zoneSelector);
  const div = document.createElement('div');
  div.classList.add('card');
  div.setAttribute('draggable', 'true');
  div.dataset.id = card.id;

  div.innerHTML = `<img src="${card.image}" alt="${card.name}" style="width:100%; height:100%; border-radius: 0.5rem;">`;
  div.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', card.id);
  });

  z6.appendChild(div);
}

export {};
