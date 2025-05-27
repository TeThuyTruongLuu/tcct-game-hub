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

    diceMesh1 = createDice();
    diceMesh2 = createDice();
    diceMesh1.position.set(-0.7, 0, 0);
    diceMesh2.position.set(0.7, 0, 0);
    scene.add(diceMesh1, diceMesh2);

    const light = new THREE.PointLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    animate();
}


function createDice() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const dice = new THREE.Mesh(geometry, material);

    const dotMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const dotGeo = new THREE.SphereGeometry(0.08, 16, 16);

    const positions = [
        // Face 1 (z+)
        [[0, 0, 0.51]],
        // Face 2 (z-)
        [[-0.2, -0.2, -0.51], [0.2, 0.2, -0.51]],
        // Face 3 (x+)
        [[-0.25, 0.25, 0.51], [0, 0, 0.51], [0.25, -0.25, 0.51]],
        // Face 4 (x-)
        [[-0.25, 0.25, -0.51], [-0.25, -0.25, -0.51], [0.25, 0.25, -0.51], [0.25, -0.25, -0.51]],
        // Face 5 (y+)
        [[-0.25, -0.25, 0.51], [-0.25, 0.25, 0.51], [0, 0, 0.51], [0.25, -0.25, 0.51], [0.25, 0.25, 0.51]],
        // Face 6 (y-)
        [[-0.25, -0.3, -0.51], [-0.25, 0, -0.51], [-0.25, 0.3, -0.51],
         [0.25, -0.3, -0.51], [0.25, 0, -0.51], [0.25, 0.3, -0.51]],
    ];

    positions.forEach(face => {
        face.forEach(pos => {
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

    // animation placeholder
    setTimeout(() => {
        setFinalRotation(diceMesh1, result1);
        setFinalRotation(diceMesh2, result2);

        rolling = false;
        if (callback) callback(result1, result2);
    }, 1000);
}


function setFinalRotation(dice, value) {
    const rotations = {
        1: [0, 0, 0],
        2: [0, Math.PI / 2, 0],
        3: [Math.PI / 2, 0, 0],
        4: [-Math.PI / 2, 0, 0],
        5: [0, -Math.PI / 2, 0],
        6: [Math.PI, 0, 0]
    };
    const r = rotations[value];
    dice.rotation.set(r[0], r[1], r[2]);
}


window.initDice = initDice;
window.rollDice = rollDice;