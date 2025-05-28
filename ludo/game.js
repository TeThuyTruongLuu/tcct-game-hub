const pieces = {
    red: { 1: { position: null, inHome: false }, 2: { position: null, inHome: false }, 3: { position: null, inHome: false }, 4: { position: null, inHome: false } },
    green: { 1: { position: null, inHome: false }, 2: { position: null, inHome: false }, 3: { position: null, inHome: false }, 4: { position: null, inHome: false } },
    yellow: { 1: { position: null, inHome: false }, 2: { position: null, inHome: false }, 3: { position: null, inHome: false }, 4: { position: null, inHome: false } },
    blue: { 1: { position: null, inHome: false }, 2: { position: null, inHome: false }, 3: { position: null, inHome: false }, 4: { position: null, inHome: false } }
};

const path = ["cell-1-6", "cell-2-6", "cell-3-6", "cell-4-6", "cell-5-6", "cell-6-6", // ✅ RED START
"cell-6-5", "cell-6-4", "cell-6-3", "cell-6-2", "cell-6-1", 
"cell-7-1", "cell-8-1", "cell-9-1", "cell-10-1",
"cell-10-2", "cell-10-3", "cell-10-4", "cell-10-5", "cell-10-6", // ✅ YELLOW START
"cell-11-6", "cell-12-6", "cell-13-6", "cell-14-6", "cell-15-6",
"cell-15-7", "cell-15-8", "cell-15-9", "cell-15-10", // ✅ BLUE START
"cell-14-10", "cell-13-10", "cell-12-10", "cell-11-10", "cell-10-10",
"cell-10-11", "cell-10-12", "cell-10-13", "cell-10-14", "cell-10-15",
"cell-9-15", "cell-8-15", "cell-7-15", "cell-6-15", // ✅ GREEN START
"cell-6-14", "cell-6-13", "cell-6-12", "cell-6-11", "cell-6-10",
"cell-5-10", "cell-4-10", "cell-3-10", "cell-2-10", "cell-1-10",
"cell-1-9", "cell-1-8", "cell-1-7"
];


const startPositions = {
  red: 0,
  blue: 11,
  yellow: 23,
  green: 36
};


let currentPlayer = 'red';
let selectedSteps = 0;
let rolledDouble = false;


const die1 = document.getElementById('dice1');
const die2 = document.getElementById('dice2');
const rollDiceBtn = document.getElementById('rollButton');

function onDiceRolled(val1, val2) {
    console.log("🎲 Dice rolled:", val1, "+", val2);
    const resultDiv = document.getElementById("dice-result");
    resultDiv.textContent = `🎲 ${val1} + ${val2}`;

    const canRelease = (val1 === val2) || (val1 === 6 && val2 === 1) || (val1 === 1 && val2 === 6);
    rolledDouble = (val1 === val2);
    selectedSteps = val1 + val2;
    console.log("👉 selectedSteps set to", selectedSteps);

    if (canRelease) {
        highlightReleasablePieces(currentPlayer);
    } else {
        highlightMovablePieces(currentPlayer, selectedSteps);
    }
}


function highlightReleasablePieces(color) {
    const currentPieces = pieces[color];
	const start = startPositions[color];
    for (let j = 1; j <= 4; j++) {
        if (currentPieces[j].position === start) return;
    }
    for (let i = 1; i <= 4; i++) {
        const piece = currentPieces[i];
        if (piece.position === null) {
            const el = document.getElementById(`${color}-${i}`);
            el.classList.add("highlight");
            el.onclick = () => {
                releasePiece(color, i);
                clearHighlights();
                if (!rolledDouble) nextPlayer();
            };
        }
    }
}

function highlightMovablePieces(color, steps) {
	console.log(`🟢 Highlighting movable ${color} with ${steps} steps`);
    const currentPieces = pieces[color];
    for (let i = 1; i <= 4; i++) {
        const piece = currentPieces[i];
        if (piece.position !== null && !piece.inHome) {
            const dest = (piece.position + steps) % path.length;
            if (canMove(piece.position, dest, color)) {
                const el = document.getElementById(`${color}-${i}`);
                const destCell = document.getElementById(path[dest]);
                if (destCell) destCell.classList.add("highlight-cell");

                el.classList.add("highlight");
                el.onclick = () => {
                    clearHighlights();
                    animateMove(color, i, piece.position, dest, () => {
                        kickEnemy(dest, color);
                        if (!rolledDouble) nextPlayer();
                    });
                };
            }
        }
    }
}

function releasePiece(color) {
    const currentPieces = pieces[color];
    for (let i = 1; i <= 4; i++) {
        const piece = currentPieces[i];
        if (piece.position === null) {
            piece.position = startPositions[color];
            const pieceEl = document.getElementById(`${color}-${i}`);
            const startCell = document.querySelector(`.cell.start.${color}`);
            if (startCell && pieceEl) startCell.appendChild(pieceEl);
            break;
        }
    }
}

function movePieceTo(color, pieceId, dest) {
    const piece = pieces[color][pieceId];

    for (const otherColor in pieces) {
        for (let i = 1; i <= 4; i++) {
            const other = pieces[otherColor][i];
            if (other.position === dest && otherColor !== color) {
                other.position = null;
                const el = document.getElementById(`${otherColor}-${i}`);
                const home = document.querySelector(`.home.${otherColor} .piece-wrapper`);
                if (el && home) home.appendChild(el);
            }
        }
    }

    piece.position = dest;
    const el = document.getElementById(`${color}-${pieceId}`);
    const cell = document.getElementById(path[dest]);
    if (el && cell) cell.appendChild(el);
}

function canMove(from, to, color) {
    let distance = (to - from + path.length) % path.length;
    console.log(`⛳ Trying to move from ${from} (${path[from]}) to ${to} (${path[to]})`);

    for (let i = 1; i < distance; i++) {
        const step = (from + i) % path.length;
        const stepId = path[step];
        for (const otherColor in pieces) {
            for (let j = 1; j <= 4; j++) {
                const p = pieces[otherColor][j];
                if (p.position === step) {
                    console.warn(`🚫 Blocked at step ${stepId} by ${otherColor}-${j}`);
                    return false;
                }
            }
        }
    }

    for (let j = 1; j <= 4; j++) {
        const p = pieces[color][j];
        if (p.position === to) {
            console.warn(`❌ Destination ${path[to]} already occupied by ${color}-${j}`);
            return false;
        }
    }

    return true;
}


function clearHighlights() {
    document.querySelectorAll(".piece.highlight").forEach(p => {
        p.classList.remove("highlight");
        p.onclick = null;
    });
    document.querySelectorAll(".highlight-cell").forEach(c => {
        c.classList.remove("highlight-cell");
    });
}

function nextPlayer() {
    const players = ['red', 'green', 'yellow', 'blue'];
    const idx = players.indexOf(currentPlayer);
    currentPlayer = players[(idx + 1) % 4];
	highlightMovablePieces(currentPlayer, selectedSteps);
}


let scene, camera, renderer, world, diceMesh1, diceMesh2;
let rolling = false;
let callback = null;

function initDice(canvasId, onRollDone) {
    callback = onRollDone;
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    document.getElementById(canvasId).appendChild(renderer.domElement);
    renderer.setSize(150, 150);
    renderer.shadowMap.enabled = true; // Bật shadow map
    camera.position.z = 5;

    world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, -9.82) });

    diceMesh1 = createDice();
    diceMesh2 = createDice();
	diceMesh1.position.set(-0.9, 0, 0);
	diceMesh2.position.set(0.9, 0, 0);
    diceMesh1.castShadow = true;
    diceMesh2.castShadow = true;
    scene.add(diceMesh1, diceMesh2);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambient);

    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 5, 5);
    light.castShadow = true; // Ánh sáng tạo bóng
    scene.add(light);

    animate();
}


function createDice() {
    const geometry = new THREE.BoxGeometry(1.3, 1.3, 1.3);
    const material = new THREE.MeshPhongMaterial({ color: 0xffffff });
    const dice = new THREE.Mesh(geometry, material);

    const dotMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
    const dotGeo = new THREE.SphereGeometry(0.08, 32, 32);

    const faceDots = {
		1: [[0, 0, 0.63]], // Z+
		2: [[-0.2, -0.2, 0], [0.2, 0.2, 0]].map(p => [p[0], -0.63, p[1]]),
		3: [[-0.25, 0.25, 0], [0, 0, 0], [0.25, -0.25, 0]].map(p => [0.63, p[0], p[1]]),
		4: [[-0.25, 0.25, 0], [-0.25, -0.25, 0], [0.25, 0.25, 0], [0.25, -0.25, 0]].map(p => [-0.63, p[0], p[1]]),
		5: [[-0.25, -0.25, 0], [-0.25, 0.25, 0], [0, 0, 0], [0.25, -0.25, 0], [0.25, 0.25, 0]].map(p => [p[0], 0.63, p[1]]),
		6: [[-0.25, -0.3, 0], [-0.25, 0, 0], [-0.25, 0.3, 0], [0.25, -0.3, 0], [0.25, 0, 0], [0.25, 0.3, 0]].map(p => [p[0], p[1], -0.63])

    };

    Object.keys(faceDots).forEach(face => {
        faceDots[face].forEach(pos => {
            const dot = new THREE.Mesh(dotGeo, dotMaterial);
            dot.position.set(pos[0], pos[1], pos[2]);
            dice.add(dot);
        });
    });

    return dice;
}


function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function rollDice() {
    if (rolling) return;
    rolling = true;

    const result1 = Math.floor(Math.random() * 6) + 1;
    const result2 = Math.floor(Math.random() * 6) + 1;

    setTimeout(() => {
        setFinalRotation(diceMesh1, result1);
        setFinalRotation(diceMesh2, result2);

        rolling = false;
        if (callback) callback(result1, result2);
    }, 300);
}


function setFinalRotation(dice, value) {
    const rotations = {
        1: [0, 0, 0],               // Z+
        2: [-Math.PI / 2, 0, 0],    // Y-
        3: [0, -Math.PI / 2, 0],    // X+
        4: [0, Math.PI / 2, 0],     // X-
        5: [Math.PI / 2, 0, 0],     // Y+
        6: [Math.PI, 0, 0]          // Z-
    };
    const r = rotations[value];
    dice.quaternion.setFromEuler(new THREE.Euler(r[0], r[1], r[2]));
}


window.initDice = initDice;
window.rollDice = rollDice;



function kickEnemy(position, currentColor) {
    for (const otherColor in pieces) {
        if (otherColor === currentColor) continue;
        for (let i = 1; i <= 4; i++) {
            const other = pieces[otherColor][i];
            if (other.position === position) {
                other.position = null;
                const el = document.getElementById(`${otherColor}-${i}`);
                const home = document.querySelector(`.home.${otherColor} .piece-wrapper`);
                if (el && home) home.appendChild(el);
            }
        }
    }
}

function animateMove(color, pieceId, from, to, callback) {
  const piece = pieces[color][pieceId];
  const el = document.getElementById(`${color}-${pieceId}`);
  const steps = [];

  let current = from;
  while (current !== to) {
    current = (current + 1) % path.length;
    steps.push(current);
  }

  function stepThrough(i) {
    if (i >= steps.length) {
      piece.position = to;
      if (callback) callback();
      return;
    }
    const cell = document.getElementById(path[steps[i]]);
    if (cell && el) cell.appendChild(el);
    setTimeout(() => stepThrough(i + 1), 500);
  }

  stepThrough(0);
}
