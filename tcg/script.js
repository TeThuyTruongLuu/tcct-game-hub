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

const wait = ms => new Promise(r => setTimeout(r, ms))

let revealFired = false

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

	cacheDOM()
	bindReadyButton()

	await drawUntil7Bootstrap()
	await updateSetupStatus()
	setupRoundPrepDnD()
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
		G.me.bottomExtra = Array.isArray(node.bottomExtra) ? node.bottomExtra.slice() : []
		G.me.supports = Array.isArray(node.supports) ? node.supports.slice(0, 2) : []
		G.me.wonPile = node.wonPile || []
		G.me.discard = node.discard || []
	} else {
		const deck = buildDeck30(G.cards)
		G.me.deck = deck.map(c => c.id)
		G.me.hand = []
		G.me.main = null
		G.me.bottom = null
		G.me.bottomExtra = []
		G.me.supports = []
		G.me.wonPile = []
		G.me.discard = []
		await dbSet(['rooms', G.roomId, G.role], {
			name: G.name,
			deck: G.me.deck,
			hand: [],
			main: null,
			bottom: null,
			bottomExtra: [],
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
	const gs = await dbGet(['rooms', G.roomId, 'gameState']) || {}
	const me = await dbGet(['rooms', G.roomId, G.role]) || {}
	const round = gs.round || 1
	if (me.main || me.bottom) return
	const hand = me.hand || []
	const need = Math.max(0, MAX_HAND - hand.length)
	if (need > 0) {
		await dbSet(['rooms', G.roomId, 'gameState', `manualDraw_${G.role}`], { remain: need })
		setTurnStatus(`Rút ${need} lá để đủ tay`, true)
	}
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

function setZoneSingleCard(zoneEl, cardId, faceUp, draggable, allowHover = false) {
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
		if (allowHover && c) {
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

function setStackTop(zoneEl, cardId, faceUp, draggable, allowHover = false) {
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
	if (allowHover && ci) {
		slot.onmouseenter = () => showCardTip(ci);
		slot.onmouseleave = hideCardTip;
	}
	if (draggable) {
		slot.setAttribute('draggable','true');
		slot.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', cardId));
	}
}

function setSupportSlot(zoneEl, slotIndex, cardId, faceUp, side, allowHover = false) {
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
	if (allowHover && ci) {
		slot.onmouseenter = () => showCardTip(ci);
		slot.onmouseleave = hideCardTip;
	}
	bringToFront(slot, side)
}

function renderSupportSlots(side, ids, opts = {}) {
	const { faceUp = true, canOpponentHover = true } = opts
	const zone = side === 'me' ? DOMC.my.main : DOMC.opp.main
	const canHover = side === 'me' ? true : (faceUp && canOpponentHover)
	setSupportSlot(zone, 1, ids?.[0] || null, faceUp, side, (side === 'me' || faceUp))
	setSupportSlot(zone, 2, ids?.[1] || null, faceUp, side, (side === 'me' || faceUp))
}

function renderHand(side, cards) {
	const zone = side === 'me' ? DOMC.my.hand : DOMC.opp.hand
	zone.innerHTML = ''
	if (side === 'me') {
		const inSetup = !G.game?.mainRevealed
		const canDrag = (inSetup || G.game.turn === G.role) && !(G.game[`manualDiscard_${G.role}`]?.remain > 0) && !G.game.supportPhaseEnded
		zone.classList.toggle('no-drag', !canDrag)
		const disc = G.game[`manualDiscard_${G.role}`]?.remain > 0
		zone.classList.toggle('discard-mode', !!disc)
	}
	if (side === 'opp') {
		const st = G.game?.opponentSelectDiscard
		const selectable = !!st && st.controller === G.role && st.remain > 0
		zone.classList.toggle('discard-mode', selectable)
	}
	cards.forEach((id, idx) => {
		const d = document.createElement('div')
		d.className = 'card'
		const face = side === 'me'
		d.innerHTML = `<img src="${imgPathFor(id, face)}" style="width:100%;height:100%;border-radius:0.5rem;">`
		if (side === 'me') {
			d.dataset.id = id
			const inSetup = !G.game?.mainRevealed
			const canDrag = (inSetup || G.game.turn === G.role) && !(G.game[`manualDiscard_${G.role}`]?.remain > 0) && !G.game.supportPhaseEnded
			if (canDrag) {
				d.setAttribute('draggable', 'true')
				d.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', id))
			}
			const c = cardById(id)
			if (c) {
				d.addEventListener('mouseenter', () => showCardTip(c))
				d.addEventListener('mouseleave', hideCardTip)
			}
			if (G.game[`manualDiscard_${G.role}`]?.remain > 0) {
				d.onclick = async () => {
					const remainObj = G.game[`manualDiscard_${G.role}`]
					const newHand = G.me.hand.filter(x => x !== id)
					const newDiscard = [ ...(G.me.discard || []), id ]
					await dbSet(['rooms', G.roomId, G.role, 'hand'], newHand)
					await dbSet(['rooms', G.roomId, G.role, 'discard'], newDiscard)
					const left = (remainObj.remain || 0) - 1
					if (left > 0) {
						await dbSet(['rooms', G.roomId, 'gameState', `manualDiscard_${G.role}`], { remain: left })
						setTurnStatus(`Chọn bỏ tiếp • Còn ${left}`, true)
					} else {
						await dbSet(['rooms', G.roomId, 'gameState', `manualDiscard_${G.role}`], null)
						setTurnStatus('Đã bỏ xong', true)
					}
				}
			}
		} else {
			const st = G.game?.opponentSelectDiscard
			if (st && st.controller === G.role && st.remain > 0) {
				d.dataset.index = String(idx)
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

function computeMainPoints(stateForRole) {
	let ids = []
	if (stateForRole.main) ids.push(stateForRole.main)
	if (Array.isArray(stateForRole.supports)) ids = ids.concat(stateForRole.supports)
	let s = 0
	ids.forEach(id => {
		const c = cardById(id)
		if (c && typeof c.main === 'number') s += c.main
	})
	return s
}

function computeSupportPoints(stateForRole) {
	let ids = []
	if (stateForRole.main) ids.push(stateForRole.main)
	if (Array.isArray(stateForRole.supports)) ids = ids.concat(stateForRole.supports)
	let s = 0
	ids.forEach(id => {
		const c = cardById(id)
		if (c && typeof c.support === 'number') s += c.support
	})
	return s
}

function currentScoresView() {
	if (!G.game?.mainRevealed) return { p1m: 0, p1s: 0, p2m: 0, p2s: 0 }
	const reveal = G.game?.reveal || {}
	const bothRevealed = !!(reveal.p1BottomRevealedToP2 && reveal.p2BottomRevealedToP1)
	const bottomEnabled = !!G.game?.supportPhaseEnded || bothRevealed
	function side(key) {
		const node = key === 'player1'
			? (G.role === 'player1' ? G.me : G.opp)
			: (G.role === 'player1' ? G.opp : G.me)
		const mainId = node?.main || null
		const bottomId = node?.bottom || null
		const supps = Array.isArray(node?.supports) ? node.supports : []
		let main = (mainId ? (cardById(mainId)?.main || 0) : 0)
		main += supps.reduce((s, id) => s + (cardById(id)?.main || 0), 0)
		if (bottomEnabled) main += (cardById(bottomId)?.main || 0)
		let supp = (mainId ? (cardById(mainId)?.support || 0) : 0)
		supp += supps.reduce((s, id) => s + (cardById(id)?.support || 0), 0)
		if (bottomEnabled) supp += (cardById(bottomId)?.support || 0)
		return { main, support: supp }
	}
	const a = side('player1')
	const b = side('player2')
	return { p1m: a.main, p1s: a.support, p2m: b.main, p2s: b.support }
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
	const allowMyDraw = !!G.game[`manualDraw_${G.role}`]?.remain
	DOMC.my.deck.innerHTML = `<img src="${imgPathFor('BACK', false)}" style="width:100%;height:100%;border-radius:0.5rem;${allowMyDraw ? 'cursor:pointer' : 'filter:grayscale(100%);opacity:.6;cursor:not-allowed'}">`
	DOMC.opp.deck.innerHTML = `<img src="${imgPathFor('BACK', false)}" style="width:100%;height:100%;border-radius:0.5rem;filter:grayscale(100%);opacity:.6;cursor:not-allowed">`
	DOMC.my.deck.onclick = allowMyDraw ? () => drawOneToHand(G.role) : null
}

async function drawOneToHand(player) {
	const gsPath = ['rooms', G.roomId, 'gameState']
	const deckPath = ['rooms', G.roomId, player, 'deck']
	const handPath = ['rooms', G.roomId, player, 'hand']

	const gs = await dbGet(gsPath) || {}
	const hand = await dbGet(handPath) || []
	const deck = await dbGet(deckPath) || []
	const key = `manualDraw_${player}`
	const ctrl = gs[key]

	if (!ctrl || (ctrl.remain || 0) <= 0) return
	if (!deck.length) return

	const firstRound = (gs.round || 1) === 1
	if (firstRound && hand.length >= MAX_HAND) {
		delete gs[key]
		await dbSet(gsPath, gs)
		setTurnStatus('Bạn đã rút đủ 7 lá', true)
		return
	}

	hand.push(deck.shift())
	await dbSet(deckPath, deck)
	await dbSet(handPath, hand)

	const needNow = Math.max(0, MAX_HAND - hand.length)
	ctrl.remain = firstRound ? needNow : Math.max(0, (ctrl.remain || 0) - 1)

	if (ctrl.remain <= 0) {
		delete gs[key]
		await dbSet(gsPath, gs)
		setTurnStatus(firstRound ? 'Bạn đã rút đủ 7 lá' : 'Đã rút xong', true)
	} else {
		gs[key] = ctrl
		await dbSet(gsPath, gs)
		setTurnStatus(firstRound ? `Lượt 1: Rút ${ctrl.remain} lá bài` : `Còn ${ctrl.remain} lá cần rút`, true)
	}
	await updateSetupStatus()
}

async function beginRoundIfReady() {
	const room = await dbGet(['rooms', G.roomId]) || {}
	const p1r = !!room?.player1?.ready
	const p2r = !!room?.player2?.ready
	if (!p1r || !p2r) return
	const turn = room?.gameState?.turn || 'player1'
	const nameP1 = room?.player1?.name || 'Player 1'
	const nameP2 = room?.player2?.name || 'Player 2'
	const who = turn === 'player1' ? nameP1 : nameP2
	await pushLog(`Bắt đầu ván • ${who} đi trước`)
	setTurnStatus(`Lượt của ${who}`, true)
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

function renderBottom(side) {
	const zone = side === 'me' ? DOMC.my.bottom : DOMC.opp.bottom
	while (zone.firstChild) zone.removeChild(zone.firstChild)

	const face = side === 'me' ? true : faceForBottom('opp')
	const baseId = side === 'me' ? G.me.bottom : G.opp.bottom
	const extras = side === 'me'
		? (Array.isArray(G.me.bottomExtra) ? G.me.bottomExtra : [])
		: (Array.isArray(G.opp.bottomExtra) ? G.opp.bottomExtra : [])

	const base = document.createElement('div')
	base.className = 'card bottom-card base'
	base.innerHTML = `<img src="${imgPathFor(baseId || 'card-back', !!baseId ? face : false)}" style="width:100%;height:100%;border-radius:.5rem;">`
	if (baseId && face) {
		const ci = cardById(baseId)
		base.addEventListener('mouseenter', () => showCardTip(ci))
		base.addEventListener('mouseleave', hideCardTip)
	}
	zone.appendChild(base)

	if (extras.length > 0) {
		extras.forEach((id, i) => {
			const d = document.createElement('div')
			d.className = 'card bottom-card extra'
			d.style.setProperty('--i', String(i + 1))
			d.innerHTML = `<img src="${imgPathFor(id, face)}" style="width:100%;height:100%;border-radius:.5rem;">`
			if (face) {
				const ci = cardById(id)
				d.addEventListener('mouseenter', () => showCardTip(ci))
				d.addEventListener('mouseleave', hideCardTip)
			}
			zone.appendChild(d)
		})
	}
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

let firstSnapshot = true
function onRoomSnapshot(data) {
	if (!data) return
	const mine = G.role === 'player1' ? 'player1' : 'player2'
	const opp = G.role === 'player1' ? 'player2' : 'player1'
	const meNode = data[mine] || {}
	const oppNode = data[opp] || {}
	const gsRaw = data.gameState || {}
	const rm = data.roundModifiers || {}

	G.game = {
		turn: gsRaw.turn || 'player1',
		round: gsRaw.round || 1,
		wins: gsRaw.wins || { player1: 0, player2: 0 },
		flags: gsRaw.flags || { supportLimit: null, supportBanThreshold: null, banDraw: false },
		reveal: gsRaw.reveal || { p1BottomRevealedToP2: false, p2BottomRevealedToP1: false },
		supportPass: gsRaw.supportPass || { player1: false, player2: false },
		supportPhaseEnded: !!gsRaw.supportPhaseEnded,
		computed: gsRaw.computed || { p1: { main: 0, support: 0 }, p2: { main: 0, support: 0 } },
		mainRevealed: !!gsRaw.mainRevealed,
		opponentSelectDiscard: gsRaw.opponentSelectDiscard || null
	}
	G.roundModifiers = {
		player1: rm.player1 || { main: 0, supports: [] },
		player2: rm.player2 || { main: 0, supports: [] }
	}

	G.me.deck = Array.isArray(meNode.deck) ? meNode.deck.slice() : []
	G.me.hand = Array.isArray(meNode.hand) ? meNode.hand.slice() : []
	G.me.main = meNode.main || null
	G.me.bottom = meNode.bottom || null
	G.me.bottomExtra = Array.isArray(meNode.bottomExtra) ? meNode.bottomExtra.slice() : []
	G.me.supports = Array.isArray(meNode.supports) ? meNode.supports.slice() : []
	G.me.wonPile = Array.isArray(meNode.wonPile) ? meNode.wonPile.slice() : []
	G.me.discard = Array.isArray(meNode.discard) ? meNode.discard.slice() : []

	G.opp.deck = Array.isArray(oppNode.deck) ? oppNode.deck.slice() : []
	G.opp.hand = Array.isArray(oppNode.hand) ? oppNode.hand.slice() : []
	G.opp.main = oppNode.main || null
	G.opp.bottom = oppNode.bottom || null
	G.opp.bottomExtra = Array.isArray(oppNode.bottomExtra) ? oppNode.bottomExtra.slice() : []
	G.opp.supports = Array.isArray(oppNode.supports) ? oppNode.supports.slice() : []
	G.opp.wonPile = Array.isArray(oppNode.wonPile) ? oppNode.wonPile.slice() : []
	G.opp.discard = Array.isArray(oppNode.discard) ? oppNode.discard.slice() : []

	if (data.logs) renderLogs(Object.values(data.logs))

	const extras = Object.fromEntries(Object.entries(gsRaw).filter(([k]) => /^manual(Draw|Discard)_/.test(k)))
	G.game = { ...G.game, ...extras }

	reconcileBoard(data)
	renderDeckBacks()

	const md = G.game[`manualDraw_${G.role}`]
	const ms = G.game[`manualDiscard_${G.role}`]
	if ((md?.remain || 0) > 0) {
		setTurnStatus(`Nhấp chồng bài để rút ${md.remain} thẻ`, true)
	} else if ((ms?.remain || 0) > 0) {
		setTurnStatus(`Chọn ${ms.remain} thẻ để bỏ`, true)
	} else {
		updateSetupStatus()
	}

	const round = G.game.round || 1
	const revealed = !!gsRaw.mainRevealed
	if (round === 1 && !revealed) {
		setupRoundPrepDnD()
	} else if (round >= 1 && revealed && !gsRaw.supportPhaseEnded) {
		setupSupportPhaseDnD()
	}

	evaluateRevealGate()

	const sel = gsRaw.opponentSelectDiscard
	if (sel) {
		if (sel.controller === G.role) setTurnStatus(`Chọn bỏ ${sel.remain} lá trên tay đối thủ`, true)
		else setTurnStatus('Chờ đối thủ sử dụng skill', false)
	} else if (revealed) {
		const settled = !!gsRaw.initiativeSettled
		if (!settled) {
			setTurnStatus('Đang xác định quyền đi trước…', null)
		} else {
			const mineTurn = (G.game.turn || 'player1') === G.role
			setTurnStatus(mineTurn ? 'Lượt của bạn' : 'Lượt của đối thủ', mineTurn)
		}
	}
}

function renderLogs(list) {
	createActionLog()
	const items = Array.isArray(list) ? list.slice() : Object.values(list || {})
	LOG_EL.innerHTML = ''
	const head = document.createElement('div')
	head.style.opacity = '.8'
	head.style.marginBottom = '6px'
	head.textContent = 'Nhật ký ván'
	LOG_EL.appendChild(head)
	for (const s of items) {
		const row = document.createElement('div')
		row.textContent = `• ${s}`
		LOG_EL.appendChild(row)
	}
	LOG_EL.scrollTop = LOG_EL.scrollHeight
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
	const r = G.game.reveal || {}
	if (side === 'me') return true
	if (side === 'opp') {
		if (G.role === 'player1') return !!r.p2BottomRevealedToP1
		return !!r.p1BottomRevealedToP2
	}
	return false
}

function reconcileBoard(data) {
	if (!DOMC) renderBoardSkeleton()

	const { mine, opp } = roles()
	const p1Name = data.player1?.name || 'Player 1'
	const p2Name = data.player2?.name || 'Player 2'
	renderScores({ p1: p1Name, p2: p2Name })

	const myMainFace = true
	const oppMainFace = faceForMain('opp')
	setStackTop(DOMC.my.main, G.me.main, myMainFace, false, true)
	setStackTop(DOMC.opp.main, G.opp.main, oppMainFace, false, oppMainFace)

	const myBottomFace = true
	const oppBottomFace = faceForBottom('opp')
	setZoneSingleCard(DOMC.my.bottom, G.me.bottom, myBottomFace, false, true)
	setZoneSingleCard(DOMC.opp.bottom, G.opp.bottom, oppBottomFace, false, oppBottomFace)

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

	renderDiscard('me', G.me.discard || [])
	renderDiscard('opp', G.opp.discard || [])

	updateScoreBoxesWithModifiers()

	const round = G.game.round || 1
	const revealed = !!data?.gameState?.mainRevealed
	const meReady = !!data?.[mine]?.ready
	const oppReady = !!data?.[opp]?.ready
	const sel = data?.gameState?.opponentSelectDiscard

	if (sel) return

	if (round === 1 && !revealed) {
		if (meReady && !oppReady) {
			setTurnStatus('Chờ đối thủ', false)
		} else {
			updateSetupStatus()
		}
	} else {
		setTurnStatus(G.game.turn === G.role ? 'Lượt của bạn' : 'Lượt của đối thủ', G.game.turn === G.role)
	}
}

function updateScoreBoxesWithModifiers() {
	const base = currentScoresView()
	const rm = G.roundModifiers || { player1: { main: 0, supports: [] }, player2: { main: 0, supports: [] } }
	const p1DeltaSupp = Array.isArray(rm.player1?.supports) ? rm.player1.supports.reduce((s,x)=>s+(x?.delta||0),0) : 0
	const p2DeltaSupp = Array.isArray(rm.player2?.supports) ? rm.player2.supports.reduce((s,x)=>s+(x?.delta||0),0) : 0
	const p1m = (base.p1m || 0) + (rm.player1?.main || 0)
	const p2m = (base.p2m || 0) + (rm.player2?.main || 0)
	const p1s = (base.p1s || 0) + p1DeltaSupp
	const p2s = (base.p2s || 0) + p2DeltaSupp
	const elP1m = document.querySelector('#score-main-p1')
	const elP2m = document.querySelector('#score-main-p2')
	const elP1s = document.querySelector('#score-supp-p1')
	const elP2s = document.querySelector('#score-supp-p2')
	if (elP1m) elP1m.textContent = p1m
	if (elP2m) elP2m.textContent = p2m
	if (elP1s) elP1s.textContent = p1s
	if (elP2s) elP2s.textContent = p2s
}

function ensureTurnStatusBox() {
	let el = document.querySelector('.turn-status')
	if (!el) {
		el = document.createElement('div')
		el.className = 'turn-status'
		document.querySelector('.play-area')?.appendChild(el)
	}
	return el
}

let turnStatusTimer = null
function setTurnStatus(msg, mine = null, persist = false) {
	const el = ensureTurnStatusBox()
	el.textContent = msg || ''
	el.style.background = mine === true ? '#dc2626' : mine === false ? '#6b7280' : 'rgba(0,0,0,.7)'
	clearTimeout(turnStatusTimer)
}

function isSetupPhase(gs) {
  return !gs?.mainRevealed
}

async function updateSetupStatus() {
	const gs = await dbGet(['rooms', G.roomId, 'gameState']) || {}
	if (!isSetupPhase(gs)) return
	const me = await dbGet(['rooms', G.roomId, G.role]) || {}
	const needDraw = gs[`manualDraw_${G.role}`]?.remain || 0
	if (needDraw > 0) {
		setTurnStatus(`Lượt 1: Rút ${needDraw} lá bài`, true)
		return
	}
	if ((me.hand || []).length >= MAX_HAND && !me.main) {
		setTurnStatus('Bạn đã rút đủ 7 lá • Hãy đặt thẻ chiến tướng', true)
		return
	}
	if (me.main && !me.bottom) {
		setTurnStatus('Bạn đã đặt thẻ chiến tướng • Hãy đặt bài tẩy', true)
		return
	}
	if (me.main && me.bottom && !me.ready) {
		setTurnStatus('Bạn đã đặt bài tẩy • Nhấn Sẵn sàng', true)
		return
	}
	if (me.main && me.bottom && me.ready) {
		const room = await dbGet(['rooms', G.roomId])
		const oppRole = G.role === 'player1' ? 'player2' : 'player1'
		const opp = room?.[oppRole] || {}
		if (!opp.ready) {
			setTurnStatus('Chờ đối thủ', true)
			return
		}
	}
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

	if (isMainZone) {
		updates.main = id
		setTurnStatus('Bạn đã đặt thẻ chiến tướng', true)
	}
	if (isBottomZone) {
		updates.bottom = id
		setTurnStatus('Bạn đã đặt bài tẩy', true)
	}

	dbSet(['rooms', G.roomId, G.role], { ...getPlayerNodeLocal(), ...updates, ready: false })
		.then(updateSetupStatus)
}

function ensureReadyButton() {
	const host = DOMC?.play || document.querySelector('.play-area')
	if (!host) return
	let btn = document.getElementById('readyBtn')
	if (!btn) {
		btn = document.createElement('button')
		btn.id = 'readyBtn'
		btn.className = `tcg-btn ready ${G.role === 'player1' ? 'btn-p1' : 'btn-p2'}`
		btn.textContent = 'Sẵn sàng'
		host.appendChild(btn)
	}
	btn.onclick = onClickReadyPrep
}

async function onClickReadyPrep() {
	const node = await dbGet(['rooms', G.roomId, G.role])
	if (!node?.main || !node?.bottom) return
	await dbSet(['rooms', G.roomId, G.role, 'ready'], true)
}

function evaluateRevealGate() {
	dbGet(['rooms', G.roomId]).then(data => {
		const p1 = data?.player1 || {}
		const p2 = data?.player2 || {}
		const gs = data?.gameState || {}
		const bothPlaced = !!p1.main && !!p1.bottom && !!p2.main && !!p2.bottom
		const bothReady = !!p1.ready && !!p2.ready
		if (bothPlaced && bothReady && !gs.mainRevealed && !revealFired && G.role === 'player1') {
			revealFired = true
			lockAndRevealMain()
		}
	})
}

async function lockAndRevealMain() {
	const room = await dbGet(['rooms', G.roomId]) || {}
	const gs = room.gameState || {}
	if (gs.mainRevealed) return

	await showStatusStep('Đã chốt bài', null, 5000)
	await dbSet(['rooms', G.roomId, 'gameState', 'mainRevealed'], true)

	const p1MainId = room?.player1?.main || null
	const p2MainId = room?.player2?.main || null
	const p1Card = p1MainId ? cardById(p1MainId) : null
	const p2Card = p2MainId ? cardById(p2MainId) : null

	const p1Name = room?.player1?.name || 'Player 1'
	const p2Name = room?.player2?.name || 'Player 2'
	if (p1Card) await logStep(`[${p1Name}] đặt [${p1Card.name}] làm chiến tướng: +${p1Card.main} điểm chiến tướng, +${p1Card.support} điểm hỗ trợ.`)
	if (p2Card) await logStep(`[${p2Name}] đặt [${p2Card.name}] làm chiến tướng: +${p2Card.main} điểm chiến tướng, +${p2Card.support} điểm hỗ trợ.`)

	const ctx1 = buildCtx('player1'); ctx1.trigger = TRIGGER_MAIN
	const ctx2 = buildCtx('player2'); ctx2.trigger = TRIGGER_MAIN

	await applyCardSkill(p1Card, 'main', ctx1, { phase: 'preCompare' })
	await applyCardSkill(p2Card, 'main', ctx2, { phase: 'preCompare' })

	await waitForPendingEffects()
	await scoreRound()
	const after = await dbGet(['rooms', G.roomId])
	const firstTurn = decideTurnFromMain(after)
	await dbSet(['rooms', G.roomId, 'gameState'], {
		...(after.gameState || {}),
		turn: firstTurn,
		initiativeSettled: true
	})

	const firstName = firstTurn === 'player1' ? (after?.player1?.name || 'Player 1') : (after?.player2?.name || 'Player 2')
	await showStatusStep(`Quyền đi trước: ${firstName}`, null, 10000)

	if (firstTurn === 'player1') {
		await applyCardSkill(p1Card, 'main', ctx1, { phase: 'postCompareOpponent' })
		await waitForPendingEffects()
		await applyCardSkill(p2Card, 'main', ctx2, { phase: 'postCompareOpponent' })
	} else {
		await applyCardSkill(p2Card, 'main', ctx2, { phase: 'postCompareOpponent' })
		await waitForPendingEffects()
		await applyCardSkill(p1Card, 'main', ctx1, { phase: 'postCompareOpponent' })
	}

	await waitForPendingEffects()
	await scoreRound()

	setTurnStatus(firstTurn === G.role ? 'Lượt của bạn' : 'Lượt của đối thủ', firstTurn === G.role)
}

async function triggerMainOnce(owner, card) {
	if (!card || !card.skill || card.skill.trigger !== 'main') return
	const pathGS = ['rooms', G.roomId, 'gameState']
	const gs = await dbGet(pathGS) || {}
	const msd = gs.mainSkillDone || { player1: false, player2: false }
	if (msd[owner]) return
	msd[owner] = true
	await dbSet(pathGS, { ...(gs || {}), mainSkillDone: msd })
	const ctx = buildCtx(owner)
	ctx.trigger = TRIGGER_MAIN
	await applyCardSkill(card, 'main', ctx)
}

async function showStatusStep(msg, mine = null, ms = 10000) {
	setTurnStatus(msg, mine, true)
	await new Promise(r => setTimeout(r, ms))
}

function decideTurnFromMain(snapshot) {
  const comp = snapshot?.gameState?.computed || { p1: { main: 0, support: 0 }, p2: { main: 0, support: 0 } }
  const p1m = comp.p1.main
  const p2m = comp.p2.main
  if (p1m > p2m) return 'player1'
  if (p2m > p1m) return 'player2'
  if (comp.p1.support > comp.p2.support) return 'player1'
  if (comp.p2.support > comp.p1.support) return 'player2'
  return Math.random() < 0.5 ? 'player1' : 'player2'
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

async function onDropSupport(e) {
	e.preventDefault()
	if (G.game.turn !== G.role) return
	const cardId = e.dataTransfer.getData('text/plain')
	if (!cardId) return
	const myPath = ['rooms', G.roomId, G.role]
	const node = await dbGet(myPath) || {}
	const hand = Array.isArray(node.hand) ? node.hand.slice() : []
	if (!hand.includes(cardId)) return
	if (!(await canPlaySupportFromHand(G.role, cardById(cardId)))) return
	const supps = Array.isArray(node.supports) ? node.supports.slice(0, MAX_SUPPORT_SLOTS) : []
	if (supps.length >= MAX_SUPPORT_SLOTS) return
	const idx = hand.indexOf(cardId)
	hand.splice(idx, 1)
	supps.push(cardId)
	await dbSet([...myPath, 'hand'], hand)
	await dbSet([...myPath, 'supports'], supps)
	const gs = (await dbGet(['rooms', G.roomId, 'gameState'])) || {}
	const counts = gs.handSupportCount || { p1: 0, p2: 0 }
	const key = G.role === 'player1' ? 'p1' : 'p2'
	counts[key] = (counts[key] || 0) + 1
	await dbSet(['rooms', G.roomId, 'gameState', 'handSupportCount'], counts)
	const meName = G.name || node.name || (G.role === 'player1' ? 'Player 1' : 'Player 2')
	const c = cardById(cardId)
	await pushLog(`[${meName}] đặt ${c.name} làm support - +${c.support} điểm hỗ trợ`)
	const ctx = buildCtx(G.role, { source: SOURCE_HAND })
	await applyCardSkill(c, TRIGGER_SUPPORT, ctx)
	await scoreRound()
	await handleSupportTurnFlow(G.role)
}

async function handleSupportTurnFlow(playerKey) {
	const gsPath = ['rooms', G.roomId, 'gameState']
	const room = await dbGet(['rooms', G.roomId]) || {}
	const gs = room.gameState || {}
	const cur = gs.turn || 'player1'
	const other = cur === 'player1' ? 'player2' : 'player1'
	const comp = gs.computed || { p1: { main: 0 }, p2: { main: 0 } }
	const p1m = comp.p1?.main || 0
	const p2m = comp.p2?.main || 0
	const myMain = playerKey === 'player1' ? p1m : p2m
	const oppMain = playerKey === 'player1' ? p2m : p1m
	const meNode = room[playerKey] || {}
	const meSupps = Array.isArray(meNode.supports) ? meNode.supports.length : 0
	let flags = gs.flags || {}
	if (myMain < oppMain && meSupps < MAX_SUPPORT_SLOTS) {
		flags.extraSupportFor = playerKey
		await dbSet(gsPath, { ...gs, flags, turn: playerKey })
		setTurnStatus('Bạn đang thua, có thể đặt thêm 1 lá hỗ trợ', playerKey === G.role)
		return
	}
	if (flags.extraSupportFor === playerKey) {
		delete flags.extraSupportFor
	}
	await dbSet(gsPath, { ...gs, flags, turn: other })
	const nameNext = await nameOf(other)
	await logStep(`Kết thúc lượt, chuyển sang ${nameNext}.`)
	setTurnStatus(other === G.role ? 'Lượt của bạn' : 'Lượt của đối thủ', other === G.role)
}

function ensurePassButton() {
	if (document.querySelector('.support-pass')) return
	const btn = document.createElement('button')
	btn.textContent = 'Dừng hỗ trợ'
	btn.className = `tcg-btn pass support-pass ${G.role === 'player1' ? 'btn-p1' : 'btn-p2'}`
	btn.addEventListener('click', () => endSupportPhase(G.role))
	DOMC.play.appendChild(btn)
}

async function canPlaySupportFromHand(player, card) {
	const snap = await dbGet(['rooms', G.roomId]) || {}
	const gs = snap.gameState || {}
	const flags = gs.flags || {}
	if (typeof flags.supportBanThreshold === 'number') {
		if ((card.support || 0) >= flags.supportBanThreshold) return false
	}
	const limit = flags.supportLimit
	if (typeof limit === 'number') {
		const counts = gs.handSupportCount || { p1: 0, p2: 0 }
		const key = player === 'player1' ? 'p1' : 'p2'
		if ((counts[key] || 0) >= limit) return false
	}
	const node = snap[player] || {}
	const supps = Array.isArray(node.supports) ? node.supports : []
	if (supps.length >= MAX_SUPPORT_SLOTS) return false
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
  const playerName = await nameOf(player)
  logStep(`${playerName} ra hỗ trợ slot ${slot}: ${cObj?.name || cardId}`)
  setTurnStatus('Bạn vừa thêm thẻ hỗ trợ', player === G.role)
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

async function endSupportPhase(playerKey) {
	const path = ['rooms', G.roomId, 'gameState']
	const gs = await dbGet(path) || {}
	const room = await dbGet(['rooms', G.roomId]) || {}
	const passed = gs.passed || { player1: false, player2: false }
	passed[playerKey] = true
	const p1Supp = Array.isArray(room?.player1?.supports) ? room.player1.supports.length : 0
	const p2Supp = Array.isArray(room?.player2?.supports) ? room.player2.supports.length : 0
	const bothPass = passed.player1 && passed.player2
	const bothFull = p1Supp >= MAX_SUPPORT_SLOTS && p2Supp >= MAX_SUPPORT_SLOTS
	await dbSet(path, { ...gs, passed })
	if (bothPass || bothFull) {
		await dbSet(path, { ...(await dbGet(path) || {}), supportPhaseEnded: true })
		await revealBottom()
		return
	}
	const cur = gs.turn || 'player1'
	const next = cur === 'player1' ? 'player2' : 'player1'
	await dbSet(path, { ...(await dbGet(path) || {}), turn: next })
	setTurnStatus(next === G.role ? 'Lượt của bạn' : 'Lượt của đối thủ', next === G.role)
}

function toggleTurnIfNeeded(playerJustActed) {
	const next = playerJustActed === 'player1' ? 'player2' : 'player1'
	dbSet(['rooms', G.roomId, 'gameState', 'turn'], next)
}

// ===== PHẦN 7: BOTTOM & SCORING =====
async function waitForPendingEffects() {
	for (;;) {
		const gs = (await dbGet(['rooms', G.roomId, 'gameState'])) || {}
		const p1d = (gs['manualDraw_player1']?.remain || 0) + (gs['manualDiscard_player1']?.remain || 0)
		const p2d = (gs['manualDraw_player2']?.remain || 0) + (gs['manualDiscard_player2']?.remain || 0)
		if ((p1d + p2d) === 0) break
		await new Promise(r => setTimeout(r, 300))
	}
}

async function revealBottom() {
	const pathGS = ['rooms', G.roomId, 'gameState']
	const room = await dbGet(['rooms', G.roomId]) || {}
	const p1Bottom = room?.player1?.bottom || null
	const p2Bottom = room?.player2?.bottom || null
	if (!p1Bottom || !p2Bottom) return
	const gs0 = await dbGet(pathGS) || {}
	const reveal = { ...(gs0.reveal || {}), p1BottomRevealedToP2: true, p2BottomRevealedToP1: true }
	await dbSet(pathGS, { ...gs0, reveal })
	await showStatusStep('Lật bài tẩy', null, 2000)
	await scoreRound()
	const c1 = cardById(p1Bottom)
	const c2 = cardById(p2Bottom)
	if (c1?.skill?.trigger === 'bottom') {
		const ctx1 = buildCtx('player1'); ctx1.trigger = TRIGGER_BOTTOM
		await applyCardSkill(c1, 'bottom', ctx1)
		await waitForPendingEffects()
	}
	if (c2?.skill?.trigger === 'bottom') {
		const ctx2 = buildCtx('player2'); ctx2.trigger = TRIGGER_BOTTOM
		await applyCardSkill(c2, 'bottom', ctx2)
		await waitForPendingEffects()
	}
	await scoreRound()
	await resolveRound()
}

async function scoreRound() {
	const snap = await dbGet(['rooms', G.roomId]) || {}
	const reveal = snap?.gameState?.reveal || {}
	const bothRevealed = !!(reveal?.p1BottomRevealedToP2 && reveal?.p2BottomRevealedToP1)
	const bottomEnabled = !!snap?.gameState?.supportPhaseEnded || bothRevealed
	const p1IdMain = snap?.player1?.main || null
	const p2IdMain = snap?.player2?.main || null
	const p1SuppIds = Array.isArray(snap?.player1?.supports) ? snap.player1.supports : []
	const p2SuppIds = Array.isArray(snap?.player2?.supports) ? snap.player2.supports : []
	const p1BottomId = snap?.player1?.bottom || null
	const p2BottomId = snap?.player2?.bottom || null
	const p1BottomMain = bottomEnabled ? (cardById(p1BottomId)?.main || 0) : 0
	const p2BottomMain = bottomEnabled ? (cardById(p2BottomId)?.main || 0) : 0
	const p1BottomSupp = bottomEnabled ? (cardById(p1BottomId)?.support || 0) : 0
	const p2BottomSupp = bottomEnabled ? (cardById(p2BottomId)?.support || 0) : 0
	const p1BaseMain = (p1IdMain ? (cardById(p1IdMain)?.main || 0) : 0)
		+ p1SuppIds.reduce((s, id) => s + (cardById(id)?.main || 0), 0)
		+ p1BottomMain
	const p2BaseMain = (p2IdMain ? (cardById(p2IdMain)?.main || 0) : 0)
		+ p2SuppIds.reduce((s, id) => s + (cardById(id)?.main || 0), 0)
		+ p2BottomMain
	const p1BaseSupp = p1SuppIds.reduce((s, id) => s + (cardById(id)?.support || 0), 0)
		+ p1BottomSupp
	const p2BaseSupp = p2SuppIds.reduce((s, id) => s + (cardById(id)?.support || 0), 0)
		+ p2BottomSupp
	const rm = snap?.roundModifiers || { player1: { main: 0, supports: [] }, player2: { main: 0, supports: [] } }
	const p1DeltaMain = rm?.player1?.main || 0
	const p2DeltaMain = rm?.player2?.main || 0
	const p1DeltaSupp = Array.isArray(rm?.player1?.supports) ? rm.player1.supports.reduce((s, x) => s + (x?.delta || 0), 0) : 0
	const p2DeltaSupp = Array.isArray(rm?.player2?.supports) ? rm.player2.supports.reduce((s, x) => s + (x?.delta || 0), 0) : 0
	const computed = {
		p1: { main: p1BaseMain + p1DeltaMain, support: p1BaseSupp + p1DeltaSupp },
		p2: { main: p2BaseMain + p2DeltaMain, support: p2BaseSupp + p2DeltaSupp }
	}
	await dbSet(['rooms', G.roomId, 'gameState', 'computed'], computed)
	updateScoreBoxesWithModifiers()
}

async function resolveRound() {
	const snap = await dbGet(['rooms', G.roomId])
	const comp = snap?.gameState?.computed || { p1: { main: 0 }, p2: { main: 0 } }
	const p1m = comp?.p1?.main || 0
	const p2m = comp?.p2?.main || 0
	const winner = p1m > p2m ? 'player1' : (p2m > p1m ? 'player2' : null)

	const p1 = snap.player1 || {}
	const p2 = snap.player2 || {}

	const p1Main = p1.main || null
	const p2Main = p2.main || null
	const p1Bottom = p1.bottom || null
	const p2Bottom = p2.bottom || null
	const p1Supps = Array.isArray(p1.supports) ? p1.supports : []
	const p2Supps = Array.isArray(p2.supports) ? p2.supports : []

	if (winner === 'player1') {
		const wonPile = (p1.wonPile || []).concat([p1Main])
		await dbSet(['rooms', G.roomId, 'player1', 'wonPile'], wonPile)
		await dbSet(['rooms', G.roomId, 'player2', 'hand'], (p2.hand || []).concat([p2Bottom]))
		await dbSet(['rooms', G.roomId, 'player1', 'discard'], (p1.discard || []).concat(p1Supps, [p1Bottom]))
		await dbSet(['rooms', G.roomId, 'player2', 'discard'], (p2.discard || []).concat(p2Supps, [p2Main]))
		await logStep(`[Kết thúc ván]${p1.name || 'Player 1'} thắng với ${cardById(p1Main)?.name || p1Main}`)
		if (p1Supps.length) await logStep(`[${p1.name}] bỏ ${p1Supps.length} lá hỗ trợ`)
		if (p2Supps.length) await logStep(`[${p2.name}] bỏ ${p2Supps.length} lá hỗ trợ`)
	} else if (winner === 'player2') {
		const wonPile = (p2.wonPile || []).concat([p2Main])
		await dbSet(['rooms', G.roomId, 'player2', 'wonPile'], wonPile)
		await dbSet(['rooms', G.roomId, 'player1', 'hand'], (p1.hand || []).concat([p1Bottom]))
		await dbSet(['rooms', G.roomId, 'player2', 'discard'], (p2.discard || []).concat(p2Supps, [p2Bottom]))
		await dbSet(['rooms', G.roomId, 'player1', 'discard'], (p1.discard || []).concat(p1Supps, [p1Main]))
		await logStep(`[Kết thúc ván]${p2.name || 'Player 2'} thắng với ${cardById(p2Main)?.name || p2Main}`)
		if (p1Supps.length) await logStep(`[${p1.name}] bỏ ${p1Supps.length} lá hỗ trợ`)
		if (p2Supps.length) await logStep(`[${p2.name}] bỏ ${p2Supps.length} lá hỗ trợ`)
	}

	if (winner) {
		const w = snap?.gameState?.wins || { player1: 0, player2: 0 }
		w[winner] = (w[winner] || 0) + 1
		await dbSet(['rooms', G.roomId, 'gameState', 'wins'], w)
	}

	await dbSet(['rooms', G.roomId, 'player1', 'main'], null)
	await dbSet(['rooms', G.roomId, 'player2', 'main'], null)
	await dbSet(['rooms', G.roomId, 'player1', 'bottom'], null)
	await dbSet(['rooms', G.roomId, 'player2', 'bottom'], null)
	await dbSet(['rooms', G.roomId, 'player1', 'supports'], [])
	await dbSet(['rooms', G.roomId, 'player2', 'supports'], [])
	await dbSet(['rooms', G.roomId, 'player1', 'ready'], false)
	await dbSet(['rooms', G.roomId, 'player2', 'ready'], false)

	const nextRound = (snap?.gameState?.round || 1) + 1
	await dbSet(['rooms', G.roomId, 'gameState'], {
		turn: 'player1',
		round: nextRound,
		wins: snap?.gameState?.wins || { player1: 0, player2: 0 },
		flags: { supportLimit: null, supportBanThreshold: null, banDraw: false },
		reveal: { p1BottomRevealedToP2: false, p2BottomRevealedToP1: false },
		mainRevealed: false,
		mainSkillDone: { player1: false, player2: false },
		supportPhaseEnded: false,
		passed: { player1: false, player2: false },
		handSupportCount: { p1: 0, p2: 0 }
	})

	await drawUntil7Bootstrap()
	const oppRole = G.role === 'player1' ? 'player2' : 'player1'
	const oppHand = (await dbGet(['rooms', G.roomId, oppRole, 'hand'])) || []
	const needOpp = Math.max(0, MAX_HAND - oppHand.length)
	if (needOpp > 0) {
		await dbSet(['rooms', G.roomId, 'gameState', `manualDraw_${oppRole}`], { remain: needOpp })
	}
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

function renderDiscard(side, list) {
	const zone = side === 'me' ? DOMC.my.discard : DOMC.opp.discard
	while (zone.firstChild) zone.removeChild(zone.firstChild)
	const has = Array.isArray(list) && list.length > 0
	if (!has) return
	setStackTop(zone, 'card-back', false, false)
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

async function triggerBothMainSkills() {
	const p1Main = await dbGet(['rooms', G.roomId, 'player1', 'main'])
	const p2Main = await dbGet(['rooms', G.roomId, 'player2', 'main'])
	const c1 = cardById(p1Main)
	const c2 = cardById(p2Main)
	const ctx1 = buildCtx('player1'); ctx1.trigger = TRIGGER_MAIN
	const ctx2 = buildCtx('player2'); ctx2.trigger = TRIGGER_MAIN
	await Promise.all([
		applyCardSkill(c1, TRIGGER_MAIN, ctx1),
		applyCardSkill(c2, TRIGGER_MAIN, ctx2)
	])
}

function bootPlayBindings() {
	bindDeckClicks()
	bindHandDiscard()
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
async function applyCardSkill(card, trigger, ctx, opt = {}) {
	if (!card || !card.skill) return
	if (card.skill.trigger !== trigger) return
	const ok = await checkConditions(ctx, card.skill.condition)
	if (!ok) return
	const phase = opt.phase || 'all'
	const actions = card.skill.actions || []

	if (!ctx._logged) {
		let effectNote = ''
		if (phase === 'preCompare') {
			for (const step of actions) {
				const toOpp = step.target === 'opponent' || step.action === 'discard_from_opponent_hand_select'
				if (toOpp) continue
				if (step.action === 'add_main') {
					const t = resolveTarget(ctx, step.target)
					const n = await nameOf(t)
					const amt = Number(step.amount || 0)
					if (amt !== 0) effectNote = ` - ${amt >= 0 ? '+' : ''}${amt} điểm chiến tướng cho [${n}]`
					break
				}
			}
		}
		const ownerName = await nameOf(ctx.owner)
		const full = `[${ownerName}] kích hoạt skill [${card.skill.trigger}] - ${card.name}${effectNote}`
		await logStep(full)
		ctx._logged = true
	}

	for (let i = 0; i < actions.length; i++) {
		const step = actions[i]
		const toOpp = step.target === 'opponent' || step.action === 'discard_from_opponent_hand_select'
		if (phase === 'preCompare') {
			if (step.action !== 'add_main') continue
		}
		if (phase === 'postCompareOpponent') {
			if (step.action === 'add_main') continue
		}
		if (phase !== 'all' && phase !== 'preCompare' && phase !== 'postCompareOpponent') continue
		const a = step.action
		if (a === 'draw_manual') {
			await actDrawManual(ctx, step.target, step.amount || 1, card, { next: actions[i+1] })
		} else if (a === 'discard_select') {
			await actQueueDiscard(ctx, step.target, step.amount || 1, card)
		} else if (a === 'add_bottom_card') {
			await actAddBottomCard(ctx, step.target, step.amount || 1, card)
		} else if (a === 'add_support') {
			await actAddSupport(ctx, step.target, step.amount || 0, card)
		} else if (a === 'limit_support_from_hand') {
			await actLimitSupportFromHand(ctx, step.amount || 0, card)
		} else if (a === 'ban_support_with_support_gte') {
			await actBanSupportGte(ctx, step.threshold, card)
		} else if (a === 'discard_from_hand_top') {
			await actDiscardFromHandTop(ctx, step.target, step.amount || 1, card)
		} else if (a === 'support_from_deck_top') {
			await actSupportFromDeckTop(ctx, step.target, step.amount || 1, card)
		} else if (a === 'reveal_bottom_cards') {
			await actRevealBottomCards(ctx, step.target, card)
		} else if (a === 'add_main') {
			await actAddMain(ctx, step.target, step.amount || 0, card, true)
		} else if (a === 'discard_from_bottom') {
			await actDiscardFromBottom(ctx, step.target, step.amount || 1, card)
		} else if (a === 'discard_from_opponent_hand_select') {
			await actDiscardFromOpponentHandSelect(ctx, step.amount || 1, card)
		} else if (a === 'peek_opponent_deck_top') {
			await actPeekOpponentDeckTop(ctx, step.amount || 1, card)
		} else if (a === 'swap_with_won_card') {
			await actSwapWithWonCard(ctx, step.target, step.card_id, card)
		} else if (a === 'ban_draw') {
			await actBanDraw(ctx, card)
		}
	}
}

function bindOpponentHandSelectDiscard() {
	DOMC.opp.hand.addEventListener('click', async e => {
		const t = e.target.closest('.card[data-index]')
		if (!t) return
		const st = await dbGet(['rooms', G.roomId, 'gameState', 'opponentSelectDiscard'])
		if (!st || st.controller !== G.role || st.remain <= 0) return
		const idx = parseInt(t.dataset.index, 10)
		const target = st.target
		const hand = (await dbGet(['rooms', G.roomId, target, 'hand'])) || []
		if (idx < 0 || idx >= hand.length) return
		const id = hand[idx]
		hand.splice(idx, 1)
		const discard = (await dbGet(['rooms', G.roomId, target, 'discard'])) || []
		discard.push(id)
		await dbSet(['rooms', G.roomId, target, 'hand'], hand)
		await dbSet(['rooms', G.roomId, target, 'discard'], discard)
		const left = st.remain - 1
		if (left > 0) {
			await dbSet(['rooms', G.roomId, 'gameState', 'opponentSelectDiscard'], {
				controller: st.controller,
				target: st.target,
				remain: left
			})
			setTurnStatus(`Chọn bỏ tiếp • Còn ${left}`, true)
		} else {
			await dbSet(['rooms', G.roomId, 'gameState', 'opponentSelectDiscard'], null)
			setTurnStatus('Đặt thẻ hỗ trợ', true)
		}
	})
}

async function actDrawManual(ctx, target, amount, sourceCard, opt = {}) {
	const role = resolveTarget(ctx, target)
	const key = `manualDraw_${role}`
	await dbSet(['rooms', G.roomId, 'gameState', key], { remain: amount, from: sourceCard?.id || null })
	if (role === G.role) setTurnStatus(`Nhấp chồng bài để rút ${amount} lá`, true)
	if (opt?.next?.action === 'discard_select' && opt?.next?.amount > 0) {
		await dbSet(['rooms', G.roomId, 'gameState', `queuedDiscard_${role}`], { amount: opt.next.amount })
	}
}

async function actQueueDiscard(ctx, target, amount, card) {
	const role = resolveTarget(ctx, target)
	const gs = await dbGet(['rooms', G.roomId, 'gameState']) || {}
	const key = `manualDraw_${role}`
	const md = gs[key]
	if (md && (md.remain || 0) > 0) {
		await dbSet(['rooms', G.roomId, 'gameState', `queuedDiscard_${role}`], { amount })
		return
	}
	await dbSet(['rooms', G.roomId, 'gameState', `pendingDiscard_${role}`], { amount })
	if (role === G.role) setTurnStatus(`Chọn bỏ ${amount} thẻ`, true)
}

function bindDeckClicks() {
	DOMC.my.deck.onclick = async () => {
		const snap = await dbGet(['rooms', G.roomId]) || {}
		const gs = snap.gameState || {}
		const turn = gs.turn || 'player1'
		if (turn !== G.role) return
		if (gs.flags?.banDraw) return
		const key = `manualDraw_${G.role}`
		const md = gs[key]
		if (!md || (md.remain || 0) <= 0) return
		await drawOneToHand(G.role)
		const gs2 = (await dbGet(['rooms', G.roomId, 'gameState'])) || {}
		const left = (gs2[key]?.remain) || 0
		if (left > 0) setTurnStatus(`Nhấp rút tiếp (${left})`, true)
	}
}

function bindHandDiscard() {
	DOMC.my.hand.addEventListener('click', async e => {
		const t = e.target.closest('.card[data-id]')
		if (!t) return
		const pend = await dbGet(['rooms', G.roomId, 'gameState', `pendingDiscard_${G.role}`])
		if (!pend || pend.amount <= 0) return
		const id = t.dataset.id
		const hand = (await dbGet(['rooms', G.roomId, G.role, 'hand'])) || []
		const idx = hand.indexOf(id)
		if (idx < 0) return
		hand.splice(idx, 1)
		const discard = (await dbGet(['rooms', G.roomId, G.role, 'discard'])) || []
		discard.push(id)
		await dbSet(['rooms', G.roomId, G.role, 'hand'], hand)
		await dbSet(['rooms', G.roomId, G.role, 'discard'], discard)
		const left = pend.amount - 1
		if (left > 0) {
			await dbSet(['rooms', G.roomId, 'gameState', `pendingDiscard_${G.role}`], { amount: left })
			setTurnStatus(`Chọn bỏ tiếp • Còn ${left}`, true)
		} else {
			await dbSet(['rooms', G.roomId, 'gameState', `pendingDiscard_${G.role}`], null)
			setTurnStatus(`Đã bỏ xong`, true)
		}
	})
}

async function actDiscardSelect(ctx, target, amount, card) {
	const t = resolveTarget(ctx, target)
	await logSkill(ctx, card, `Chọn bỏ ${amount} lá trên tay`, true)
	const room = await ctx.getRoom()
	const node = room[t] || {}
	const hand = Array.isArray(node.hand) ? node.hand.slice() : []
	if (hand.length === 0) return

	const gs = room.gameState || {}
	const drawing = gs[`manualDraw_${t}`]
	if (drawing && (drawing.remain || 0) > 0) {
		const flags = { ...(gs.flags || {}), deferDiscardOnce: { player: t, amount } }
		await ctx.setGame({ ...gs, flags })
		return
	}
	const key = `manualDiscard_${t}`
	await ctx.setGame({ ...gs, [key]: { remain: amount } })
}

function resolveTarget(ctx, target) {
	if (target === 'self') return ctx.owner
	if (target === 'opponent') return ctx.opponent
	if (target === 'both') return 'both'
	return ctx.owner
}

async function actAddBottomCard(ctx, target, amount, card) {
	const t = resolveTarget(ctx, target)
	await logSkill(ctx, card, `Đặt thêm ${amount} lá vào bài tẩy`, true)
	const room = await ctx.getRoom()
	if (t === 'both') {
		await actAddBottomCard(ctx, 'self', amount, card)
		await actAddBottomCard(ctx, 'opponent', amount, card)
		return
	}
	const node = room[t] || {}
	const deck = Array.isArray(node.deck) ? node.deck.slice() : []
	let bottom = node.bottom || null
	const bottomExtra = Array.isArray(node.bottomExtra) ? node.bottomExtra.slice() : []
	let left = amount || 0
	while (left > 0 && deck.length > 0) {
		const top = deck.shift()
		if (!bottom) bottom = top
		else bottomExtra.push(top)
		left--
	}
	await ctx.setPlayer(t, { ...node, deck, bottom, bottomExtra })
}

async function actAddSupport(ctx, target, amount, card) {
	const t = resolveTarget(ctx, target)
	const delta = Number(amount || 0)
	await logSkill(ctx, card, `${delta >= 0 ? '+' : ''}${delta} điểm hỗ trợ`, true)
	const rm = (await ctx.getRoom()).roundModifiers || { player1: { main: 0, supports: [] }, player2: { main: 0, supports: [] } }
	const key = t
	const arr = Array.isArray(rm[key]?.supports) ? rm[key].supports.slice() : []
	arr.push({ slot: arr.length, delta, source: ctx.source || null })
	const next = { ...rm, [key]: { main: rm[key]?.main || 0, supports: arr } }
	await ctx.setMods(next)
}

async function actLimitSupportFromHand(ctx, amount, card) {
    await logSkill(ctx, card, `Giới hạn dùng hỗ trợ từ tay: ${amount}`, true);
    const room = await ctx.getRoom();
    const gs = room.gameState || {};
    const flags = { ...(gs.flags || {}), supportLimit: amount };
    await ctx.setGame({ ...gs, flags });
}

async function actBanSupportGte(ctx, threshold, card) {
	await logSkill(ctx, card, `Cấm dùng thẻ hỗ trợ có điểm ≥ ${threshold}`, true)
	const room = await ctx.getRoom()
	const gs = room.gameState || {}
	const flags = { ...(gs.flags || {}), supportBanThreshold: threshold }
	await ctx.setGame({ ...gs, flags })
}

async function actDiscardFromHandTop(ctx, target, amount, card) {
	await logSkill(ctx, card, `Bỏ ${amount} lá trên tay`, true)
	const t = resolveTarget(ctx, target)
	const room = await ctx.getRoom()
	const node = room[t] || {}
	const hand = Array.isArray(node.hand) ? node.hand.slice() : []
	const discard = Array.isArray(node.discard) ? node.discard.slice() : []
	for (let i = 0; i < (amount || 0) && hand.length > 0; i++) discard.push(hand.shift())
	await ctx.setPlayer(t, { ...node, hand, discard })
}

async function actSupportFromDeckTop(ctx, target, amount, card) {
	await logSkill(ctx, card, `Lấy ${amount} lá trên cùng bộ bài làm hỗ trợ`, true)
	const t = resolveTarget(ctx, target)
	const room = await ctx.getRoom()
	const node = room[t] || {}
	const deck = Array.isArray(node.deck) ? node.deck.slice() : []
	const supports = Array.isArray(node.supports) ? node.supports.slice(0, MAX_SUPPORT_SLOTS) : []
	let n = Math.min(amount || 0, MAX_SUPPORT_SLOTS - supports.length, deck.length)
	const added = []
	while (n > 0) {
		const top = deck.shift()
		supports.push(top)
		added.push(top)
		n--
	}
	await ctx.setPlayer(t, { ...node, deck, supports })
	await scoreRound()
	for (const cid of added) {
		const cObj = cardById(cid)
		if (!cObj) continue
		const subCtx = buildCtx(t)
		subCtx.trigger = TRIGGER_SUPPORT
		subCtx.source = SOURCE_DECK_TOP
		await applyCardSkill(cObj, TRIGGER_SUPPORT, subCtx)
		await scoreRound()
	}
}

async function actRevealBottomCards(ctx, target, card) {
	const room = await dbGet(['rooms', G.roomId]) || {}
	const gs = room.gameState || {}
	const reveal = { ...(gs.reveal || {}) }
	if (ctx.owner === 'player1') reveal.p2BottomRevealedToP1 = true
	else reveal.p1BottomRevealedToP2 = true
	await dbSet(['rooms', G.roomId, 'gameState', 'reveal'], reveal)
	await logSkill(ctx, card, 'Lật bài tẩy của đối thủ', true)
}

async function actAddMain(ctx, target, amount, card, silent = false) {
	const t = resolveTarget(ctx, target)
	const rm = (await ctx.getRoom()).roundModifiers || { player1: { main: 0, supports: [] }, player2: { main: 0, supports: [] } }
	const cur = rm[t]?.main || 0
	const next = { ...rm, [t]: { main: cur + (amount || 0), supports: rm[t]?.supports || [] } }
	await ctx.setMods(next)
	if (!silent) {
		const n = await nameOf(t)
		await logStep(`[${await nameOf(ctx.owner)}] +${amount} điểm chiến tướng cho [${n}] - ${card.name}`)
	}
}

async function actDiscardFromBottom(ctx, target, amount, card) {
	await logSkill(ctx, card, `Bỏ ${amount} lá bài tẩy của mình`, true)
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
	const controller = ctx.owner
	const target = ctx.opponent
	const room = await ctx.getRoom()
	const tHand = (room?.[target]?.hand || []).slice()
	if (tHand.length === 0) return
	await logSkill(ctx, card, `Chọn bỏ ${Math.min(amount, tHand.length)} lá trên tay đối thủ`, true)
	const gs = room.gameState || {}
	await ctx.setGame({
		...gs,
		opponentSelectDiscard: {
			controller,
			target,
			remain: Math.min(amount, tHand.length)
		}
	})
	if (controller === G.role) setTurnStatus(`Chọn bỏ ${Math.min(amount, tHand.length)} lá trên tay đối thủ`, true)
}

async function actPeekOpponentDeckTop(ctx, amount, card) {
	await logSkill(ctx, card, `Xem ${amount} lá trên cùng bộ bài đối thủ`, true)
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
	await logSkill(ctx, card, `Đổi vị trí với 1 lá đã thắng`, true)
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
	await logSkill(ctx, card, `Cấm rút bài trong lượt này`, true)
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
	createActionLog()
	loadLogs()
	bindOpponentHandSelectDiscard()
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

async function logSkill(ctx, card, msg, effect = true) {
	const name = await nameOf(ctx.owner)
	const prefix = effect ? '' : ''
	const full = `[${name}] ${msg} [${card.skill.trigger}] ${card.name ? '- ' + card.name : ''}`
	await logStep(full)
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

async function logStep(msg, obj) {
	const key = Date.now()
	await dbSet(['rooms', G.roomId, 'logs', key], msg)
}

function checkWinAndAnnounce(gs, names) {
  const target = WIN_TARGET
  const w1 = gs?.wins?.player1 | 0
  const w2 = gs?.wins?.player2 | 0
  if (w1 >= target || w2 >= target) {
    const winner = w1 >= target ? 'player1' : 'player2'
    const looser = winner === 'player1' ? 'player2' : 'player1'
    const wn = names?.[winner] || (winner === 'player1' ? 'Player 1' : 'Player 2')
    const ln = names?.[looser] || (looser === 'player1' ? 'Player 1' : 'Player 2')
    setTurnStatus(`${wn} thắng TRẬN (${w1}-${w2})`, null)
    G.game.ended = true
    return true
  }
  return false
}

function pushLog(msg) {
	const key = `tcg_logs_${G?.roomId || 'local'}`
	const arr = JSON.parse(localStorage.getItem(key) || '[]')
	arr.push({ t: Date.now(), msg })
	localStorage.setItem(key, JSON.stringify(arr))
}

function loadLogs() {
  const key = `tcg_logs_${G?.roomId || 'local'}`
  const arr = JSON.parse(localStorage.getItem(key) || '[]')
  arr.forEach(x => console.log(x.msg))
}

function clearLogs() {
  localStorage.removeItem(`tcg_logs_${G?.roomId || 'local'}`)
}

function guide(text) { setTurnStatus(text, G.game.turn === G.role) }
function clearGuide() {
	const n = document.querySelector('.turn-label')
	if (n) n.remove()
}

function bindReadyButton() {
	let btn = document.getElementById('btn-ready-prep')
	if (!btn) {
		btn = document.createElement('button')
		btn.id = 'btn-ready-prep'
		btn.textContent = 'Sẵn sàng'
		btn.className = `tcg-btn ready ${G.role === 'player1' ? 'btn-p1' : 'btn-p2'}`
		const host = document.querySelector('.play-area')
		if (host) host.appendChild(btn)
	}
	btn.onclick = onClickReadyPrep
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
