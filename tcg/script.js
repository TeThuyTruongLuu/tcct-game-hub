// ===== PHẦN 1: CORE & STATE =====
import { db } from './firebase.js'
import { ref, set, get, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js'

const MAX_HAND = 7
const WIN_TARGET = 3
const MAX_SUPPORT_SLOTS = 2
const SOURCE_HAND = 'hand'
const SOURCE_DECK_TOP = 'deckTop'
const TRIGGER_MAIN = 'main'
const TRIGGER_SUPPORT = 'support'
const TRIGGER_BOTTOM = 'bottom'

const ZONES = {
	p1: { discard: '.z1p1', deck: '.z2p1', bottom: '.z3p1', main: '.z4p1', won: '.z5p1', hand: '.z6p1' },
	p2: { discard: '.z1p2', deck: '.z2p2', bottom: '.z3p2', main: '.z4p2', won: '.z5p2', hand: '.z6p2' }
}

const G = {
	roomId: '',
	role: '',
	name: '',
	cards: [],
	me: { deck: [], hand: [], main: null, bottom: null, supports: [], wonPile: [], discard: [] },
	opp: { deck: [], hand: [], main: null, bottom: null, supports: [], wonPile: [], discard: [] },
	game: {
		turn: 'player1',
		round: 1,
		wins: { player1: 0, player2: 0 },
		flags: { supportLimit: null, supportBanThreshold: null, banDraw: false },
		reveal: { p1BottomRevealedToP2: false, p2BottomRevealedToP1: false }
	},
	roundModifiers: { player1: { main: 0, supports: [] }, player2: { main: 0, supports: [] } }
}

function r() {
	const a = Array.from(arguments)
	return ref(db, a.join('/'))
}

async function dbSet(pathArr, val) {
	return set(r(...pathArr), val)
}

async function dbGet(pathArr) {
	const s = await get(r(...pathArr))
	return s.val()
}

function dbOn(pathArr, cb) {
	return onValue(r(...pathArr), snap => cb(snap.val()))
}

function Q(sel) {
	return document.querySelector(sel)
}

function QA(sel) {
	return Array.from(document.querySelectorAll(sel))
}

function cardById(id) {
	return G.cards.find(c => c.id === id) || null
}

function imgPathFor(id, faceUp) {
	if (!id) return 'img/card-back.jpg'
	const num = id.split('-').pop().padStart(2, '0')
	return faceUp ? `img/${num}.jpg` : 'img/card-back.jpg'
}

async function loadCards() {
	const res = await fetch('cards.json')
	G.cards = await res.json()
	return G.cards
}

// ===== PHẦN 2: LOBBY & BOOTSTRAP =====
document.getElementById('joinBtn').addEventListener('click', async () => {
	const name = document.getElementById('nameInput').value.trim()
	const room = document.getElementById('roomInput').value.trim()
	if (!name || !room) return

	G.name = name
	G.roomId = room
	await loadCards()

	const data = await dbGet(['rooms', G.roomId]) || {}
	const role = await pickRole(data, name)
	if (!role) return
	G.role = role

	await ensureRoomScaffold(data)
	await ensurePlayerNode(data)

	document.getElementById('lobby').classList.add('hidden')
	document.querySelector('.play-area').classList.remove('hidden')
})

async function pickRole(data, name) {
	const p1 = data?.player1?.name || null
	const p2 = data?.player2?.name || null
	if (p1 === name) return 'player1'
	if (p2 === name) return 'player2'
	if (!p1) return 'player1'
	if (!p2) return 'player2'
	return null
}

async function ensureRoomScaffold(data) {
	if (!data?.gameState) {
		await dbSet(['rooms', G.roomId, 'gameState'], {
		turn: 'player1',
		round: 1,
		wins: { player1: 0, player2: 0 },
		flags: { supportLimit: null, supportBanThreshold: null, banDraw: false },
		reveal: { p1BottomRevealedToP2: false, p2BottomRevealedToP1: false }
		})
	}
	if (!data?.roundModifiers) {
		await dbSet(['rooms', G.roomId, 'roundModifiers'], {
		player1: { main: 0, supports: [] },
		player2: { main: 0, supports: [] }
		})
	}
}

async function ensurePlayerNode(data) {
	const node = data?.[G.role]
	if (node?.name === G.name) {
		G.me.deck = (node.deck || []).slice()
		G.me.hand = (node.hand || []).slice()
		G.me.main = node.main || null
		G.me.bottom = node.bottom || null
		G.me.supports = Array.isArray(node.supports) ? node.supports.slice(0, 2) : []
		G.me.wonPile = node.wonPile || []
		G.me.discard = node.discard || []
	} else {
		const deck = buildDeck30(G.cards)
		G.me.deck = deck.map(c => c.id)
		G.me.hand = []
		G.me.main = null
		G.me.bottom = null
		G.me.supports = []
		G.me.wonPile = []
		G.me.discard = []
		await dbSet(['rooms', G.roomId, G.role], {
		name: G.name,
		deck: G.me.deck,
		hand: [],
		main: null,
		bottom: null,
		supports: [],
		wonPile: [],
		discard: [],
		ready: false
		})
	}
	await dbSet(['rooms', G.roomId, G.role, 'name'], G.name)
}

function buildDeck30(cards) {
	const countByName = {}
	const deck = []
	let pool = [...cards].sort(() => Math.random() - 0.5)

	while (deck.length < 30) {
		if (pool.length === 0) {
		pool = cards.filter(c => (countByName[c.name] || 0) < 2)
                   .sort(() => Math.random() - 0.5)
		if (pool.length === 0) break
		}
		const c = pool.pop()
		const n = countByName[c.name] || 0
		if (n < 2) {
			deck.push(c)
			countByName[c.name] = n + 1
		}
	}
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[deck[i], deck[j]] = [deck[j], deck[i]]
	}
	return deck
}

async function drawUntil7Bootstrap() {
	let hand = (await dbGet(['rooms', G.roomId, G.role, 'hand'])) || []
	let deck = (await dbGet(['rooms', G.roomId, G.role, 'deck'])) || []
	while (hand.length < MAX_HAND && deck.length > 0) {
		const top = deck.shift()
		hand.push(top)
	}
	await dbSet(['rooms', G.roomId, G.role, 'deck'], deck)
	await dbSet(['rooms', G.roomId, G.role, 'hand'], hand)
}

// ===== PHẦN 3: RENDER SHELL =====
let DOMC = null

function cacheDOM() {
	const mine = G.role === 'player1' ? ZONES.p1 : ZONES.p2
	const opp = G.role === 'player1' ? ZONES.p2 : ZONES.p1
	DOMC = {
		play: document.querySelector('.play-area'),
		my: {
			discard: document.querySelector(mine.discard),
			deck: document.querySelector(mine.deck),
			bottom: document.querySelector(mine.bottom),
			main: document.querySelector(mine.main),
			won: document.querySelector(mine.won),
			hand: document.querySelector(mine.hand)
		},
		opp: {
			discard: document.querySelector(opp.discard),
			deck: document.querySelector(opp.deck),
			bottom: document.querySelector(opp.bottom),
			main: document.querySelector(opp.main),
			won: document.querySelector(opp.won),
			hand: document.querySelector(opp.hand)
		}
	}
}

function ensureScoreBoxes() {
	if (!document.querySelector('.score-p1')) {
		const d1 = document.createElement('div')
		d1.className = 'score-display score-p1'
		d1.innerHTML = `<div class="name">Player 1</div><div class="row main">Điểm chiến tướng: 0</div><div class="row support">Điểm hỗ trợ: 0</div>`
		DOMC.play.appendChild(d1)
	}
	if (!document.querySelector('.score-p2')) {
		const d2 = document.createElement('div')
		d2.className = 'score-display score-p2'
		d2.innerHTML = `<div class="name">Player 2</div><div class="row main">Điểm chiến tướng: 0</div><div class="row support">Điểm hỗ trợ: 0</div>`
		DOMC.play.appendChild(d2)
	}
}

function setZoneSingleCard(zoneEl, cardId, faceUp, draggable) {
	zoneEl.innerHTML = ''
	const d = document.createElement('div')
	d.className = 'card'
	if (cardId) {
		d.dataset.id = cardId
		d.innerHTML = `<img src="${imgPathFor(cardId, faceUp)}" style="width:100%;height:100%;border-radius:0.5rem;">`
		if (draggable) {
			d.setAttribute('draggable', 'true')
			d.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', cardId))
		}
		const c = cardById(cardId)
		if (c) {
			d.addEventListener('mouseenter', () => showCardTip(c))
			d.addEventListener('mouseleave', hideCardTip)
		}
	}
	zoneEl.appendChild(d)
}

const STACKZ_BASE = 100
const STACKZ = { me: STACKZ_BASE, opp: STACKZ_BASE }

function bringToFront(el, side) {
	const key = side === 'opp' ? 'opp' : 'me'
	const cur = typeof STACKZ[key] === 'number' ? STACKZ[key] : STACKZ_BASE
	STACKZ[key] = Math.max(cur, STACKZ_BASE) + 1
	el.style.zIndex = String(STACKZ[key])
}

function setStackTop(zoneEl, cardId, faceUp, draggable) {
	let slot = zoneEl.querySelector('.card[data-slot="0"]')
	if (!slot) {
		zoneEl.innerHTML = ''
		slot = document.createElement('div')
		slot.className = 'card main-card'
		slot.dataset.slot = '0'
		slot.style.setProperty('--i', '0')
		zoneEl.appendChild(slot)
	}
	if (!cardId) {
		slot.innerHTML = '';
		slot.removeAttribute('data-id');
		slot.onmouseenter = null;
		slot.onmouseleave = null;
		return;
	}
	slot.dataset.id = cardId
	slot.innerHTML = `<img src="${imgPathFor(cardId, faceUp)}" style="width:100%;height:100%;border-radius:0.5rem;">`
	slot.style.zIndex = ''
	
	const ci = cardById(cardId);
	if (ci) {
		slot.onmouseenter = () => showCardTip(ci);
		slot.onmouseleave = hideCardTip;
	}
	if (draggable) {
		slot.setAttribute('draggable','true');
		slot.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', cardId));
	}
}

function setSupportSlot(zoneEl, slotIndex, cardId, faceUp, side) {
	let slot = zoneEl.querySelector(`.card[data-slot="${slotIndex}"]`)
	if (!slot) {
		slot = document.createElement('div')
		slot.className = 'card support-card'
		slot.dataset.slot = String(slotIndex)
		zoneEl.appendChild(slot)
  }
	if (!cardId) {
		slot.innerHTML = ''
		slot.removeAttribute('data-id')
		slot.classList.remove('support-active')
		slot.style.removeProperty('z-index')
		slot.onmouseenter = null;
		slot.onmouseleave = null;
		return
	}
	slot.dataset.id = cardId
	slot.innerHTML = `<img src="${imgPathFor(cardId, faceUp)}" style="width:100%;height:100%;border-radius:0.5rem;">`
	slot.classList.add('support-active')
	const ci = cardById(cardId);
	if (ci) {
		slot.onmouseenter = () => showCardTip(ci);
		slot.onmouseleave = hideCardTip;
	}
	bringToFront(slot, side)
}

function renderSupportSlots(side, ids) {
	const zone = side === 'me' ? DOMC.my.main : DOMC.opp.main
	const face = true
	setSupportSlot(zone, 1, ids?.[0] || null, face, side)
	setSupportSlot(zone, 2, ids?.[1] || null, face, side)
}

function renderHand(side, cards) {
	const zone = side === 'me' ? DOMC.my.hand : DOMC.opp.hand
	zone.innerHTML = ''
	cards.forEach(id => {
		const d = document.createElement('div')
		d.className = 'card'
		const face = side === 'me'
		d.innerHTML = `<img src="${imgPathFor(id, face)}" style="width:100%;height:100%;border-radius:0.5rem;">`
		if (side === 'me') {
			d.dataset.id = id
			d.setAttribute('draggable', 'true')
			d.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', id))
		const c = cardById(id)
		if (c) {
			d.addEventListener('mouseenter', () => showCardTip(c))
			d.addEventListener('mouseleave', hideCardTip)
		}
		}
		zone.appendChild(d)
	})
}

function renderSupports(side, ids) {
	const zone = side === 'me' ? DOMC.my.won : DOMC.opp.won
	zone.innerHTML = ''
	for (let i = 0; i < 3; i++) {
		const d = document.createElement('div')
		d.className = 'card'
		d.style.setProperty('--i', i)
		zone.appendChild(d)
	}
	ids.slice(0, 3).forEach((id, i) => {
		const face = true
		const slot = zone.querySelectorAll('.card')[i]
		if (!slot) return
		slot.dataset.id = id
		slot.innerHTML = `<img src="${imgPathFor(id, face)}" style="width:100%;height:100%;border-radius:0.5rem;">`
		const c = cardById(id)
		if (c) {
			slot.addEventListener('mouseenter', () => showCardTip(c))
			slot.addEventListener('mouseleave', hideCardTip)
		}
	})
}

function renderWonPile(side, ids) {
	const zone = side === 'me' ? DOMC.my.won : DOMC.opp.won
	zone.innerHTML = ''
	for (let i = 0; i < 3; i++) {
		const d = document.createElement('div')
		d.className = 'card'
		d.style.setProperty('--i', i)
		zone.appendChild(d)
	}
	ids.slice(0, 3).forEach((id, i) => {
		const face = true
		const slot = zone.querySelectorAll('.card')[i]
		if (!slot) return
		slot.dataset.id = id
		slot.innerHTML = `<img src="${imgPathFor(id, face)}" style="width:100%;height:100%;border-radius:0.5rem;">`
		const c = cardById(id)
		if (c) {
			slot.addEventListener('mouseenter', () => showCardTip(c))
			slot.addEventListener('mouseleave', hideCardTip)
		}
	})
}

function computeMainPoints(ids) {
	let s = 0
	ids.forEach(id => {
		const c = cardById(id)
		if (c && typeof c.main === 'number') s += c.main
	})
	return s
}

function computeSupportPoints(ids) {
	let s = 0
	ids.forEach(id => {
		const c = cardById(id)
		if (c && typeof c.support === 'number') s += c.support
	})
	return s
}

function currentScoresView() {
	let p1m = 0, p2m = 0, p1s = 0, p2s = 0
	if (G.game.mainRevealed) {
		const p1MainId = G.role === 'player1' ? G.me.main : G.opp.main
		const p2MainId = G.role === 'player2' ? G.me.main : G.opp.main
		p1m = p1MainId ? (cardById(p1MainId)?.main || 0) : 0
		p2m = p2MainId ? (cardById(p2MainId)?.main || 0) : 0
		p1s += p1MainId ? (cardById(p1MainId)?.support || 0) : 0
		p2s += p2MainId ? (cardById(p2MainId)?.support || 0) : 0
	}
	const p1SuppIds = G.role === 'player1' ? (G.me.supports || []) : (G.opp.supports || [])
	const p2SuppIds = G.role === 'player2' ? (G.me.supports || []) : (G.opp.supports || [])
	p1s += computeSupportPoints(p1SuppIds)
	p2s += computeSupportPoints(p2SuppIds)
	return { p1m, p1s, p2m, p2s }
}

function renderScores(names) {
	ensureScoreBoxes()
	const box1 = document.querySelector('.score-p1')
	const box2 = document.querySelector('.score-p2')
	if (names?.p1) box1.querySelector('.name').textContent = names.p1
	if (names?.p2) box2.querySelector('.name').textContent = names.p2
	const sc = currentScoresView()
	box1.querySelector('.main').textContent = `Điểm chiến tướng: ${sc.p1m}`
	box1.querySelector('.support').textContent = `Điểm hỗ trợ: ${sc.p1s}`
	box2.querySelector('.main').textContent = `Điểm chiến tướng: ${sc.p2m}`
	box2.querySelector('.support').textContent = `Điểm hỗ trợ: ${sc.p2s}`
}

function showCardTip(card) {
	hideCardTip()
	const tip = document.createElement('div')
	tip.className = `card-info ${G.role === 'player1' ? 'p1' : 'p2'}`
	tip.innerHTML = `<h3>${card.name}</h3><p>Người điều khiển: ${card.char}</p><p>Điểm chiến tướng: ${card.main}</p><p>Điểm hỗ trợ: ${card.support}</p><p>${card.describe || ''}</p>`
	DOMC.play.appendChild(tip)
}

function hideCardTip() {
	const tip = document.querySelector('.card-info')
	if (tip) tip.remove()
}

function renderDeckBacks() {
  if (DOMC.my.deck) {
    DOMC.my.deck.innerHTML = `<img src="img/card-back.jpg" style="width:100%;height:100%;border-radius:0.5rem;cursor:pointer">`
    DOMC.my.deck.onclick = () => drawOneToHand(G.role)
  }
  if (DOMC.opp.deck) {
    DOMC.opp.deck.innerHTML = `<img src="img/card-back.jpg" style="width:100%;height:100%;border-radius:0.5rem;">`
    DOMC.opp.deck.onclick = null
  }
}

async function drawOneToHand(player) {
  const room = await dbGet(['rooms', G.roomId]) || {}
  const node = room[player] || {}
  const gs = room.gameState || {}
  if (gs.flags?.banDraw) return
  const hand = Array.isArray(node.hand) ? node.hand.slice() : []
  const deck = Array.isArray(node.deck) ? node.deck.slice() : []
  if (hand.length >= MAX_HAND || deck.length === 0) return
  hand.push(deck.shift())
  await dbSet(['rooms', G.roomId, player, 'hand'], hand)
  await dbSet(['rooms', G.roomId, player, 'deck'], deck)
}

function renderBoardSkeleton() {
	cacheDOM()
	renderDeckBacks()
	setStackTop(DOMC.my.main, null, false, false)
	setZoneSingleCard(DOMC.my.bottom, null, false, false)
	renderWonPile('me', [])
	setStackTop(DOMC.opp.main, null, false, false)
	setZoneSingleCard(DOMC.opp.bottom, null, false, false)
	renderWonPile('opp', [])
	renderHand('me', G.me.hand || [])
	renderHand('opp', (G.opp.hand || []).map(() => 'card-back'))
	renderScores()
}

// ===== PHẦN 4: SYNC LAYER =====
let roomUnsub = null

function roles() {
	const mine = G.role
	const opp = G.role === 'player1' ? 'player2' : 'player1'
	return { mine, opp }
}

function startSync() {
	if (roomUnsub) return
	roomUnsub = dbOn(['rooms', G.roomId], onRoomSnapshot)
}

function onRoomSnapshot(data) {
	if (!data) return
	const { mine, opp } = roles()
	const meNode = data[mine] || {}
	const oppNode = data[opp] || {}
	const gs = data.gameState || G.game
	const rm = data.roundModifiers || G.roundModifiers

	G.game = {
		turn: gs.turn || 'player1',
		round: gs.round || 1,
		wins: gs.wins || { player1: 0, player2: 0 },
		flags: gs.flags || { supportLimit: null, supportBanThreshold: null, banDraw: false },
		reveal: gs.reveal || { p1BottomRevealedToP2: false, p2BottomRevealedToP1: false },
		mainRevealed: !!gs.mainRevealed,
		supportPass: gs.supportPass || { player1: false, player2: false },
		supportPhaseEnded: !!gs.supportPhaseEnded,
		computed: gs.computed || { p1: { main: 0, support: 0 }, p2: { main: 0, support: 0 } }
	}
	G.roundModifiers = {
		player1: normalizeRoundMods(rm.player1),
		player2: normalizeRoundMods(rm.player2)
	}

	G.me.deck = (meNode.deck || []).slice()
	G.me.hand = (meNode.hand || []).slice()
	G.me.main = meNode.main || null
	G.me.bottom = meNode.bottom || null
	G.me.supports = Array.isArray(meNode.supports) ? meNode.supports.slice(0, 2) : []
	G.me.wonPile = meNode.wonPile || []
	G.me.discard = meNode.discard || []

	G.opp.deck = (oppNode.deck || []).slice()
	G.opp.hand = (oppNode.hand || []).slice()
	G.opp.main = oppNode.main || null
	G.opp.bottom = oppNode.bottom || null
	G.opp.supports = Array.isArray(oppNode.supports) ? oppNode.supports.slice(0, 2) : []
	G.opp.wonPile = oppNode.wonPile || []
	G.opp.discard = oppNode.discard || []

	reconcileBoard(data)
}

function normalizeRoundMods(m) {
	const base = { main: 0, supports: [] }
	if (!m) return base
	return {
		main: typeof m.main === 'number' ? m.main : 0,
		supports: Array.isArray(m.supports) ? m.supports.map(x => ({ slot: x.slot, delta: x.delta, source: x.source })) : []
	}
}

function faceForMain() {
	return !!G.game.mainRevealed
}

function faceForBottom(side) {
	const r = G.game.reveal
	if (side === 'me') return false
	if (G.role === 'player1') return !!r.p1BottomRevealedToP2
	return !!r.p2BottomRevealedToP1
}

function reconcileBoard(data) {
	if (!DOMC) renderBoardSkeleton()

	const { mine, opp } = roles()
	const p1Name = data.player1?.name || 'Player 1'
	const p2Name = data.player2?.name || 'Player 2'
	renderScores({ p1: p1Name, p2: p2Name })

	const myMainFace = true
	const oppMainFace = faceForMain('opp')
	setStackTop(DOMC.my.main, G.me.main, myMainFace, false)
	setStackTop(DOMC.opp.main, G.opp.main, oppMainFace, false)

	const myBottomFace = true
	const oppBottomFace = faceForBottom('opp')
	setZoneSingleCard(DOMC.my.bottom, G.me.bottom, myBottomFace, false)
	setZoneSingleCard(DOMC.opp.bottom, G.opp.bottom, oppBottomFace, false)

	STACKZ.me = STACKZ_BASE
	STACKZ.opp = STACKZ_BASE
	setStackTop(DOMC.my.main, G.me.main, true, false)
	setStackTop(DOMC.opp.main, G.opp.main, faceForMain(), false)
	renderSupportSlots('me', G.me.supports || [])
	renderSupportSlots('opp', G.opp.supports || [])

	renderHand('me', G.me.hand)
	renderHand('opp', G.opp.hand.map(() => 'card-back'))

	renderWonPile('me', G.me.wonPile || [])
	renderWonPile('opp', G.opp.wonPile || [])

	updateScoreBoxesWithModifiers()
	showTurnToast()
}

function updateScoreBoxesWithModifiers() {
	const sc = currentScoresView()
	const rm = G.roundModifiers
	const p1m = sc.p1m + (rm.player1?.main || 0)
	const p2m = sc.p2m + (rm.player2?.main || 0)
	const p1s = sc.p1s + (Array.isArray(rm.player1?.supports) ? rm.player1.supports.reduce((s,x)=>s+(x?.delta||0),0) : 0)
	const p2s = sc.p2s + (Array.isArray(rm.player2?.supports) ? rm.player2.supports.reduce((s,x)=>s+(x?.delta||0),0) : 0)
	const box1 = document.querySelector('.score-p1')
	const box2 = document.querySelector('.score-p2')
	if (!box1 || !box2) return
	box1.querySelector('.main').textContent = `Điểm chiến tướng: ${p1m}`
	box1.querySelector('.support').textContent = `Điểm hỗ trợ: ${p1s}`
	box2.querySelector('.main').textContent = `Điểm chiến tướng: ${p2m}`
	box2.querySelector('.support').textContent = `Điểm hỗ trợ: ${p2s}`
}

let turnToastTimer = null
function showTurnToast() {
	const d = document.createElement('div')
	d.style.position = 'absolute'
	d.style.top = '50%'
	d.style.left = '50%'
	d.style.transform = 'translate(-50%, -50%)'
	d.style.padding = '10px'
	d.style.background = 'rgba(0,0,0,0.7)'
	d.style.color = 'white'
	d.style.zIndex = '500'
	const mine = G.role
	d.textContent = G.game.turn === mine ? 'Lượt của bạn' : 'Lượt của đối thủ'
	DOMC.play.appendChild(d)
	clearTimeout(turnToastTimer)
	turnToastTimer = setTimeout(() => d.remove(), 1200)
}

// ===== PHẦN 5: ROUND PREP (MAIN + BOTTOM, LẬT MAIN) =====
let prepBound = false

function setupRoundPrepDnD() {
	if (prepBound) return
	cacheDOM()
	const myMainZone = DOMC.my.main
	const myBottomZone = DOMC.my.bottom
	;[myMainZone, myBottomZone].forEach(z => {
		z.classList.add('dashed')
		z.addEventListener('dragover', e => e.preventDefault())
		z.addEventListener('drop', onDropPrep)
	})
	ensureReadyButton()
	startSync()
	prepBound = true
}

function onDropPrep(e) {
	e.preventDefault()
	const id = e.dataTransfer.getData('text/plain')
	if (!id) return
	const inHand = G.me.hand.includes(id)
	if (!inHand) return
	const isMainZone = e.currentTarget === DOMC.my.main
	const isBottomZone = e.currentTarget === DOMC.my.bottom
	if (!isMainZone && !isBottomZone) return
	if (isMainZone && G.me.main) return
	if (isBottomZone && G.me.bottom) return
	const newHand = G.me.hand.filter(x => x !== id)
	const updates = { hand: newHand }
	if (isMainZone) updates.main = id
	if (isBottomZone) updates.bottom = id
	dbSet(['rooms', G.roomId, G.role], { ...getPlayerNodeLocal(), ...updates, ready: false })
}

function ensureReadyButton() {
	if (document.querySelector('.prep-ready')) return
	const btn = document.createElement('button')
	btn.textContent = 'Sẵn sàng'
	btn.className = `tcg-btn ready prep-ready ${G.role === 'player1' ? 'btn-p1' : 'btn-p2'}`
	btn.addEventListener('click', onClickReadyPrep)
	DOMC.play.appendChild(btn)
}

function onClickReadyPrep() {
	if (!G.me.main || !G.me.bottom) return
	dbSet(['rooms', G.roomId, G.role, 'ready'], true).then(() => {
		evaluateRevealGate()
	})
}

function evaluateRevealGate() {
	dbGet(['rooms', G.roomId]).then(data => {
		const p1 = data?.player1 || {}
		const p2 = data?.player2 || {}
		const bothPlaced = !!p1.main && !!p1.bottom && !!p2.main && !!p2.bottom
		const bothReady = !!p1.ready && !!p2.ready
		const revealed = !!data?.gameState?.mainRevealed
		if (bothPlaced && bothReady && !revealed) {
			lockAndRevealMain()
		}
	})
}

async function lockAndRevealMain() {
	const data = await dbGet(['rooms', G.roomId])
	const p1 = data?.player1 || {}
	const p2 = data?.player2 || {}
	const p1Card = cardById(p1.main)
	const p2Card = cardById(p2.main)
	await dbSet(['rooms', G.roomId, 'gameState', 'mainRevealed'], true)
	if (p1Card) await applyCardSkill(p1Card, TRIGGER_MAIN, buildCtx('player1'))
	if (p2Card) await applyCardSkill(p2Card, TRIGGER_MAIN, buildCtx('player2'))
	await scoreRound()
	const after = await dbGet(['rooms', G.roomId])
	const turn = decideTurnFromMain(after)
	await dbSet(['rooms', G.roomId, 'gameState', 'turn'], turn)
	logStep(`Quyền đi trước: ${turn === 'player1' ? 'P1' : 'P2'}`)
}

function decideTurnFromMain(snapshot) {
	const comp = snapshot?.gameState?.computed
	if (comp && snapshot?.gameState?.mainRevealed) {
		const p1m = comp.p1?.main || 0
		const p2m = comp.p2?.main || 0
		if (p1m > p2m) return 'player1'
		if (p2m > p1m) return 'player2'
		const p1s = comp.p1?.support || 0
		const p2s = comp.p2?.support || 0
		if (p1s > p2s) return 'player1'
		if (p2s > p1s) return 'player2'
		return 'player1'
  }
	const p1Id = snapshot?.player1?.main || null
	const p2Id = snapshot?.player2?.main || null
	const rm = snapshot?.roundModifiers || { player1: { main: 0, supports: [] }, player2: { main: 0, supports: [] } }
	const p1m = (p1Id ? (cardById(p1Id)?.main || 0) : 0) + (rm.player1?.main || 0)
	const p2m = (p2Id ? (cardById(p2Id)?.main || 0) : 0) + (rm.player2?.main || 0)
	if (p1m > p2m) return 'player1'
	if (p2m > p1m) return 'player2'
	const p1s = (p1Id ? (cardById(p1Id)?.support || 0) : 0) + (Array.isArray(rm.player1?.supports) ? rm.player1.supports.reduce((s,x)=>s+(x?.delta||0),0) : 0)
	const p2s = (p2Id ? (cardById(p2Id)?.support || 0) : 0) + (Array.isArray(rm.player2?.supports) ? rm.player2.supports.reduce((s,x)=>s+(x?.delta||0),0) : 0)
	if (p1s > p2s) return 'player1'
	if (p2s > p1s) return 'player2'
	return 'player1'
}

function getPlayerNodeLocal() {
	return {
		name: G.name,
		deck: G.me.deck,
		hand: G.me.hand,
		main: G.me.main,
		bottom: G.me.bottom,
		supports: G.me.supports,
		wonPile: G.me.wonPile,
		discard: G.me.discard
	}
}

function buildCtx(owner) {
	const opp = owner === 'player1' ? 'player2' : 'player1'
	return {
		roomId: G.roomId,
		owner,
		opponent: opp,
		state: () => G,
		setMods: ms => dbSet(['rooms', G.roomId, 'roundModifiers'], ms),
		setGame: gs => dbSet(['rooms', G.roomId, 'gameState'], gs),
		setPlayer: (who, obj) => dbSet(['rooms', G.roomId, who], obj),
		getRoom: () => dbGet(['rooms', G.roomId])
	}
}

// ===== PHẦN 6: SUPPORT PHASE =====
let supportBound = false

function setupSupportPhaseDnD() {
	if (supportBound) return
	cacheDOM()
	const zone = DOMC.my.main
	zone.addEventListener('dragover', e => e.preventDefault())
	zone.addEventListener('drop', onDropSupport)
	ensurePassButton()
	supportBound = true
}

function onDropSupport(e) {
	e.preventDefault()
	const id = e.dataTransfer.getData('text/plain')
	if (!id) return
	if (!G.me.hand.includes(id)) return
	if (G.game.turn !== G.role) return
	const card = cardById(id)
	if (!card) return
	if (!canPlaySupportFromHand(G.role, card)) return
	const slot = ((G.me.supports || []).length < MAX_SUPPORT_SLOTS) ? (G.me.supports.length + 1) : null
	if (!slot) return
	playSupport(G.role, id, slot, SOURCE_HAND)
}

function ensurePassButton() {
	if (document.querySelector('.support-pass')) return
	const btn = document.createElement('button')
	btn.textContent = 'Dừng hỗ trợ'
	btn.className = `tcg-btn pass support-pass ${G.role === 'player1' ? 'btn-p1' : 'btn-p2'}`
	btn.addEventListener('click', () => endSupportPhase(G.role))
	DOMC.play.appendChild(btn)
}

function canPlaySupportFromHand(player, card) {
	const flags = G.game.flags || {}
	if (typeof flags.supportBanThreshold === 'number') {
		if ((card.support || 0) >= flags.supportBanThreshold) return false
	}
	const limit = flags.supportLimit
	if (typeof limit === 'number') {
		const key = player === 'player1' ? 'p1' : 'p2'
		const counts = G.game.handSupportCount || { p1: 0, p2: 0 }
		if ((counts[key] || 0) >= limit) return false
	}
	if ((G.me.supports || []).length >= MAX_SUPPORT_SLOTS) return false
	return true
}

async function playSupport(player, cardId, slot, source) {
	const room = await dbGet(['rooms', G.roomId]) || {}
	const meNode = room[player] || {}
	const hand = Array.isArray(meNode.hand) ? meNode.hand.slice() : []
	const supports = Array.isArray(meNode.supports) ? meNode.supports.slice(0, 2) : []
	if (supports.length >= MAX_SUPPORT_SLOTS) return
	const idx = hand.indexOf(cardId)
	if (source === SOURCE_HAND && idx === -1) return
	if (source === SOURCE_HAND) hand.splice(idx, 1)
	supports.push(cardId)
	await dbSet(['rooms', G.roomId, player, 'hand'], hand)
	await dbSet(['rooms', G.roomId, player, 'supports'], supports)
	const gs = room.gameState || {}
	const counts = gs.handSupportCount || { p1: 0, p2: 0 }
	if (source === SOURCE_HAND) {
		const key = player === 'player1' ? 'p1' : 'p2'
		counts[key] = (counts[key] || 0) + 1
		await dbSet(['rooms', G.roomId, 'gameState', 'handSupportCount'], counts)
	}
	const cObj = cardById(cardId)
	logStep(`${player === 'player1' ? 'P1' : 'P2'} ra hỗ trợ slot ${slot}: ${cObj?.name || cardId}`)
	const ctx = buildCtx(player)
	ctx.source = source
	await applyCardSkill(cObj, TRIGGER_SUPPORT, ctx)
	await scoreRound()
	await maybeAllowExtraSupport(player)
	toggleTurnIfNeeded(player)
}

async function maybeAllowExtraSupport(player) {
	const snap = await dbGet(['rooms', G.roomId])
	const rm = snap?.roundModifiers || { player1: { main: 0 }, player2: { main: 0 } }
	const p1Id = snap?.player1?.main || null
	const p2Id = snap?.player2?.main || null
	const p1Base = p1Id ? (cardById(p1Id)?.main || 0) : 0
	const p2Base = p2Id ? (cardById(p2Id)?.main || 0) : 0
	const p1m = p1Base + (rm.player1?.main || 0)
	const p2m = p2Base + (rm.player2?.main || 0)
	const mine = player
	const opp = player === 'player1' ? 'player2' : 'player1'
	const myMain = mine === 'player1' ? p1m : p2m
	const oppMain = opp === 'player1' ? p1m : p2m
	const meSupports = (snap?.[mine]?.supports || []).length
	if (myMain < oppMain && meSupports < MAX_SUPPORT_SLOTS) return true
	return false
}

async function endSupportPhase(player) {
	const data = await dbGet(['rooms', G.roomId])
	const sp = data?.gameState?.supportPass || { player1: false, player2: false }
	sp[player] = true
	await dbSet(['rooms', G.roomId, 'gameState', 'supportPass'], sp)
	const both = sp.player1 && sp.player2
	if (both) {
		await dbSet(['rooms', G.roomId, 'gameState', 'supportPhaseEnded'], true)
		if (typeof revealBottom === 'function') await revealBottom()
	} else {
		toggleTurnIfNeeded(player)
	}
}

function toggleTurnIfNeeded(playerJustActed) {
	const next = playerJustActed === 'player1' ? 'player2' : 'player1'
	dbSet(['rooms', G.roomId, 'gameState', 'turn'], next)
}

// ===== PHẦN 7: BOTTOM & SCORING =====
async function revealBottom() {
	const data = await dbGet(['rooms', G.roomId])
	const p1 = data?.player1 || {}
	const p2 = data?.player2 || {}
	if (!p1.bottom || !p2.bottom) return
	const rev = { p1BottomRevealedToP2: true, p2BottomRevealedToP1: true }
	const gs = { ...(data.gameState || {}), reveal: rev }
	await dbSet(['rooms', G.roomId, 'gameState'], gs)
	const p1Card = cardById(p1.bottom)
	const p2Card = cardById(p2.bottom)
	if (p1Card) await applyCardSkill(p1Card, TRIGGER_BOTTOM, buildCtx('player1'))
	if (p2Card) await applyCardSkill(p2Card, TRIGGER_BOTTOM, buildCtx('player2'))
	logStep('Lật bài tẩy hai bên')
	await scoreRound()
	await resolveRound()
}

async function scoreRound() {
	const snap = await dbGet(['rooms', G.roomId])
	const p1IdMain = snap?.player1?.main || null
	const p2IdMain = snap?.player2?.main || null
	const p1SuppIds = Array.isArray(snap?.player1?.supports) ? snap.player1.supports : []
	const p2SuppIds = Array.isArray(snap?.player2?.supports) ? snap.player2.supports : []
	const p1BaseMain = p1IdMain ? (cardById(p1IdMain)?.main || 0) : 0
	const p2BaseMain = p2IdMain ? (cardById(p2IdMain)?.main || 0) : 0
	const p1BaseSupp = (p1IdMain ? (cardById(p1IdMain)?.support || 0) : 0) + p1SuppIds.reduce((s, id) => s + (cardById(id)?.support || 0), 0)
	const p2BaseSupp = (p2IdMain ? (cardById(p2IdMain)?.support || 0) : 0) + p2SuppIds.reduce((s, id) => s + (cardById(id)?.support || 0), 0)
	const rm = snap?.roundModifiers || { player1: { main: 0, supports: [] }, player2: { main: 0, supports: [] } }
	const p1m = p1BaseMain + (rm.player1?.main || 0)
	const p2m = p2BaseMain + (rm.player2?.main || 0)
	const p1s = p1BaseSupp + (Array.isArray(rm.player1?.supports) ? rm.player1.supports.reduce((s, x) => s + (x?.delta || 0), 0) : 0)
	const p2s = p2BaseSupp + (Array.isArray(rm.player2?.supports) ? rm.player2.supports.reduce((s, x) => s + (x?.delta || 0), 0) : 0)
	const computed = { p1: { main: p1m, support: p1s }, p2: { main: p2m, support: p2s } }
	await dbSet(['rooms', G.roomId, 'gameState', 'computed'], computed)
}

async function resolveRound() {
	const snap = await dbGet(['rooms', G.roomId])
	const comp = snap?.gameState?.computed || { p1: { main: 0 }, p2: { main: 0 } }
	const p1m = comp.p1.main || 0
	const p2m = comp.p2.main || 0
	const winner = p1m >= p2m ? 'player1' : 'player2'
	const loser = winner === 'player1' ? 'player2' : 'player1'
	const wNode = snap[winner] || {}
	const lNode = snap[loser] || {}
	const wWon = Array.isArray(wNode.wonPile) ? wNode.wonPile.slice() : []
	const wDiscard = Array.isArray(wNode.discard) ? wNode.discard.slice() : []
	const lDiscard = Array.isArray(lNode.discard) ? lNode.discard.slice() : []
	const lHand = Array.isArray(lNode.hand) ? lNode.hand.slice() : []

	if (wNode.main) wWon.push(wNode.main)
	if (wNode.bottom) wDiscard.push(wNode.bottom)
	;(Array.isArray(wNode.supports) ? wNode.supports : []).forEach(id => wDiscard.push(id))
	if (lNode.main) lDiscard.push(lNode.main)
	if (lNode.bottom) lHand.push(lNode.bottom)
	;(Array.isArray(lNode.supports) ? lNode.supports : []).forEach(id => lDiscard.push(id))

	await dbSet(['rooms', G.roomId, winner], {
		...wNode,
		wonPile: wWon,
		discard: wDiscard,
		main: null,
		bottom: null,
		supports: []
	})
	await dbSet(['rooms', G.roomId, loser], {
		...lNode,
		hand: lHand,
		discard: lDiscard,
		main: null,
		bottom: null,
		supports: []
	})

	const wins = { ...(snap?.gameState?.wins || { player1: 0, player2: 0 }) }
	wins[winner] = (wins[winner] || 0) + 1
	await dbSet(['rooms', G.roomId, 'gameState', 'wins'], wins)

	await dbSet(['rooms', G.roomId, 'roundModifiers'], {
		player1: { main: 0, supports: [] },
		player2: { main: 0, supports: [] }
	})
	await dbSet(['rooms', G.roomId, 'gameState', 'supportPass'], { player1: false, player2: false })
	await dbSet(['rooms', G.roomId, 'gameState', 'supportPhaseEnded'], false)
	await dbSet(['rooms', G.roomId, 'gameState', 'mainRevealed'], false)
	await dbSet(['rooms', G.roomId, 'gameState', 'reveal'], { p1BottomRevealedToP2: false, p2BottomRevealedToP1: false })
	await dbSet(['rooms', G.roomId, 'gameState', 'computed'], { p1: { main: 0, support: 0 }, p2: { main: 0, support: 0 } })

	await refillHands()
	await dbSet(['rooms', G.roomId, 'gameState', 'round'], (snap?.gameState?.round || 1) + 1)
	await dbSet(['rooms', G.roomId, 'gameState', 'turn'], winner)
	await checkMatchEnd()
	logStep(`Kết thúc ván: ${winner === 'player1' ? 'P1' : 'P2'} thắng`)
}

async function refillHands() {
	const data = await dbGet(['rooms', G.roomId])
	for (const who of ['player1', 'player2']) {
		let hand = Array.isArray(data?.[who]?.hand) ? data[who].hand.slice() : []
		let deck = Array.isArray(data?.[who]?.deck) ? data[who].deck.slice() : []
		while (hand.length < MAX_HAND && deck.length > 0) {
		  const top = deck.shift()
		  hand.push(top)
		}
		await dbSet(['rooms', G.roomId, who, 'hand'], hand)
		await dbSet(['rooms', G.roomId, who, 'deck'], deck)
	}
}

async function checkMatchEnd() {
	const data = await dbGet(['rooms', G.roomId])
	const wins = data?.gameState?.wins || { player1: 0, player2: 0 }
	const winner = wins.player1 >= WIN_TARGET ? 'player1' : wins.player2 >= WIN_TARGET ? 'player2' : null
	if (!winner) return
	const gs = { ...(data.gameState || {}), matchEnded: true, winner }
	await dbSet(['rooms', G.roomId, 'gameState'], gs)
}

// ===== PHẦN 8: SKILL CONDITIONS =====
async function checkConditions(ctx, cond) {
	if (!cond) return true
	const room = await ctx.getRoom()
	const owner = ctx.owner
	const opp = ctx.opponent
	if (cond.isFirstTurn && !isFirstTurn(room)) return false
	if (typeof cond.opponentWinsAtLeast === 'number' && !opponentWinsAtLeast(room, owner, cond.opponentWinsAtLeast)) return false
	if (cond.opponentDiscardMore && !opponentDiscardMore(room, owner)) return false
	if (cond.handMoreThanOpponent && !handMoreThanOpponent(room, owner)) return false
	if ((cond.main_id || cond.main_name) && !mainIs(room, cond)) return false
	if (cond.isLastCharacter && !isLastCharacter(room, owner)) return false
	if (cond.source && !sourceIs(ctx, cond.source)) return false
	return true
}

function isFirstTurn(room) {
	const r = room?.gameState?.round || 1
	return r === 1
}

function opponentWinsAtLeast(room, owner, n) {
	const wins = room?.gameState?.wins || { player1: 0, player2: 0 }
	const opp = owner === 'player1' ? 'player2' : 'player1'
	return (wins[opp] || 0) >= n
}

function opponentDiscardMore(room, owner) {
	const me = room?.[owner] || {}
	const opp = room?.[owner === 'player1' ? 'player2' : 'player1'] || {}
	const myD = Array.isArray(me.discard) ? me.discard.length : 0
	const opD = Array.isArray(opp.discard) ? opp.discard.length : 0
	return opD > myD
}

function handMoreThanOpponent(room, owner) {
	const me = room?.[owner] || {}
	const opp = room?.[owner === 'player1' ? 'player2' : 'player1'] || {}
	const myH = Array.isArray(me.hand) ? me.hand.length : 0
	const opH = Array.isArray(opp.hand) ? opp.hand.length : 0
	return myH > opH
}

function mainIs(room, cond) {
	const p1Main = room?.player1?.main || null
	const p2Main = room?.player2?.main || null
	const mainId = p1Main || p2Main || null
	if (!mainId) return false
	if (cond.main_id) return mainId === cond.main_id
	if (cond.main_name) {
		const c = cardById(mainId)
		return c && c.name === cond.main_name
	}
	return false
}

function isLastCharacter(room, owner) {
	const node = room?.[owner] || {}
	const pools = []
	if (Array.isArray(node.hand)) pools.push(...node.hand)
	if (Array.isArray(node.deck)) pools.push(...node.deck)
	if (node.main) pools.push(node.main)
	if (node.bottom) pools.push(node.bottom)
	if (Array.isArray(node.supports)) pools.push(...node.supports)
	return pools.length === 1
}

function sourceIs(ctx, expect) {
	const s = ctx.source || null
	if (expect === 'hand') return s === 'hand'
	if (expect === 'deckTop') return s === 'deckTop'
	if (expect === 'not_hand') return s !== 'hand'
	return false
}

// ===== PHẦN 9: SKILL ACTIONS =====
async function applyCardSkill(card, trigger, ctx) {
	if (!card || !card.skill) return
	if (card.skill.trigger !== trigger) return
	ctx.trigger = trigger
	const cond = card.skill.condition
	const ok = await checkConditions(ctx, cond)
	if (!ok) return
	for (const step of card.skill.actions || []) {
		const a = step.action
		if (a === 'draw') await actDraw(ctx, step.target, step.amount || 1, card)
		else if (a === 'add_bottom_card') await actAddBottomCard(ctx, step.target, step.amount || 1, card)
		else if (a === 'add_support') await actAddSupport(ctx, step.target, step.amount || 0, card)
		else if (a === 'limit_support_from_hand') await actLimitSupportFromHand(ctx, step.amount || 0, card)
		else if (a === 'ban_support_with_support_gte') await actBanSupportGte(ctx, step.threshold, card)
		else if (a === 'discard_from_hand_top') await actDiscardFromHandTop(ctx, step.target, step.amount || 1, card)
		else if (a === 'support_from_deck_top') await actSupportFromDeckTop(ctx, step.target, step.amount || 1, card)
		else if (a === 'reveal_bottom_cards') await actRevealBottomCards(ctx, step.target, card)
		else if (a === 'add_main') await actAddMain(ctx, step.target, step.amount || 0, card)
		else if (a === 'discard_from_bottom') await actDiscardFromBottom(ctx, step.target, step.amount || 1, card)
		else if (a === 'discard_from_opponent_hand_select') await actDiscardFromOpponentHandSelect(ctx, step.amount || 1, card)
		else if (a === 'peek_opponent_deck_top') await actPeekOpponentDeckTop(ctx, step.amount || 1, card)
		else if (a === 'swap_with_won_card') await actSwapWithWonCard(ctx, step.target, step.card_id, card)
		else if (a === 'ban_draw') await actBanDraw(ctx, card)
	}
}

function resolveTarget(ctx, target) {
	if (target === 'self') return ctx.owner
	if (target === 'opponent') return ctx.opponent
	if (target === 'both') return 'both'
	return ctx.owner
}

async function actAddBottomCard(ctx, target, amount, card) {
	const t = resolveTarget(ctx, target)
	await logSkill(ctx, card, `Đặt thêm ${amount} lá vào bài tẩy`)
	const room = await ctx.getRoom()
	if (t === 'both') {
		await actAddBottomCard(ctx, 'self', amount)
		await actAddBottomCard(ctx, 'opponent', amount)
		return
	}
	const node = room[t] || {}
	const deck = Array.isArray(node.deck) ? node.deck.slice() : []
	const bottom = node.bottom || null
	if (!amount || deck.length === 0) return
	const take = []
	for (let i = 0; i < amount && deck.length > 0; i++) take.push(deck.shift())
	const newBottom = bottom || take.shift() || null
	const hand = node.hand || []
	await ctx.setPlayer(t, { ...node, deck, bottom: newBottom, hand })
}

async function actAddSupport(ctx, target, amount, card) {
	const t = resolveTarget(ctx, target)
	await logSkill(ctx, card, `${delta>=0?'+':''}${delta} điểm hỗ trợ`)
	const rm = (await ctx.getRoom()).roundModifiers || { player1: { main: 0, supports: [] }, player2: { main: 0, supports: [] } }
	const key = t
	const arr = Array.isArray(rm[key]?.supports) ? rm[key].supports.slice() : []
	arr.push({ slot: arr.length, delta: amount || 0, source: ctx.source || null })
	const next = { ...rm, [key]: { main: rm[key]?.main || 0, supports: arr } }
	await ctx.setMods(next)
}

async function actLimitSupportFromHand(ctx, amount, card) {
	await logSkill(ctx, card, `Giới hạn dùng hỗ trợ từ tay: ${limit}`)
	const room = await ctx.getRoom()
	const gs = room.gameState || {}
	const flags = { ...(gs.flags || {}), supportLimit: amount }
	await ctx.setGame({ ...gs, flags })
}

async function actBanSupportGte(ctx, threshold, card) {
	await logSkill(ctx, card, `Cấm dùng thẻ hỗ trợ có điểm ≥ ${threshold}`)
	const room = await ctx.getRoom()
	const gs = room.gameState || {}
	const flags = { ...(gs.flags || {}), supportBanThreshold: threshold }
	await ctx.setGame({ ...gs, flags })
}

async function actDraw(ctx, target, amount, card) {
	const t = resolveTarget(ctx, target)
	await logSkill(ctx, card, `Rút ${amount} lá`)
	const room = await ctx.getRoom()
	const gs = room.gameState || {}
	if (gs.flags?.banDraw) return
	const node = room[t] || {}
	const deck = Array.isArray(node.deck) ? node.deck.slice() : []
	const hand = Array.isArray(node.hand) ? node.hand.slice() : []
	for (let i = 0; i < (amount || 0) && deck.length > 0; i++) hand.push(deck.shift())
	await ctx.setPlayer(t, { ...node, deck, hand })
}

async function actDiscardFromHandTop(ctx, target, amount, card) {
	await logSkill(ctx, card, `Bỏ ${amount} lá trên tay`)
	const t = resolveTarget(ctx, target)
	const room = await ctx.getRoom()
	const node = room[t] || {}
	const hand = Array.isArray(node.hand) ? node.hand.slice() : []
	const discard = Array.isArray(node.discard) ? node.discard.slice() : []
	for (let i = 0; i < (amount || 0) && hand.length > 0; i++) discard.push(hand.shift())
	await ctx.setPlayer(t, { ...node, hand, discard })
}

async function actSupportFromDeckTop(ctx, target, amount, card) {
	await logSkill(ctx, card, `Lấy ${amount} lá trên cùng bộ bài làm hỗ trợ`)
	const t = resolveTarget(ctx, target)
	const rm = (await ctx.getRoom()).roundModifiers || { player1: { main: 0, supports: [] }, player2: { main: 0, supports: [] } }
	const key = t
	const arr = Array.isArray(rm[key]?.supports) ? rm[key].supports.slice() : []
	const room = await ctx.getRoom()
	const node = room[key] || {}
	const deck = Array.isArray(node.deck) ? node.deck.slice() : []
	for (let i = 0; i < (amount || 0) && deck.length > 0; i++) {
		const cid = deck[i]
		const c = cardById(cid)
		const val = c ? (c.support || 0) : 0
		arr.push({ slot: arr.length, delta: val, source: SOURCE_DECK_TOP })
	}
	const next = { ...rm, [key]: { main: rm[key]?.main || 0, supports: arr } }
	await ctx.setMods(next)
}

async function actRevealBottomCards(ctx, target, card) {
	await logSkill(ctx, card, `Cho đối phương xem bài tẩy`)
	const t = resolveTarget(ctx, target)
	const room = await ctx.getRoom()
	const gs = room.gameState || {}
	const rev = { ...(gs.reveal || {}) }
	if (t === 'opponent' && ctx.owner === 'player1') rev.p1BottomRevealedToP2 = true
	if (t === 'opponent' && ctx.owner === 'player2') rev.p2BottomRevealedToP1 = true
	await ctx.setGame({ ...gs, reveal: rev })
}

async function actAddMain(ctx, target, amount, card) {
	await logSkill(ctx, card, `+${amount} điểm chiến tướng cho ${resolveTarget(ctx, target)}`)
	const t = resolveTarget(ctx, target)
	const rm = (await ctx.getRoom()).roundModifiers || { player1: { main: 0, supports: [] }, player2: { main: 0, supports: [] } }
	const cur = rm[t]?.main || 0
	const next = { ...rm, [t]: { main: cur + (amount || 0), supports: rm[t]?.supports || [] } }
	await ctx.setMods(next)
}

async function actDiscardFromBottom(ctx, target, amount, card) {
	await logSkill(ctx, card, `Bỏ ${amount} lá bài tẩy của mình`)
	const t = resolveTarget(ctx, target)
	const room = await ctx.getRoom()
	const node = room[t] || {}
	const bottom = node.bottom || null
	const discard = Array.isArray(node.discard) ? node.discard.slice() : []
	if (bottom && (amount || 0) > 0) {
		discard.push(bottom)
	}
	await ctx.setPlayer(t, { ...node, bottom: null, discard })
}

async function actDiscardFromOpponentHandSelect(ctx, amount, card) {
	await logSkill(ctx, card, `Chọn bỏ ${amount} lá trên tay đối thủ`)
	const room = await ctx.getRoom()
	const opp = ctx.opponent
	const node = room[opp] || {}
	const hand = Array.isArray(node.hand) ? node.hand.slice() : []
	const take = hand.splice(0, amount || 0)
	const discard = Array.isArray(node.discard) ? node.discard.slice() : []
	take.forEach(id => discard.push(id))
	await ctx.setPlayer(opp, { ...node, hand, discard })
}

async function actPeekOpponentDeckTop(ctx, amount, card) {
	await logSkill(ctx, card, `Xem ${amount} lá trên cùng bộ bài đối thủ`)
	const room = await ctx.getRoom()
	const opp = ctx.opponent
	const node = room[opp] || {}
	const deck = Array.isArray(node.deck) ? node.deck.slice() : []
	if (deck.length === 0) return
	const n = Math.min(deck.length, amount || 1)
	const top = deck.slice(0, n)
	await ctx.setPlayer(opp, { ...node, deck })
}

async function actSwapWithWonCard(ctx, target, cardId, card) {
	await logSkill(ctx, card, `Đổi vị trí với 1 lá đã thắng`)
	const t = resolveTarget(ctx, target)
	const room = await ctx.getRoom()
	const node = room[t] || {}
	const won = Array.isArray(node.wonPile) ? node.wonPile.slice() : []
	const idx = won.indexOf(cardId)
	if (idx === -1) return
	const curMain = node.main || null
	const swapIn = won.splice(idx, 1)[0]
	await ctx.setPlayer(t, { ...node, main: swapIn, wonPile: curMain ? [...won, curMain] : won })
}

async function actBanDraw(ctx, card) {
	await logSkill(ctx, card, `Cấm rút bài trong lượt này`)
	const room = await ctx.getRoom()
	const gs = room.gameState || {}
	const flags = { ...(gs.flags || {}), banDraw: true }
	await ctx.setGame({ ...gs, flags })
}

// ===== PHẦN 10: UTILITIES & ADMIN =====
function shuffle(a) {
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		const t = a[i]
		a[i] = a[j]
		a[j] = t
	}
	return a
}

function clamp(n, lo, hi) {
	return Math.max(lo, Math.min(hi, n))
}

function uniq(arr) {
	return Array.from(new Set(arr))
}

async function hardResetRoom() {
	if (!G.roomId) return
	await dbSet(['rooms', G.roomId], {
		gameState: {
			turn: 'player1',
			round: 1,
			wins: { player1: 0, player2: 0 },
			flags: { supportLimit: null, supportBanThreshold: null, banDraw: false },
			reveal: { p1BottomRevealedToP2: false, p2BottomRevealedToP1: false }
		},
		roundModifiers: { player1: { main: 0, supports: [] }, player2: { main: 0, supports: [] } }
	})
}

async function softResetRound() {
	if (!G.roomId) return
	const data = await dbGet(['rooms', G.roomId])
	const p1 = data?.player1 || {}
	const p2 = data?.player2 || {}
	await dbSet(['rooms', G.roomId, 'player1'], {
		...p1, main: null, bottom: null, supports: []
	})
	await dbSet(['rooms', G.roomId, 'player2'], {
		...p2, main: null, bottom: null, supports: []
	})
	await dbSet(['rooms', G.roomId, 'roundModifiers'], { player1: { main: 0, supports: [] }, player2: { main: 0, supports: [] } })
	await dbSet(['rooms', G.roomId, 'gameState', 'supportPass'], { player1: false, player2: false })
	await dbSet(['rooms', G.roomId, 'gameState', 'supportPhaseEnded'], false)
	await dbSet(['rooms', G.roomId, 'gameState', 'mainRevealed'], false)
	await dbSet(['rooms', G.roomId, 'gameState', 'reveal'], { p1BottomRevealedToP2: false, p2BottomRevealedToP1: false })
	await dbSet(['rooms', G.roomId, 'gameState', 'computed'], { p1: { main: 0, support: 0 }, p2: { main: 0, support: 0 } })
}

async function reorderTopN(player, order) {
	const data = await dbGet(['rooms', G.roomId])
	const node = data?.[player] || {}
	const deck = Array.isArray(node.deck) ? node.deck.slice() : []
	const n = clamp(order.length, 0, deck.length)
	const top = deck.slice(0, n)
	const mapped = []
	for (let i = 0; i < n; i++) {
		const idx = order[i]
		if (typeof idx === 'number' && idx >= 0 && idx < n) mapped.push(top[idx])
	}
	for (let i = 0; i < n; i++) deck[i] = mapped[i] || top[i]
	await dbSet(['rooms', G.roomId, player, 'deck'], deck)
}

async function moveArrayFront(arr, indexFrom, indexTo) {
	const a = arr.slice()
	const it = a.splice(indexFrom, 1)[0]
	a.splice(indexTo, 0, it)
	return a
}

function bootstrapAfterJoin() {
	cacheDOM()
	renderBoardSkeleton()
	applyPlayerAreaTint()
	setupRoundPrepDnD()
	setupSupportPhaseDnD()
	startSync()
}

function applyPlayerAreaTint() {
  const play = document.querySelector('.play-area')
  if (!play || play.querySelector('.player-area')) return
  const overlay = document.createElement('div')
  overlay.className = `player-area ${G.role === 'player1' ? 'player1-area' : 'player2-area'}`
  play.appendChild(overlay)
}

function observePlayAreaReady() {
	const pa = document.querySelector('.play-area')
	if (!pa) return
	const fn = () => {
		if (!pa.classList.contains('hidden') && G.roomId) {
			bootstrapAfterJoin()
			obs.disconnect()
		}
	}
	const obs = new MutationObserver(fn)
	obs.observe(pa, { attributes: true, attributeFilter: ['class'] })
	fn()
}

function getCurrentComputed() {
	const sc = currentScoresView()
	const rm = G.roundModifiers
	return {
		p1: { main: sc.p1m + (rm.player1?.main || 0), support: sc.p1s + (Array.isArray(rm.player1?.supports) ? rm.player1.supports.reduce((s, x) => s + (x?.delta || 0), 0) : 0) },
		p2: { main: sc.p2m + (rm.player2?.main || 0), support: sc.p2s + (Array.isArray(rm.player2?.supports) ? rm.player2.supports.reduce((s, x) => s + (x?.delta || 0), 0) : 0) }
	}
}

async function quickGiveTurn(player) {
	await dbSet(['rooms', G.roomId, 'gameState', 'turn'], player)
}

async function drawN(player, n) {
	const data = await dbGet(['rooms', G.roomId])
	const node = data?.[player] || {}
	const deck = Array.isArray(node.deck) ? node.deck.slice() : []
	const hand = Array.isArray(node.hand) ? node.hand.slice() : []
	for (let i = 0; i < n && deck.length > 0; i++) hand.push(deck.shift())
	await dbSet(['rooms', G.roomId, player], { ...node, deck, hand })
}

async function discardTopHand(player, n) {
	const data = await dbGet(['rooms', G.roomId])
	const node = data?.[player] || {}
	const hand = Array.isArray(node.hand) ? node.hand.slice() : []
	const discard = Array.isArray(node.discard) ? node.discard.slice() : []
	for (let i = 0; i < n && hand.length > 0; i++) discard.push(hand.shift())
	await dbSet(['rooms', G.roomId, player], { ...node, hand, discard })
}

// ===== ACTION LOG =====
async function nameOf(playerKey) {
	const room = await dbGet(['rooms', G.roomId]) || {}
	const node = room[playerKey] || {}
	return node.name || (playerKey === 'player1' ? 'Player 1' : 'Player 2')
}

function triggerLabelOf(ctx) {
	if (ctx.trigger === TRIGGER_MAIN) return 'main'
	if (ctx.trigger === TRIGGER_SUPPORT) return 'support'
	if (ctx.trigger === TRIGGER_BOTTOM) return 'bottom'
	return 'main'
}

async function logSkill(ctx, card, text) {
	const actor = await nameOf(ctx.owner)
	const tlabel = triggerLabelOf(ctx)
	const cname = card?.name || ''
	logStep(`[${actor}] kích hoạt skill thẻ [${tlabel}] ${cname} - ${text}`)
}

let LOG_EL = null
function createActionLog() {
	if (LOG_EL) return
	const el = document.createElement('div')
	el.className = 'action-log'
	el.style.position = 'absolute'
	if (G.role === 'player1') {
		el.style.right = '0.8rem'
		el.style.bottom = '0.8rem'
	} else {
		el.style.left = '0.8rem'
		el.style.top = '0.8rem'
	}
	el.style.width = '22rem'
	el.style.maxHeight = '32vh'
	el.style.overflow = 'auto'
	el.style.padding = '8px 10px'
	el.style.borderRadius = '10px'
	el.style.background = 'rgba(0,0,0,0.6)'
	el.style.color = '#fff'
	el.style.fontSize = '12px'
	el.style.lineHeight = '1.35'
	el.style.zIndex = '9999'
	el.innerHTML = '<div style="opacity:.8;margin-bottom:6px">Nhật ký ván</div>'
	DOMC.play.appendChild(el)
	LOG_EL = el
}
function logStep(msg, obj) {
	console.log('[TCG]', msg, obj || '')
	if (!LOG_EL) return
	const row = document.createElement('div')
	row.textContent = `• ${msg}`
	LOG_EL.appendChild(row)
	LOG_EL.scrollTop = LOG_EL.scrollHeight
}

window.TCG_DEBUG = {
	hardResetRoom,
	softResetRound,
	reorderTopN,
	quickGiveTurn,
	drawN,
	discardTopHand
}

observePlayAreaReady()
