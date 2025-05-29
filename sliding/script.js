// Danh sách các miếng hình (bỏ hình 5 vì là ô trống)
const imageTiles = ['1.png', '2.png', '3.png', '4.png', '6.png', '7.png', '8.png', '9.png'];

const emptyTile = null; // đại diện cho ô trống (hình trái tim)

// Trạng thái hiện tại của puzzle (sẽ được xáo trộn)
let tiles = [];

// Vị trí hoàn chỉnh để kiểm tra thắng
const winningState = ['1.png', '2.png', '3.png', '4.png', null, '6.png', '7.png', '8.png', '9.png'];

const puzzle = document.getElementById('puzzle');

function shuffle(array) {
  // Fisher-Yates shuffle
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// Tạo mảng ban đầu (8 hình + 1 ô trống), rồi xáo
function initPuzzle() {
  tiles = [...imageTiles, emptyTile];
  shuffle(tiles);

  // Đảm bảo không rơi trúng luôn mảng đúng (hiếm nhưng có)
  while (JSON.stringify(tiles) === JSON.stringify(winningState)) {
    shuffle(tiles);
  }

  render();
}

// Vẽ giao diện theo mảng tiles
function render() {
  puzzle.innerHTML = ''; // clear

  tiles.forEach((tile, index) => {
    const div = document.createElement('div');
    div.classList.add('tile');

    if (tile === emptyTile) {
      div.classList.add('empty');
    } else {
      div.style.backgroundImage = `url('${tile}')`;
      div.addEventListener('click', () => tryMove(index));
    }

    puzzle.appendChild(div);
  });
}

// Kiểm tra nếu có thể di chuyển (kề ô trống)
function tryMove(index) {
  const emptyIndex = tiles.indexOf(emptyTile);
  const validMoves = getAdjacentIndexes(emptyIndex);

  if (validMoves.includes(index)) {
    [tiles[emptyIndex], tiles[index]] = [tiles[index], tiles[emptyIndex]];
    render();
    checkWin();
  }
}

// Trả về các chỉ số ô kề
function getAdjacentIndexes(index) {
  const adjacent = [];
  const row = Math.floor(index / 3);
  const col = index % 3;

  if (row > 0) adjacent.push(index - 3);     // trên
  if (row < 2) adjacent.push(index + 3);     // dưới
  if (col > 0) adjacent.push(index - 1);     // trái
  if (col < 2) adjacent.push(index + 1);     // phải

  return adjacent;
}

// Kiểm tra xem đã thắng chưa
function checkWin() {
  if (JSON.stringify(tiles) === JSON.stringify(winningState)) {
    setTimeout(() => alert('🎉 You win!'), 200);
  }
}

initPuzzle();
