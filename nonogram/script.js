const puzzles = [
  {
    id: "demo01",
    title: "Demo Board",
    createdBy: "admin",
    solution: [[0,1,1,0,0,1,1,1,0,0],[...]],
    hintRows: [[2],[3],...],
    hintCols: [[1,1],[2],...],
    imageUrl: "real01.png",
    coverUrl: "cover01.png"
  }
];

const colors = ['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff'];
let selectedColor = 1;

function initPalette() {
  const palette = document.getElementById('palette');
  colors.forEach((color, index) => {
    const swatch = document.createElement('div');
    swatch.className = 'color-option';
    swatch.style.backgroundColor = color;
    if (index === selectedColor) swatch.classList.add('selected');
    swatch.addEventListener('click', () => {
      selectedColor = index;
      document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
      swatch.classList.add('selected');
    });
    palette.appendChild(swatch);
  });
}
