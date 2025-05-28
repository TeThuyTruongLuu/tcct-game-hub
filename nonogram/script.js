let data = [], sizeR = 10, sizeC = 10, selectedColor = 1;
const colors = ['#ffffff', '#000000', '#008000', '#0000ff', '#ffff00', '#800080', '#ffa600'];
let isMouseDown = false;


const puzzles = [
  {
    id: "puzzle_fish_final_clean",
    title: "Cá vàng",
    createdBy: "admin",
  "solution": [
    [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      0,
      1,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ],
    [
      0,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      1,
      0,
      0,
      0
    ],
    [
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0
    ],
    [
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0
    ],
    [
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0
    ],
    [
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0
    ],
    [
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0
    ],
    [
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0
    ],
    [
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0
    ],
    [
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0
    ],
    [
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0
    ],
    [
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0
    ],
    [
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0
    ]
  ],
  "hintRows": [
    [
      3,
      1,
      1
    ],
    [
      5
    ],
    [
      8
    ],
    [
      8
    ],
    [
      4,
      8,
      3
    ],
    [
      21
    ],
    [
      19
    ],
    [
      21
    ],
    [
      21
    ],
    [
      21
    ],
    [
      21
    ],
    [
      21
    ],
    [
      19
    ],
    [
      21
    ],
    [
      21
    ],
    [
      7
    ]
  ],
  "hintCols": [
    [
      0
    ],
    [
      2,
      8
    ],
    [
      11
    ],
    [
      11
    ],
    [
      11
    ],
    [
      10
    ],
    [
      10
    ],
    [
      1,
      10
    ],
    [
      1,
      14
    ],
    [
      16
    ],
    [
      15
    ],
    [
      16
    ],
    [
      15
    ],
    [
      15
    ],
    [
      1,
      14
    ],
    [
      13
    ],
    [
      10
    ],
    [
      10
    ],
    [
      11
    ],
    [
      11
    ],
    [
      8,
      2
    ],
    [
      1,
      5,
      2
    ],
    [
      0
    ],
    [
      0
    ]
  ],
  
	imageUrl: "https://via.placeholder.com/100x100?text=Real",
	coverUrl: "https://via.placeholder.com/100x100?text=Cover"
  }
];


function showSection(id) {
  document.querySelectorAll('section').forEach(sec => sec.style.display = 'none');
  document.getElementById(id).style.display = 'block';
  if (id === 'album') renderAlbum();
  if (id === 'create') initCreateGrid();
}

function addRow() {
  data.push(Array(sizeC).fill(0));
  sizeR++;
  updateGrid();
}

function addCol() {
  data.forEach(row => row.push(0));
  sizeC++;
  updateGrid();
}

function getHints(line) {
  const res = [];
  let cnt = 0;
  for (let v of line) {
    if (v !== 0) cnt++;
    else if (cnt) { res.push(cnt); cnt = 0; }
  }
  if (cnt) res.push(cnt);
  return res.length ? res : [0];
}

function renderPalette() {
  const palette = document.getElementById('palette');
  palette.innerHTML = '';
  colors.forEach((color, index) => {
    const div = document.createElement('div');
    div.className = 'color-option';
    div.style.background = color;
    if (index === selectedColor) div.classList.add('selected');
    div.addEventListener('click', () => {
      selectedColor = index;
      document.querySelectorAll('.color-option').forEach(el => el.classList.remove('selected'));
      div.classList.add('selected');
    });
    palette.appendChild(div);
  });
}

function addCustomColor() {
  const color = document.getElementById('customColor').value;
  colors.push(color);
  renderPalette();
}

function updateGrid() {
  const table = document.getElementById('nonogramGrid');
  table.innerHTML = '';
  for (let r = 0; r < sizeR; r++) {
    const tr = document.createElement('tr');
    for (let c = 0; c < sizeC; c++) {
      const td = document.createElement('td');
      td.style.background = colors[data[r][c]];
      td.style.cursor = 'pointer';
      td.style.width = '24px';
      td.style.height = '24px';
	  td.addEventListener('mousedown', (e) => {
	    isMouseDown = true;
	    data[r][c] = selectedColor;
	    td.style.background = colors[selectedColor];
	    e.preventDefault();
	  });

	  td.addEventListener('mouseover', () => {
	    if (isMouseDown) {
		  data[r][c] = selectedColor;
		  td.style.background = colors[selectedColor];
	    }
	  });

	  td.addEventListener('mouseup', () => {
	    isMouseDown = false;
	  });
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }
}

function initCreateGrid() {
  data = Array(sizeR).fill().map(() => Array(sizeC).fill(0));
  renderPalette();
  updateGrid();
}

function previewBoard() {
  const preview = document.getElementById('previewArea');
  const rowHints = data.map(getHints);
  const colHints = Array(sizeC).fill().map((_, i) => getHints(data.map(row => row[i])));
  const table = document.createElement('table');
  table.style.marginTop = '20px';

  const maxRowHint = Math.max(...rowHints.map(h => h.length));
  const maxColHint = Math.max(...colHints.map(h => h.length));

  for (let r = -maxColHint; r < sizeR; r++) {
    const tr = document.createElement('tr');
    for (let c = -maxRowHint; c < sizeC; c++) {
      const td = document.createElement('td');
      td.style.width = '24px';
      td.style.height = '24px';
      td.style.textAlign = 'center';
      td.style.fontSize = '10px';
      td.style.border = '1px solid #ccc';

      if (r < 0 && c < 0) {
        td.style.background = '#f0f0f0';
      } else if (r < 0 && c >= 0) {
        const col = colHints[c];
        td.textContent = (col.length > (r + maxColHint - col.length)) ? col[r + maxColHint - col.length] : '';
        td.style.opacity = 0.4;
      } else if (r >= 0 && c < 0) {
        const row = rowHints[r];
        td.textContent = (row.length > (c + maxRowHint - row.length)) ? row[c + maxRowHint - row.length] : '';
        td.style.opacity = 0.4;
      } else {
        if (data[r][c] === 0) { td.textContent = '×'; } else { td.style.background = colors[data[r][c]]; }
      }
      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  preview.innerHTML = '';
  preview.appendChild(table);
}

function submitBoard() {
  const name = document.getElementById('creatorName').value.trim();
  const msg = document.getElementById('creatorMessage').value.trim();
  const output = {
    name,
    message: msg,
    solution: data
  };
  console.log('Đây là dữ liệu sẽ gửi duyệt:', output);
  alert('Dữ liệu đã sẵn sàng để gửi duyệt. Tạm thời xem log console nhé!');
}

document.body.addEventListener('mouseup', () => {
  isMouseDown = false;
});

function renderAlbum() {
  const albumDiv = document.getElementById('albumDiv');
  albumDiv.innerHTML = '';
  puzzles.forEach(puzzle => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img src="${puzzle.coverUrl}" alt="cover" />
      <p>${puzzle.title}</p>
      <a href="#" onclick="startGame('${puzzle.id}')">Chơi</a>
    `;
    albumDiv.appendChild(card);
  });
}

function startGame(id) {
  const puzzle = puzzles.find(p => p.id === id);
  if (!puzzle) return alert("Không tìm thấy bảng!");

  const rowHints = puzzle.hintRows;
  const colHints = puzzle.hintCols;
  const solution = puzzle.solution;

  const table = document.createElement('table');
  table.style.marginTop = '20px';

  const maxRowHint = Math.max(...rowHints.map(h => h.length));
  const maxColHint = Math.max(...colHints.map(h => h.length));

  for (let r = -maxColHint; r < solution.length; r++) {
    const tr = document.createElement('tr');
    for (let c = -maxRowHint; c < solution[0].length; c++) {
      const td = document.createElement('td');
      td.style.width = '24px';
      td.style.height = '24px';
      td.style.textAlign = 'center';
      td.style.fontSize = '10px';
      td.style.border = '1px solid #ccc';

      if (r < 0 && c < 0) {
        td.style.background = '#f0f0f0';
      } else if (r < 0 && c >= 0) {
        const col = colHints[c];
        const offset = maxColHint - col.length;
        const idx = r + offset;
        td.textContent = (idx >= 0) ? col[idx] : '';
        td.style.opacity = 0.4;
      } else if (r >= 0 && c < 0) {
        const row = rowHints[r];
        const offset = maxRowHint - row.length;
        const idx = c + offset;
        td.textContent = (idx >= 0) ? row[idx] : '';
        td.style.opacity = 0.4;
      } else {
        if (solution[r][c] === 0) {
          td.textContent = '×';
          td.style.opacity = 0.2;
        } else {
          td.style.background = '#444'; // hoặc để trống nếu chưa reveal
        }
      }

      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  document.querySelectorAll('section').forEach(sec => sec.style.display = 'none');
  document.getElementById('play').style.display = 'block';
  document.getElementById('playTitle').innerText = puzzle.title;
  const playArea = document.getElementById('playArea');
  playArea.innerHTML = '';
  playArea.appendChild(table);
}


