import { db } from './firebase.js';
import { ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

// Ví dụ tạo room
const roomId = 'room123';
set(ref(db, `rooms/${roomId}/player1`), {
  name: 'Player1',
  cards: ['TCG-JS-01', 'TCG-JS-03', 'TCG-JS-05'],
  ready: false
});

//Player 1
let player1Deck = [];
let player1Hand = [];

async function initDeck() {
  const res = await fetch('cards.json');
  const allCards = await res.json();
  
  // Lấy ngẫu nhiên 3 lá
  player1Deck = allCards
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  // Gắn mặt sau ở zone z2p1
  const z2 = document.querySelector('.z2p1');
  z2.innerHTML = `<img src="img/card-back.jpg" style="width:100%;height:100%;border-radius:0.5rem;cursor:pointer;" id="deckP1">`;

  document.getElementById('deckP1').addEventListener('click', drawCard);
}

function drawCard() {
  if (player1Deck.length === 0) return;

  player1Deck.sort(() => Math.random() - 0.5);
  const card = player1Deck.shift();
  player1Hand.push(card);

  const z6 = document.querySelector('.z6p1');

  const div = document.createElement('div');
  div.classList.add('card');
  div.setAttribute('draggable', 'true');
  div.dataset.id = card.id;
  div.style.marginRight = '0.5vw'; // khoảng cách giữa các thẻ

  div.innerHTML = `<img src="${card.image}" alt="${card.name}" style="width:100%; height:100%; border-radius: 0.5rem;">`;

  div.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', card.id);
  });

  z6.appendChild(div);
}

function drawCardP2() {
  if (player2Deck.length === 0) return;

  player2Deck.sort(() => Math.random() - 0.5);
  const card = player2Deck.shift();
  player2Hand.push(card);

  const z6 = document.querySelector('.z6p2');

  const div = document.createElement('div');
  div.classList.add('card');
  div.setAttribute('draggable', 'true');
  div.dataset.id = card.id;
  div.style.marginRight = '0.5vw';

  div.innerHTML = `<img src="${card.image}" alt="${card.name}" style="width:100%; height:100%; border-radius: 0.5rem;">`;

  div.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', card.id);
  });

  z6.appendChild(div);
}

//Player 2
let player2Deck = [];
let player2Hand = [];

async function initDeckP2() {
  const res = await fetch('cards.json');
  const allCards = await res.json();

  player2Deck = allCards
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const z2 = document.querySelector('.z2p2');
  z2.innerHTML = `<img src="img/card-back.jpg" style="width:100%;height:100%;border-radius:0.5rem;cursor:pointer;" id="deckP2">`;

  document.getElementById('deckP2').addEventListener('click', drawCardP2);
}

initDeck();
initDeckP2();
export {};