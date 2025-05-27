const die = document.getElementById('die');
const rollDieButton = document.getElementById('roll-die');

const pieces = {
    red: { 1: { position: null, inHome: false }, 2: { position: null, inHome: false }, 3: { position: null, inHome: false }, 4: { position: null, inHome: false } },
    green: { 1: { position: null, inHome: false }, 2: { position: null, inHome: false }, 3: { position: null, inHome: false }, 4: { position: null, inHome: false } },
    yellow: { 1: { position: null, inHome: false }, 2: { position: null, inHome: false }, 3: { position: null, inHome: false }, 4: { position: null, inHome: false } },
    blue: { 1: { position: null, inHome: false }, 2: { position: null, inHome: false }, 3: { position: null, inHome: false }, 4: { position: null, inHome: false } }
};

const path = [
    'path-1', 'path-2', 'path-3', 'path-4', 'path-5', 'path-6', 'path-7', 'path-8', 'path-9', 'path-10',
    'path-11', 'path-12', 'path-13', 'path-14', 'path-15', 'path-16', 'path-17', 'path-18', 'path-19', 'path-20',
    'path-21', 'path-22', 'path-23', 'path-24', 'path-25', 'path-26', 'path-27', 'path-28', 'path-29', 'path-30',
    'path-31', 'path-32', 'path-33', 'path-34', 'path-35', 'path-36', 'path-37', 'path-38', 'path-39', 'path-40',
    'path-41', 'path-42', 'path-43', 'path-44', 'path-45', 'path-46', 'path-47', 'path-48', 'path-49', 'path-50',
    'path-51', 'path-52'
];

const startPositions = { red: 0, green: 13, yellow: 26, blue: 39 };
const homePaths = {
    red: ['red-home-1', 'red-home-2', 'red-home-3', 'red-home-4', 'red-home-5'],
    green: ['green-home-1', 'green-home-2', 'green-home-3', 'green-home-4', 'green-home-5'],
    yellow: ['yellow-home-1', 'yellow-home-2', 'yellow-home-3', 'yellow-home-4', 'yellow-home-5'],
    blue: ['blue-home-1', 'blue-home-2', 'blue-home-3', 'blue-home-4', 'blue-home-5']
};

let currentPlayer = 'red';
let dieValue = 3;

function rollDie() {
    dieValue = Math.floor(Math.random() * 6) + 1;
    die.textContent = dieValue;
    movePiece();
}

function movePiece() {
    const currentPieces = pieces[currentPlayer];
    let moved = false;

    for (let i = 1; i <= 4; i++) {
        const piece = currentPieces[i];
        if (!piece.inHome && (piece.position === null || dieValue === 6)) {
            if (piece.position === null && dieValue === 6) {
                piece.position = startPositions[currentPlayer];
                document.getElementById(path[piece.position]).appendChild(document.getElementById(`${currentPlayer}-${i}`));
                moved = true;
                break;
            } else if (piece.position !== null) {
                let newPos = (piece.position + dieValue) % path.length;
                if (newPos >= startPositions[currentPlayer] && newPos < (startPositions[currentPlayer] + 6) % 52) {
                    const homeStep = newPos - startPositions[currentPlayer];
                    if (homeStep < 5) {
                        document.getElementById(homePaths[currentPlayer][homeStep]).appendChild(document.getElementById(`${currentPlayer}-${i}`));
                        if (homeStep === 4) piece.inHome = true;
                    } else {
                        piece.position = newPos;
                        document.getElementById(path[piece.position]).appendChild(document.getElementById(`${currentPlayer}-${i}`));
                    }
                } else {
                    piece.position = newPos;
                    document.getElementById(path[piece.position]).appendChild(document.getElementById(`${currentPlayer}-${i}`));
                }
                moved = true;
                break;
            }
        }
    }

    if (moved) {
        const players = ['red', 'green', 'yellow', 'blue'];
        currentPlayer = players[(players.indexOf(currentPlayer) + 1) % 4];
    }
}

rollDieButton.addEventListener('click', rollDie);