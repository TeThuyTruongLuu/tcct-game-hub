const pieces = {
    red: { 1: { position: null, inHome: false }, 2: { position: null, inHome: false }, 3: { position: null, inHome: false }, 4: { position: null, inHome: false } },
    green: { 1: { position: null, inHome: false }, 2: { position: null, inHome: false }, 3: { position: null, inHome: false }, 4: { position: null, inHome: false } },
    yellow: { 1: { position: null, inHome: false }, 2: { position: null, inHome: false }, 3: { position: null, inHome: false }, 4: { position: null, inHome: false } },
    blue: { 1: { position: null, inHome: false }, 2: { position: null, inHome: false }, 3: { position: null, inHome: false }, 4: { position: null, inHome: false } }
};

const path = [...Array(52)].map((_, i) => 'path-' + (i + 1));
const startPositions = { red: 0, green: 13, yellow: 26, blue: 39 };

let currentPlayer = 'red';

const die1 = document.getElementById('dice1');
const die2 = document.getElementById('dice2');
const rollDiceBtn = document.getElementById('rollButton');

function onDiceRolled(val1, val2) {
    const resultDiv = document.getElementById("dice-result");
    resultDiv.textContent = `🎲 ${val1} + ${val2}`;

    const canRelease = (val1 === val2) || (val1 === 6 && val2 === 1) || (val1 === 1 && val2 === 6);
    if (canRelease) {
        releasePiece(currentPlayer);
    } else {
        movePiece(currentPlayer, val1 + val2);
    }

    nextPlayer();
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

function movePiece(color, steps) {
    const currentPieces = pieces[color];
    for (let i = 1; i <= 4; i++) {
        const piece = currentPieces[i];
        if (piece.position !== null && !piece.inHome) {
            let newPos = (piece.position + steps) % path.length;
            piece.position = newPos;
            const pieceEl = document.getElementById(`${color}-${i}`);
            const pathCell = document.getElementById(path[newPos]);
            if (pathCell && pieceEl) pathCell.appendChild(pieceEl);
            break;
        }
    }
}

function nextPlayer() {
    const players = ['red', 'green', 'yellow', 'blue'];
    const idx = players.indexOf(currentPlayer);
    currentPlayer = players[(idx + 1) % 4];
}

// --- Dice functions below ---
// dice.js
// Removed import of THREE
// Removed import of CANNON

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
    camera.position.z = 5;

    world = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, -9.82) });

    const diceGeometry = new THREE.BoxGeometry(1, 1, 1);
    const diceMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    diceMesh1 = new THREE.Mesh(diceGeometry, diceMaterial);
    diceMesh2 = new THREE.Mesh(diceGeometry, diceMaterial);
    scene.add(diceMesh1, diceMesh2);

    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    animate();
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

    // animation placeholder
    setTimeout(() => {
        diceMesh1.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
        diceMesh2.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);

        rolling = false;
        if (callback) callback(result1, result2);
    }, 1000);
}

window.initDice = initDice;
window.rollDice = rollDice;