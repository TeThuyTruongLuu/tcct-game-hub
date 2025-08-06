import { db } from './firebase.js';
import { ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

let cardData = [];
let myDeck = [];
let myHand = [];
let discardPile = [];
let roomId = '';
let playerRole = '';
let playerName = '';
let currentTurn = 'player1';
let opponentCards = { main: null, bottom: null, supports: [] };
let myCards = { main: null, bottom: null, supports: [] };
let mainCardsLocked = false;

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

  const res = await fetch('cards.json');
  cardData = await res.json();

  myDeck = createDeck(cardData);
  await set(ref(db, `rooms/${roomId}/${playerRole}`), {
    name,
    deck: myDeck.map(c => c.id),
    hand: [],
    main: null,
    bottom: null,
    supports: [],
    ready: false
  });

  initDeckView();
  initDropZones();
  initPlayerArea();
  listenToRoomChanges();
});

function createDeck(cards) {
  const deck = [];
  const availableCards = [...cards];
  const cardCount = {};
  let pairCount = 0;

  while (deck.length < 14 && availableCards.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableCards.length);
    const card = availableCards[randomIndex];
    const cardId = card.id;

    if (!cardCount[cardId]) cardCount[cardId] = 0;
    if (cardCount[cardId] < 2 && (cardCount[cardId] === 0 || pairCount < 3)) {
      deck.push({ ...card });
      cardCount[cardId]++;
      if (cardCount[cardId] === 2) pairCount++;
    }
    availableCards.splice(randomIndex, 1);
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function initDeckView() {
  const zoneP1 = document.querySelector('.z2p1');
  const zoneP2 = document.querySelector('.z2p2');
  zoneP1.innerHTML = `<img src="img/card-back.jpg" style="width:100%;height:100%;border-radius:0.5rem;cursor:pointer;" id="deckP1">`;
  zoneP2.innerHTML = `<img src="img/card-back.jpg" style="width:100%;height:100%;border-radius:0.5rem;cursor:pointer;" id="deckP2">`;

  document.getElementById('deckP1').addEventListener('click', drawCardP1);
  document.getElementById('deckP2').addEventListener('click', drawCardP2);
}

function initPlayerArea() {
  const playArea = document.querySelector('.play-area');
  const playerArea = document.createElement('div');
  playerArea.classList.add('player-area', playerRole === 'player1' ? 'player1-area' : 'player2-area');
  playArea.appendChild(playerArea);
}

function initDropZones() {
  const mainZone = playerRole === 'player1' ? '.z4p1' : '.z4p2';
  const bottomZone = playerRole === 'player1' ? '.z3p1' : '.z3p2';

  [mainZone, bottomZone].forEach(zone => {
    const z = document.querySelector(zone);
    z.classList.add('dashed');
    z.addEventListener('dragover', (e) => e.preventDefault());
    z.addEventListener('drop', (e) => handleDrop(e, zone));
  });
}

function listenToRoomChanges() {
  const roomRef = ref(db, `rooms/${roomId}`);
  onValue(roomRef, (snap) => {
    const data = snap.val();
    if (!data) return;

    const opponentRole = playerRole === 'player1' ? 'player2' : 'player1';
    opponentCards = {
      main: data[opponentRole]?.main || null,
      bottom: data[opponentRole]?.bottom || null,
      supports: data[opponentRole]?.supports || []
    };
    myDeck = data[playerRole]?.deck ? data[playerRole].deck.map(id => cardData.find(c => c.id === id)) : myDeck;
    currentTurn = data.currentTurn || 'player1';

    updateOpponentBoard();
    checkHandAndStartTurn(data);
    updateTurnIndicator();
  });
}

function updateOpponentBoard() {
  const mainZone = playerRole === 'player1' ? '.z4p2' : '.z4p1';
  const bottomZone = playerRole === 'player1' ? '.z3p2' : '.z3p1';

  const mainZ = document.querySelector(mainZone);
  mainZ.innerHTML = '';
  if (opponentCards.main) {
    appendCardToZone(opponentCards.main, mainZone, false, mainCardsLocked);
  } else if (!mainCardsLocked) {
    mainZ.innerHTML = `<img src="img/card-back.jpg" style="width:100%;height:100%;border-radius:0.5rem;">`;
  }

  const bottomZ = document.querySelector(bottomZone);
  bottomZ.innerHTML = '';
  if (opponentCards.bottom) {
    appendCardToZone(opponentCards.bottom, bottomZone, false, false);
  } else {
    bottomZ.innerHTML = `<img src="img/card-back.jpg" style="width:100%;height:100%;border-radius:0.5rem;">`;
  }
}

function updateTurnIndicator() {
  const turnIndicator = document.createElement('div');
  turnIndicator.style.position = 'absolute';
  turnIndicator.style.top = '50%';
  turnIndicator.style.left = '50%';
  turnIndicator.style.transform = 'translate(-50%, -50%)';
  turnIndicator.style.padding = '10px';
  turnIndicator.style.background = 'rgba(0, 0, 0, 0.7)';
  turnIndicator.style.color = 'white';
  turnIndicator.textContent = mainCardsLocked ? (currentTurn === playerRole ? 'Lượt của bạn' : 'Lượt của đối thủ') : 'Đang đặt bài lượt 1';
  document.querySelector('.play-area').appendChild(turnIndicator);
  setTimeout(() => turnIndicator.remove(), 2000);
}

function drawCardP1() {
  if (playerRole !== 'player1' || myHand.length >= 7 || myDeck.length === 0) return;
  drawCard();
  if (myHand.length === 7) alert('Bạn đã rút đủ 7 lá bài!');
}

function drawCardP2() {
  if (playerRole !== 'player2' || myHand.length >= 7 || myDeck.length === 0) return;
  drawCard();
  if (myHand.length === 7) alert('Bạn đã rút đủ 7 lá bài!');
}

async function drawCard() {
  if (myDeck.length === 0) return;
  const card = myDeck.shift();
  myHand.push(card);
  appendCardToHand(card, playerRole === 'player1' ? '.z6p1' : '.z6p2');
  await updateFirebaseState();
}

function findCard(cardId) {
  return cardData.find(c => c.id === cardId) || null;
}

function appendCardToHand(cardOrId, zoneSelector) {
  const card = typeof cardOrId === 'string' ? findCard(cardOrId) : cardOrId;
  if (!card) return;
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

function appendCardToZone(cardId, zoneSelector, isDraggable, showFace = true) {
  const card = findCard(cardId);
  if (!card) return;
  const zone = document.querySelector(zoneSelector);
  zone.innerHTML = '';

  const div = document.createElement('div');
  div.classList.add('card');
  div.style.setProperty('--i', '0');
  if (isDraggable) {
    div.setAttribute('draggable', 'true');
    div.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', card.id);
    });
  }
  div.dataset.id = card.id;

  const cardNumber = card.id.split('-').pop().padStart(2, '0');
  const imagePath = showFace ? `img/${cardNumber}.jpg` : 'img/card-back.jpg';

  div.innerHTML = `<img src="${imagePath}" alt="${card.name}" style="width:100%; height:100%; border-radius: 0.5rem;">`;
  zone.appendChild(div);
}

async function handleDrop(e, zoneSelector) {
  e.preventDefault();
  if (mainCardsLocked) return alert('Đã chốt bài lượt 1!');

  const cardId = e.dataTransfer.getData('text/plain');
  const card = findCard(cardId);
  if (!card) return;

  const handZone = playerRole === 'player1' ? '.z6p1' : '.z6p2';
  const mainZone = playerRole === 'player1' ? '.z4p1' : '.z4p2';
  const bottomZone = playerRole === 'player1' ? '.z3p1' : '.z3p2';

  if (zoneSelector === mainZone && !myCards.main) {
    myCards.main = cardId;
    myHand = myHand.filter(c => c.id !== cardId);
    const cardElement = document.querySelector(handZone).querySelector(`[data-id="${cardId}"]`);
    if (cardElement) cardElement.remove();
    appendCardToZone(cardId, mainZone, false, true);
  } else if (zoneSelector === bottomZone && !myCards.bottom) {
    myCards.bottom = cardId;
    myHand = myHand.filter(c => c.id !== cardId);
    const cardElement = document.querySelector(handZone).querySelector(`[data-id="${cardId}"]`);
    if (cardElement) cardElement.remove();
    appendCardToZone(cardId, bottomZone, false, true);
  } else {
    return;
  }

  await updateFirebaseState();
}

async function checkHandAndStartTurn(data) {
  if (data.player1 && data.player2 && data.player1.hand && data.player2.hand && data.player1.hand.length === 7 && data.player2.hand.length === 7 && !data.turnStarted) {
    await set(ref(db, `rooms/${roomId}/turnStarted`), true);
    const turnIndicator = document.createElement('div');
    turnIndicator.style.position = 'absolute';
    turnIndicator.style.top = '50%';
    turnIndicator.style.left = '50%';
    turnIndicator.style.transform = 'translate(-50%, -50%)';
    turnIndicator.style.padding = '10px';
    turnIndicator.style.background = 'rgba(0, 0, 0, 0.7)';
    turnIndicator.style.color = 'white';
    turnIndicator.textContent = 'Bắt đầu lượt 1!';
    document.querySelector('.play-area').appendChild(turnIndicator);
    setTimeout(() => turnIndicator.remove(), 2000);
  }

  if (data.player1?.ready && data.player2?.ready && !mainCardsLocked) {
    lockMainCards(data);
  }
}

async function lockMainCards(data) {
  mainCardsLocked = true;
  const mainZone = playerRole === 'player1' ? '.z4p1' : '.z4p2';
  const opponentMainZone = playerRole === 'player1' ? '.z4p2' : '.z4p1';

  if (myCards.main) {
    appendCardToZone(myCards.main, mainZone, false, true);
    applySkill(findCard(myCards.main), 'main');
  }
  if (opponentCards.main) {
    appendCardToZone(opponentCards.main, opponentMainZone, false, true);
    applySkill(findCard(opponentCards.main), 'main');
  }

  const p1Main = findCard(data.player1.main);
  const p2Main = findCard(data.player2.main);
  const p1Points = p1Main ? p1Main.main : 0;
  const p2Points = p2Main ? p2Main.main : 0;

  const newTurn = p1Points >= p2Points ? 'player1' : 'player2';
  await set(ref(db, `rooms/${roomId}/currentTurn`), newTurn);
  currentTurn = newTurn;
  updateTurnIndicator();
}

async function updateFirebaseState() {
  const state = {
    name: playerName,
    deck: myDeck.map(c => c.id),
    hand: myHand.map(c => c.id),
    main: myCards.main,
    bottom: myCards.bottom,
    supports: myCards.supports,
    ready: myCards.main && myCards.bottom
  };
  await set(ref(db, `rooms/${roomId}/${playerRole}`), state);
}

function applySkill(card, role) {
  if (!card) return;
  const opponentRole = playerRole === 'player1' ? 'player2' : 'player1';
  if (role === 'main') {
    if (card.id === 'TCG-JS-01') {
      if (myDeck.length > 0) {
        const card = myDeck.shift();
        myCards.supports.push(card.id);
        appendCardToZone(card.id, playerRole === 'player1' ? '.z4p1' : '.z4p2', false, false);
        updateFirebaseState();
      }
    } else if (card.id === 'TCG-JS-06') {
      if (myDeck.length > 0) {
        drawCard();
      }
      if (myDeck.length > 0) {
        drawCard();
      }
      if (myHand.length > 0) {
        const cardToDiscard = myHand.shift();
        discardPile.push(cardToDiscard);
      }
      updateFirebaseState();
    } else if (card.id === 'TCG-JS-07') {
      const opponentHand = opponentCards.hand || [];
      if (opponentHand.length > 0) opponentHand.shift();
      if (opponentHand.length > 0) opponentHand.shift();
      updateFirebaseState();
    }
  }
}

async function resetGame() {
  myDeck = createDeck(cardData);
  myHand = [];
  discardPile = [];
  myCards = { main: null, bottom: null, supports: [] };
  mainCardsLocked = false;
  await set(ref(db, `rooms/${roomId}/${playerRole}`), {
    name: playerName,
    deck: myDeck.map(c => c.id),
    hand: [],
    main: null,
    bottom: null,
    supports: [],
    ready: false
  });
}

export {};