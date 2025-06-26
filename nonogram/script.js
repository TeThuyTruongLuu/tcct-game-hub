let data = [], sizeR = 10, sizeC = 10, selectedColor = 1;
const colors = ['#ffffff', '#000000', '#008000', '#0000ff', '#ffff00', '#800080', '#ffa600'];
let isMouseDown = false;
document.addEventListener('mouseup', () => {
  isMouseDown = false;
});


const puzzles = [];
const { FieldValue } = firebase.firestore;

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

function removeRow() {
  if (sizeR > 1) {
    data.pop();
    sizeR--;
    updateGrid();
  }
}

function removeCol() {
  if (sizeC > 1) {
    data.forEach(row => row.pop());
    sizeC--;
    updateGrid();
  }
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

function generatePreviewImage() {
  const canvas = document.createElement('canvas');
  const cellSize = 12;
  canvas.width = sizeC * cellSize;
  canvas.height = sizeR * cellSize;
  const ctx = canvas.getContext('2d');

  for (let r = 0; r < sizeR; r++) {
    for (let c = 0; c < sizeC; c++) {
      ctx.fillStyle = colors[data[r][c]];
      ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
      ctx.strokeStyle = '#999';
      ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
    }
  }

  return canvas.toDataURL('image/png');
}

function previewBoard() {
  const preview = document.getElementById('previewArea');
  preview.innerHTML = '<h3>Xem trước bảng</h3>';

  const previewImage = document.createElement('img');
  previewImage.src = generatePreviewImage();
  previewImage.style.marginTop = '10px';
  previewImage.style.border = '1px solid #ccc';
  preview.appendChild(previewImage);

  const norm = data.map(row => row.map(val => val === 0 ? 0 : 1));
  const hintRows = norm.map(row => getHints(row));
  const hintCols = Array(sizeC).fill().map((_, i) => getHints(norm.map(row => row[i])));

  const table = document.createElement('table');
  table.className = 'nonogram-table';
  table.style.marginTop = '20px';

  for (let r = -1; r < sizeR; r++) {
    const tr = document.createElement('tr');
    for (let c = -1; c < sizeC; c++) {
      const td = document.createElement('td');
      td.style.width = '24px';
      td.style.height = '24px';
      td.style.textAlign = 'center';
      td.style.verticalAlign = 'middle';
      td.style.fontSize = '10px';

      if (r < 0 && c < 0) {
        td.style.background = '#f0f0f0';
        td.innerHTML = ' ';
      } else if (r < 0 && c >= 0) {
        const colHint = hintCols[c];
        if (colHint.length > 0) {
          td.classList.add('hint-cell');
          td.innerHTML = colHint.map(num => num).join('<br>');
        } else {
          td.innerHTML = ' ';
        }
      } else if (r >= 0 && c < 0) {
        const rowHint = hintRows[r];
        if (rowHint.length > 0) {
          td.classList.add('hint-cell');
          td.textContent = rowHint.join(' ');
        } else {
          td.innerHTML = ' ';
        }
      } else {
        const val = data[r][c];
        if (val === 0) {
          td.textContent = '×';
          td.style.opacity = 0.2;
        } else {
          td.classList.add('solution-cell');
          td.style.background = colors[val];
        }
      }

      tr.appendChild(td);
    }
    table.appendChild(tr);
  }

  preview.appendChild(table);
}

async function submitBoard() {
  try {
    const puzzleId = `puzzle_${Date.now()}`;
    const creatorInput = document.getElementById("creatorName");
    const messageInput = document.getElementById("creatorMessage");

    const norm = data.map(row => row.map(val => val === 0 ? 0 : 1));
    const hintRows = norm.map(row => getHints(row));
    const hintCols = Array(sizeC).fill().map((_, i) => getHints(norm.map(row => row[i])));

    function generateSmallPreviewImage() {
      const canvas = document.createElement('canvas');
      const cellSize = 12;
      canvas.width = sizeC * cellSize;
      canvas.height = sizeR * cellSize;
      const ctx = canvas.getContext('2d');

      for (let r = 0; r < sizeR; r++) {
        for (let c = 0; c < sizeC; c++) {
          ctx.fillStyle = colors[data[r][c]];
          ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
          ctx.strokeStyle = '#999';
          ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
        }
      }

      return canvas.toDataURL('image/png');
    }

    const previewImageDataUrl = generateSmallPreviewImage();

    // 🚀 Upload ảnh lên ImgBB
    const imgbbApiKey = '614645a70f3969e9f59d39fe4ea826f8';
    const imgbbLink = await uploadToImgBB(previewImageDataUrl, imgbbApiKey);

    // 🚀 Gửi log lên Firestore
    await window.db.collection('pendingNonograms').doc(puzzleId).set({
      title: "Chưa đặt tên",
      creator: creatorInput.value.trim() || "N/A",
      message: messageInput.value.trim() || "",
      solution: JSON.stringify(norm),
      hintRows: JSON.stringify(hintRows),
      hintCols: JSON.stringify(hintCols),
      id: puzzleId,
      colorData: JSON.stringify(data),
	  colorPalette: JSON.stringify(colors),
      status: "pending",
      imageUrl: imgbbLink,
      coverUrl: "",
      createdAt: new Date().toISOString()
    });

    // ✅ Thông báo thành công
    alert("Đã gửi Nonogram lên duyệt thành công!");
  } catch (err) {
    console.error("Lỗi submit chi tiết:", err);
    alert("Gửi Nonogram thất bại do lỗi client.");
  }
}

async function uploadToImgBB(dataUrl, apiKey) {
  const formData = new FormData();
  formData.append('image', dataUrl.split(',')[1]);

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData
  });

  const result = await response.json();
  if (result.success) {
    console.log('Ảnh upload thành công:', result.data.url);
    return result.data.url;
  } else {
    console.error('Lỗi upload ImgBB:', result);
    throw new Error('Upload ảnh lên ImgBB thất bại');
  }
}

async function checkAndMigrateApproved() {
  const pendingSnapshot = await window.db.collection('pendingNonograms').get();
  for (const doc of pendingSnapshot.docs) {
    const data = doc.data();
    if (data.status === 'approved') {
      console.log(`Tự động move puzzle ${doc.id} sang approvedNonograms`);

      await window.db.collection('approvedNonograms').doc(doc.id).set({
        ...data,
        approvedAt: new Date().toISOString()
      });
      await window.db.collection('pendingNonograms').doc(doc.id).delete();
    }
  }
}

async function renderAlbum() {
  const albumDiv = document.getElementById('albumDiv');
  albumDiv.innerHTML = '';
  const username = localStorage.getItem("username");

  try {
    await checkAndMigrateApproved();
    const approvedSnapshot = await window.db.collection('approvedNonograms').get();
    const solvedSnapshot = username
      ? await window.db.collection('nonogramSolved')
          .where('solved', '==', true)
          .get()
      : { docs: [] };

    const solvedMap = {};
    solvedSnapshot.docs.forEach(doc => {
      const id = doc.id.split('-')[1];
      solvedMap[id] = doc.data().coverUrl;
    });

    const approvedPuzzles = [];

    approvedSnapshot.forEach(doc => {
      const puzzleData = doc.data();
      try {
        puzzleData.solution = typeof puzzleData.solution === 'string' ? JSON.parse(puzzleData.solution) : [];
        puzzleData.hintRows = typeof puzzleData.hintRows === 'string' ? JSON.parse(puzzleData.hintRows) : [];
        puzzleData.hintCols = typeof puzzleData.hintCols === 'string' ? JSON.parse(puzzleData.hintCols) : [];
        puzzleData.colorData = typeof puzzleData.colorData === 'string' ? JSON.parse(puzzleData.colorData) : [];
        approvedPuzzles.push(puzzleData);
      } catch (err) {
        console.warn('Lỗi parse puzzle:', doc.id, err);
      }
    });

    if (approvedPuzzles.length === 0) {
      albumDiv.innerHTML = '<p>Chưa có Nonogram nào được duyệt.</p>';
      return;
    }

    approvedPuzzles.forEach(puzzle => {
      const isSolved = solvedMap[puzzle.id];
      const finalCover = isSolved || puzzle.coverUrl || '../img/coming (7).webp';
      const card = document.createElement('div');
      card.className = 'card';
	  card.innerHTML = `
	    <img src="${finalCover}" alt="cover" class="preview-img" />
	    <p>${puzzle.title || 'Không có tiêu đề'}</p>
	    <a href="#" onclick="startGame('${puzzle.id}', ${isSolved ? 'true' : 'false'})">
		  ${isSolved ? 'Xem' : 'Chơi'}
	    </a>
	  `;
      albumDiv.appendChild(card);
    });
  } catch (error) {
    console.error('Lỗi khi tải Nonogram:', error);
    albumDiv.innerHTML = '<p>Đã xảy ra lỗi khi tải danh sách Nonogram.</p>';
  }
}

async function startGame(id, viewOnly = false) {
  const username = localStorage.getItem("username");
  let puzzle = puzzles.find(p => p.id === id);
  if (!puzzle) {
    const snapshot = await window.db.collection("approvedNonograms").doc(id).get();
    if (!snapshot.exists) {
      alert("Không tìm thấy bảng!");
      return;
    }
    const data = snapshot.data();
    puzzle = {
      ...data,
      solution: JSON.parse(data.solution),
      hintRows: JSON.parse(data.hintRows),
      hintCols: JSON.parse(data.hintCols),
      colorData: JSON.parse(data.colorData),
    };
    if (data.colorPalette) {
      try {
        window.colors = JSON.parse(data.colorPalette);
      } catch (e) {
        console.warn("Lỗi parse colorPalette:", e);
      }
    }
  }

  const solution = puzzle.solution;
  const rowHints = puzzle.hintRows;
  const colHints = puzzle.hintCols;
  const colorData = puzzle.colorData;
  const colors = window.colors || ['#ffffff', '#000000', '#008000', '#0000ff', '#ffff00', '#800080', '#ffa600'];
  let currentMark = 'o';
  let errorCount = 0;
  let errorMarked = Array(solution.length).fill().map(() => Array(solution[0].length).fill(false));
  const maxErrors = 5;
  let solved = false;
  let isMouseDown = false;

  const playerBoard = Array(solution.length).fill().map(() => Array(solution[0].length).fill(null));
  let alreadyGuessed = false;

  if (viewOnly) {
    for (let r = 0; r < solution.length; r++) {
      for (let c = 0; c < solution[0].length; c++) {
        playerBoard[r][c] = solution[r][c] === 1 ? 'o' : 'x';
      }
    }
    if (username && puzzle.id) {
      const doc = await window.db.collection("nonogramSolved").doc(`${username}-${puzzle.id}`).get();
      if (doc.exists) alreadyGuessed = doc.data().guessedCreator || false;
    }
  }

  const playArea = document.getElementById('playArea');
  playArea.innerHTML = '';

  const resultDiv = document.createElement('div');
  resultDiv.className = 'puzzle-result';
  const guessWrapper = document.createElement('div');
  guessWrapper.className = 'guess-wrapper';

  const toggleDiv = document.createElement('div');
  if (!viewOnly) {
    toggleDiv.style.marginBottom = '12px';
    toggleDiv.innerHTML = `
      <span>Đánh dấu: </span>
      <button id="markO" class="tab-mark selected">O</button>
      <button id="markX" class="tab-mark">×</button>
    `;
    const btnX = toggleDiv.querySelector('#markX');
    const btnO = toggleDiv.querySelector('#markO');
    btnX.onclick = () => {
      currentMark = 'x';
      btnX.classList.add('selected');
      btnO.classList.remove('selected');
    };
    btnO.onclick = () => {
      currentMark = 'o';
      btnO.classList.add('selected');
      btnX.classList.remove('selected');
    };
    playArea.appendChild(toggleDiv);
  }

  const table = document.createElement('table');
  table.className = 'nonogram-table';

  function checkCompletion() {
    for (let r = 0; r < solution.length; r++) {
      for (let c = 0; c < solution[0].length; c++) {
        if (solution[r][c] === 1 && playerBoard[r][c] !== 'o') return false;
      }
    }
    return errorCount < maxErrors;
  }

  async function handleSolved() {
    if (solved) return;
    solved = true;
    resultDiv.innerHTML = '';
    guessWrapper.innerHTML = '';

    for (let r = 0; r < solution.length; r++) {
      for (let c = 0; c < solution[0].length; c++) {
        if (solution[r][c] === 0 && playerBoard[r][c] === null) {
          playerBoard[r][c] = 'x';
        }
      }
    }
    updateTable();

    const coverUrl = generatePreviewImageFromBoard();
    await window.db.collection('nonogramSolved').doc(`${username}-${puzzle.id}`).set({
      solved: true,
      timestamp: new Date().toISOString(),
      coverUrl
    }, { merge: true });

    if (username && !viewOnly) {
      await window.db.collection('userScores').doc(`${username}-nonogram`).set({
        username,
        game: 'nonogram',
        score: firebase.firestore.FieldValue.increment(10),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }

    if (puzzle.message) {
      const msg = document.createElement('p');
      msg.innerHTML = `<b>${puzzle.message}</b>`;
      resultDiv.appendChild(msg);
    }

    const doc = await window.db.collection("nonogramSolved").doc(`${username}-${puzzle.id}`).get();
    alreadyGuessed = doc.exists && doc.data().guessedCreator;

    if (puzzle.creator && !alreadyGuessed) {
      const label = document.createElement('p');
      label.textContent = 'Đoán tên người gửi lời nhắn:';
      const input = document.createElement('input');
      input.placeholder = 'Nhập tên người tạo';
      const button = document.createElement('button');
      button.textContent = 'Gửi';
      button.onclick = async () => {
        const guess = input.value.trim().toLowerCase();
        const actual = puzzle.creator.trim().toLowerCase();
        if (guess === actual) {
          alert('✅ Đoán đúng! +5 điểm');
          await window.db.collection('userScores').doc(`${username}-nonogram`).set({
            username,
            game: 'nonogram',
            score: firebase.firestore.FieldValue.increment(5),
            updatedAt: new Date().toISOString()
          }, { merge: true });
          await window.db.collection('nonogramSolved').doc(`${username}-${puzzle.id}`).set({
            guessedCreator: true
          }, { merge: true });
          startGame(puzzle.id, true);
        } else {
          alert('❌ Sai rồi, thử lại nha!');
        }
      };
      guessWrapper.append(label, input, button);
    }
    playArea.append(resultDiv, guessWrapper);
  }

  function generatePreviewImageFromBoard() {
    const cellSize = 12;
    const canvas = document.createElement('canvas');
    canvas.width = solution[0].length * cellSize;
    canvas.height = solution.length * cellSize;
    const ctx = canvas.getContext('2d');
    for (let r = 0; r < solution.length; r++) {
      for (let c = 0; c < solution[0].length; c++) {
        ctx.fillStyle = playerBoard[r][c] === 'o' ? (colors[colorData[r][c]] || '#000') : '#fff';
        ctx.fillRect(c * cellSize, r * cellSize, cellSize, cellSize);
        ctx.strokeStyle = '#000';
        ctx.strokeRect(c * cellSize, r * cellSize, cellSize, cellSize);
      }
    }
    return canvas.toDataURL('image/png');
  }

  function updateTable() {
    table.innerHTML = '';
    for (let r = -1; r < solution.length; r++) {
      const tr = document.createElement('tr');
      for (let c = -1; c < solution[0].length; c++) {
        const td = document.createElement('td');
        td.style.width = '32px';
        td.style.height = '32px';
        td.style.textAlign = 'center';
        td.style.fontSize = '12px';
        td.style.border = '1px solid #ccc';
        if (r === -1 && c === -1) td.style.background = '#f0f0f0';
        else if (r === -1) td.innerHTML = (colHints[c] || []).join('<br>');
        else if (c === -1) td.innerHTML = (rowHints[r] || []).join(' ');
        else {
          const mark = playerBoard[r][c];
          const filled = solution[r][c] === 1;
          const color = colors[colorData[r][c]];
          if (mark === 'x') {
            if (filled && !viewOnly && !errorMarked[r][c]) {
              errorCount++;
              errorMarked[r][c] = true;
              if (errorCount >= maxErrors) return startGame(puzzle.id, false);
            }
            td.textContent = '×';
            td.style.opacity = 0.2;
          } else if (mark === 'o') {
            if (filled) {
              td.style.background = color;
              td.classList.add('solution-cell');
            } else if (!viewOnly && !errorMarked[r][c]) {
              errorCount++;
              errorMarked[r][c] = true;
              if (errorCount >= maxErrors) return startGame(puzzle.id, false);
              td.textContent = '×';
              td.classList.add('cell-error-x');
            }
          }
          if (!viewOnly && !solved) {
            td.addEventListener('mousedown', (e) => {
              isMouseDown = true;
              playerBoard[r][c] = currentMark;
              updateTable();
              if (!solved && checkCompletion()) handleSolved();
              e.preventDefault();
            });
            td.addEventListener('mouseover', (e) => {
              if (isMouseDown) {
                playerBoard[r][c] = currentMark;
                updateTable();
                if (!solved && checkCompletion()) handleSolved();
                e.preventDefault();
              }
            });
            td.addEventListener('mouseup', () => isMouseDown = false);
            td.addEventListener('click', () => {
              playerBoard[r][c] = currentMark;
              updateTable();
              if (!solved && checkCompletion()) handleSolved();
            });
          }
        }
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
  }

  document.querySelectorAll('section').forEach(sec => sec.style.display = 'none');
  document.getElementById('play').style.display = 'block';

  let showCreator = viewOnly;
  if (username && puzzle.id) {
    const doc = await window.db.collection("nonogramSolved").doc(`${username}-${puzzle.id}`).get();
    if (doc.exists && doc.data().guessedCreator) showCreator = true;
  }
  const solvedDoc = await window.db.collection("nonogramSolved").doc(`${username}-${puzzle.id}`).get();
  const guessed = solvedDoc.exists && solvedDoc.data().guessedCreator;
  document.getElementById('playTitle').innerText = `${puzzle.title}${(guessed ? ` — ${puzzle.creator}` : '')}`;

  playArea.append(table, resultDiv, guessWrapper);
  updateTable();
  if (viewOnly && checkCompletion()) handleSolved();
}

async function checkAndFixFirestoreData() {
  const snapshot = await window.db.collection('approvedNonograms').get();
  snapshot.forEach(async (doc) => {
    const data = doc.data();
    const fields = ['solution', 'hintRows', 'hintCols', 'colorData'];
    let needsUpdate = false;
    const updates = {};
    fields.forEach(field => {
      if (!data[field] || typeof data[field] !== 'string') {
        updates[field] = JSON.stringify([]);
        needsUpdate = true;
      } else {
        try {
          const parsed = JSON.parse(data[field]);
          if (!Array.isArray(parsed)) {
            updates[field] = JSON.stringify([]);
            needsUpdate = true;
          }
        } catch (e) {
          console.warn(`Dữ liệu không hợp lệ trong ${field} của ${doc.id}:`, e);
          updates[field] = JSON.stringify([]);
          needsUpdate = true;
        }
      }
    });
    if (needsUpdate) {
      await window.db.collection('approvedNonograms').doc(doc.id).update(updates);
      console.log(`Đã sửa dữ liệu cho ${doc.id}`);
    }
  });
}

checkAndFixFirestoreData();


function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

document.addEventListener('DOMContentLoaded', () => {
  showSection('album');
});
