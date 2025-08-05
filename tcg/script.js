import { db } from './firebase.js';
import { ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Biến toàn cục
let cardData = [];
let myDeck = [];
let myHand = [];
let discardPile = [];
let roomId = '';
let playerRole = '';
let playerName = '';
let currentTurn = 'player1';
let opponentCards = { main: null, supports: [] };
let myCards = { main: null, supports: [] };

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
  console.log('Loaded cardData:', cardData);

  // Chia deck ngẫu nhiên
  myDeck = cardData.sort(() => Math.random() - 0.5).slice(0, 3);
  await set(ref(db, `rooms/${roomId}/${playerRole}`), {
    name,
    cards: myDeck.map(c => c.id),
    hand: [],
    main: null,
    supports: [],
    ready: false
  });

  // Khởi tạo giao diện
  initDeckView();
  initDropZones();
  listenToRoomChanges();
});

// Khởi tạo nút rút bài và các khu vực
function initDeckView() {
  const zoneSelector = playerRole === 'player1' ? '.z2p1' : '.z2p2';
  const btnId = playerRole === 'player1' ? 'deckP1' : 'deckP2';
  const drawFn = playerRole === 'player1' ? drawCardP1 : drawCardP2;

  const z = document.querySelector(zoneSelector);
  z.innerHTML = `<img src="img/card-back.jpg" style="width:100%;height:100%;border-radius:0.5rem;cursor:pointer;" id="${btnId}">`;
  document.getElementById(btnId).addEventListener('click', drawFn);
}

// Khởi tạo các khu vực thả bài
function initDropZones() {
  const mainZone = playerRole === 'player1' ? '.z3p1' : '.z3p2';
  const supportZone = playerRole === 'player1' ? '.z4p1' : '.z4p2';

  [mainZone, supportZone].forEach(zone => {
    const z = document.querySelector(zone);
    z.addEventListener('dragover', (e) => e.preventDefault());
    z.addEventListener('drop', (e) => handleDrop(e, zone));
  });
}

// Lắng nghe thay đổi trạng thái phòng
function listenToRoomChanges() {
  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, (snap) => {
    const data = snap.val();
    if (!data) return;
    console.log('Firebase room data:', data);

    const opponentRole = playerRole === 'player1' ? 'player2' : 'player1';
    opponentCards = {
      main: data[opponentRole]?.main || null,
      supports: data[opponentRole]?.supports || []
    };
    currentTurn = data.currentTurn || 'player1';

    updateOpponentBoard();
    updateTurnIndicator();
  });
}

// Cập nhật bàn của đối thủ
function updateOpponentBoard() {
  const mainZone = playerRole === 'player1' ? '.z3p2' : '.z3p1';
  const supportZone = playerRole === 'player1' ? '.z4p2' : '.z4p1';

  // Cập nhật bài chủ chiến
  const mainZ = document.querySelector(mainZone);
  mainZ.innerHTML = '';
  if (opponentCards.main) {
    appendCardToZone(opponentCards.main, mainZone, false);
  }

  // Cập nhật bài hỗ trợ
  const supportZ = document.querySelector(supportZone);
  supportZ.innerHTML = '';
  opponentCards.supports.forEach(cardId => {
    appendCardToZone(cardId, supportZone, false);
  });
}

// Cập nhật chỉ báo lượt
function updateTurnIndicator() {
  const turnIndicator = document.createElement('div');
  turnIndicator.style.position = 'absolute';
  turnIndicator.style.top = '50%';
  turnIndicator.style.left = '50%';
  turnIndicator.style.transform = 'translate(-50%, -50%)';
  turnIndicator.style.padding = '10px';
  turnIndicator.style.background = 'rgba(0,0,0,0.7)';
  turnIndicator.style.color = 'white';
  turnIndicator.textContent = currentTurn === playerRole ? 'Lượt của bạn' : 'Lượt của đối thủ';
  document.querySelector('.play-area').appendChild(turnIndicator);
  setTimeout(() => turnIndicator.remove(), 2000);
}

// Rút bài player1
function drawCardP1() {
  if (currentTurn !== 'player1' || myDeck.length === 0) return;
  const card = myDeck.shift();
  myHand.push(card);
  appendCardToHand(card, '.z6p1');
  updateFirebaseState();
}

// Rút bài player2
function drawCardP2() {
  if (currentTurn !== 'player2' || myDeck.length === 0) return;
  const card = myDeck.shift();
  myHand.push(card);
  appendCardToHand(card, '.z6p2');
  updateFirebaseState();
}

// Tìm thông tin card theo id
function findCard(cardId) {
  const card = cardData.find(c => c.id === cardId);
  if (!card) console.error('Card not found for ID:', cardId);
  return card;
}

// Gắn thẻ vào khu tay bài
function appendCardToHand(cardOrId, zoneSelector) {
  const card = typeof cardOrId === 'string' ? findCard(cardOrId) : cardOrId;
  if (!card) {
    console.error('Card not found:', cardOrId);
    return;
  }
  console.log('appendCardToHand:', card);
  const z6 = document.querySelector(zoneSelector);
  const div = document.createElement('div');
  div.classList.add('card');
  div.setAttribute('draggable', 'true');
  div.dataset.id = card.id;

  const cardNumber = card.id.split('-').pop().padStart(2, '0');
  const imagePath = `img/${cardNumber}.jpg`;

  div.innerHTML = `<img src="${imagePath}" alt="${card.name}" style="width:100%; height:100%; border-radius: 0.5rem;">`;
  div.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', card.id);
  });

  z6.appendChild(div);
}

// Gắn thẻ vào khu vực chơi
function appendCardToZone(cardId, zoneSelector, isDraggable) {
  const card = findCard(cardId);
  if (!card) {
    console.error('Card not found:', cardId);
    return;
  }
  console.log('appendCardToZone:', card);
  const zone = document.querySelector(zoneSelector);
  const div = document.createElement('div');
  div.classList.add('card');
  if (isDraggable) {
    div.setAttribute('draggable', 'true');
    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.id);
    });
  }
  div.dataset.id = card.id;

  const cardNumber = card.id.split('-').pop().padStart(2, '0');
  const imagePath = `img/${cardNumber}.jpg`;

  div.innerHTML = `<img src="${imagePath}" alt="${card.name}" style="width:100%; height:100%; border-radius: 0.5rem;">`;
  zone.appendChild(div);
}

// Xử lý thả bài
async function handleDrop(e, zoneSelector) {
  e.preventDefault();
  if (currentTurn !== playerRole) return alert('Không phải lượt của bạn!');

  const cardId = e.dataTransfer.getData('text/plain');
  const card = findCard(cardId);
  if (!card) return;

  const handZone = playerRole === 'player1' ? '.z6p1' : '.z6p2';
  const mainZone = playerRole === 'player1' ? '.z3p1' : '.z3p2';
  const supportZone = playerRole === 'player1' ? '.z4p1' : '.z4p2';

  if (zoneSelector === mainZone && !myCards.main) {
    myCards.main = cardId;
    myHand = myHand.filter(c => c.id !== cardId);
    document.querySelector(handZone).querySelector(`[data-id="${cardId}"]`).remove();
    appendCardToZone(cardId, mainZone, true);
    applySkill(card, 'main');
  } else if (zoneSelector === supportZone && myCards.supports.length < 2) {
    myCards.supports.push(cardId);
    myHand = myHand.filter(c => c.id !== cardId);
    document.querySelector(handZone).querySelector(`[data-id="${cardId}"]`).remove();
    appendCardToZone(cardId, supportZone, true);
    applySkill(card, 'support');
  }

  await updateFirebaseState();
  await endTurn();
}

// Cập nhật trạng thái lên Firebase
async function updateFirebaseState() {
  await set(ref(db, `rooms/${roomId}/${playerRole}`), {
    name: playerName,
    cards: myDeck.map(c => c.id),
    hand: myHand.map(c => c.id),
    main: myCards.main,
    supports: myCards.supports,
    ready: true
  });
}

// Kết thúc lượt
async function endTurn() {
  const newTurn = playerRole === 'player1' ? 'player2' : 'player1';
  await set(ref(db, `rooms/${roomId}/currentTurn`), newTurn);

  // Tính điểm và kiểm tra chiến thắng
  const roomRef = ref(db, `rooms/${roomId}`);
  const snap = await get(roomRef);
  const data = snap.val();
  if (data.player1.ready && data.player2.ready) {
    const result = calculateBattleResult(data);
    if (result.winner) {
      alert(`Người chiến thắng: ${result.winner}`);
      resetGame();
    }
  }
}

// Tính kết quả chiến đấu
function calculateBattleResult(data) {
  const p1Main = findCard(data.player1.main);
  const p2Main = findCard(data.player2.main);
  let p1Points = p1Main ? p1Main.main : 0;
  let p2Points = p2Main ? p2Main.main : 0;

  data.player1.supports.forEach(cardId => {
    const card = findCard(cardId);
    p1Points += card.support;
  });
  data.player2.supports.forEach(cardId => {
    const card = findCard(cardId);
    p2Points += card.support;
  });

  if (p1Points > p2Points) return { winner: data.player1.name };
  if (p2Points > p1Points) return { winner: data.player2.name };
  return { winner: null };
}

// Áp dụng kỹ năng lá bài
function applySkill(card, role) {
  const opponentRole = playerRole === 'player1' ? 'player2' : 'player1';
  if (role === 'main') {
    if (card.id === 'TCG-JS-01') {
      // Quân Mạc Tiếu: Đặt thêm 1 lá bài úp
      if (myDeck.length > 0) {
        const card = myDeck.shift();
        myCards.supports.push(card.id);
        appendCardToZone(card.id, playerRole === 'player1' ? '.z4p1' : '.z4p2', true);
      }
    } else if (card.id === 'TCG-JS-06') {
      // Sách Khắc Tát Nhĩ: Rút 2 thẻ, bỏ 1 thẻ
      if (myDeck.length > 0) drawCard();
      if (myDeck.length > 0) drawCard();
      if (myHand.length > 0) {
        const cardToDiscard = myHand.shift();
        discardPile.push(cardToDiscard);
      }
    } else if (card.id === 'TCG-JS-07') {
      // Nhất Thương Xuyên Vân: Đưa 2 lá bài đầu từ tay đối thủ vào khu bỏ bài
      const opponentHand = opponentCards.hand || [];
      if (opponentHand.length > 0) opponentHand.shift();
      if (opponentHand.length > 0) opponentHand.shift();
      updateFirebaseState();
    }
  } else if (role === 'support') {
    if (card.id === 'TCG-JS-18' && myCards.main === 'TCG-JS-01') {
      // Hàn Yên Nhu hỗ trợ Quân Mạc Tiếu: +1 điểm hỗ trợ
      card.support += 1;
    }
  }
}

// Rút bài chung
function drawCard() {
  if (myDeck.length === 0) return;
  const card = myDeck.shift();
  myHand.push(card);
  appendCardToHand(card, playerRole === 'player1' ? '.z6p1' : '.z6p2');
}

// Reset game
async function resetGame() {
  myDeck = cardData.sort(() => Math.random() - 0.5).slice(0, 3);
  myHand = [];
  discardPile = [];
  myCards = { main: null, supports: [] };
  await set(ref(db, `rooms/${roomId}/${playerRole}`), {
    name: playerName,
    cards: myDeck.map(c => c.id),
    hand: [],
    main: null,
    supports: [],
    ready: false
  });
}

export {};