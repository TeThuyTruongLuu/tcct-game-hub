let data = [], sizeR = 10, sizeC = 10, selectedColor = 1;
const colors = ['#ffffff', '#000000', '#008000', '#0000ff', '#ffff00', '#800080', '#ffa600'];
let isMouseDown = false;

const puzzles = [];

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
  const cellSize = 24;
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
  const name = document.getElementById('creatorName').value.trim();
  const msg = document.getElementById('creatorMessage').value.trim();
  const norm = data.map(row => row.map(val => val === 0 ? 0 : 1));
  const hintRows = norm.map(getHints);
  const hintCols = Array(sizeC).fill().map((_, i) => getHints(norm.map(row => row[i])));
  const previewImageData = generatePreviewImage();
  const puzzleId = 'puzzle_' + Date.now();
  const puzzle = {
    id: puzzleId,
    title: 'Tác phẩm chưa đặt tên',
    createdBy: name || 'anon',
    message: msg,
    solution: JSON.stringify(norm),
    hintRows: JSON.stringify(hintRows),
    hintCols: JSON.stringify(hintCols),
    imageUrl: '',
    coverUrl: '',
    colorData: JSON.stringify(data),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  try {
    await window.db.collection('pendingNonograms').doc(puzzleId).set(puzzle);

    const webhookUrl = "https://discord.com/api/webhooks/1377505100230168636/_-CJu-aTffIyNvaOsqXcI7qfxq1VD-L1NIKnP0fM0GITxPeU-QgyhhCKapfIaj_F-7Lj";
    const payload = {
      content: `**Nonogram mới cần duyệt**\n**Tên:** ${puzzle.title}\n**Người tạo:** ${puzzle.createdBy}\n**ID:** ${puzzle.id}\n*React ✅ để duyệt, ❌ để từ chối.*`,
      embeds: [
        {
          title: "Dữ liệu Nonogram",
          description: `**Lời nhắn:** ${puzzle.message}\n**Hint hàng:** ${hintRows.map(h => h.join(' ')).join(' | ')}\n**Hint cột:** ${hintCols.map(h => h.join(' ')).join(' | ')}`,
          fields: [
            { name: "ID", value: puzzle.id, inline: true }
          ],
          color: 15258703
        }
      ]
    };

    const dataUrlToBlob = async (dataUrl) => {
      const response = await fetch(dataUrl);
      return await response.blob();
    };
    const imageBlob = await dataUrlToBlob(previewImageData);
    const formData = new FormData();
    formData.append('file', imageBlob, `nonogram_${puzzleId}.png`);
    formData.append('payload_json', JSON.stringify(payload));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      console.log('Webhook sent successfully:', await response.json());
      alert('Nonogram đã được gửi để duyệt! Admin sẽ xem xét trên Discord.');
    } else {
      const errorText = await response.text();
      console.error('Discord API Error:', errorText);
      alert('Có lỗi khi gửi thông báo đến Discord: ' + errorText);
    }
  } catch (error) {
    console.error('Lỗi khi gửi Nonogram:', error);
    alert('Đã xảy ra lỗi khi gửi Nonogram để duyệt. Vui lòng thử lại.');
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

  try {
	await checkAndMigrateApproved();
    const approvedSnapshot = await window.db.collection('approvedNonograms').get();
    const approvedPuzzles = [];

    approvedSnapshot.forEach(doc => {
      const puzzleData = doc.data();
      try {
        puzzleData.solution = puzzleData.solution && typeof puzzleData.solution === 'string' ? JSON.parse(puzzleData.solution) : [];
        puzzleData.hintRows = puzzleData.hintRows && typeof puzzleData.hintRows === 'string' ? JSON.parse(puzzleData.hintRows) : [];
        puzzleData.hintCols = puzzleData.hintCols && typeof puzzleData.hintCols === 'string' ? JSON.parse(puzzleData.hintCols) : [];
        puzzleData.colorData = puzzleData.colorData && typeof puzzleData.colorData === 'string' ? JSON.parse(puzzleData.colorData) : [];
        approvedPuzzles.push(puzzleData);
      } catch (parseError) {
        console.warn(`Lỗi parse dữ liệu Nonogram ${doc.id}:`, parseError);
      }
    });

    puzzles.forEach(puzzle => {
      const parsedPuzzle = { ...puzzle };
      try {
        parsedPuzzle.solution = puzzle.solution && typeof puzzle.solution === 'string' ? JSON.parse(puzzle.solution) : [];
        parsedPuzzle.hintRows = puzzle.hintRows && typeof puzzle.hintRows === 'string' ? JSON.parse(puzzle.hintRows) : [];
        parsedPuzzle.hintCols = puzzle.hintCols && typeof puzzle.hintCols === 'string' ? JSON.parse(puzzle.hintCols) : [];
        parsedPuzzle.colorData = puzzle.colorData && typeof puzzle.colorData === 'string' ? JSON.parse(puzzle.colorData) : [];
        approvedPuzzles.push(parsedPuzzle);
      } catch (parseError) {
        console.warn(`Lỗi parse dữ liệu puzzle mẫu ${puzzle.id}:`, parseError);
      }
    });

    if (approvedPuzzles.length === 0) {
      albumDiv.innerHTML = '<p>Chưa có Nonogram nào được duyệt.</p>';
      return;
    }

    approvedPuzzles.forEach(puzzle => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${puzzle.coverUrl || '../img/coming (7).png'}" alt="cover" />
        <p>${puzzle.title || 'Không có tiêu đề'}</p>
        <a href="#" onclick="startGame('${puzzle.id}')">Chơi</a>
      `;
      albumDiv.appendChild(card);
    });
  } catch (error) {
    console.error('Lỗi khi tải Nonogram:', error);
    albumDiv.innerHTML = '<p>Đã xảy ra lỗi khi tải danh sách Nonogram.</p>';
  }
}

function startGame(id) {
  const puzzle = puzzles.find(p => p.id === id) || (async () => {
    const snapshot = await window.db.collection('approvedNonograms').doc(id).get();
    if (!snapshot.exists) return null;
    const data = snapshot.data();
    data.solution = JSON.parse(data.solution);
    data.hintRows = JSON.parse(data.hintRows);
    data.hintCols = JSON.parse(data.hintCols);
    data.colorData = JSON.parse(data.colorData);
    return data;
  })();

  if (!puzzle) return alert("Không tìm thấy bảng!");

  Promise.resolve(puzzle).then(p => {
    const solution = p.solution;
    const rowHints = p.hintRows;
    const colHints = p.hintCols;
    const colorData = p.colorData;
    let currentMark = 'x';
    let playerBoard = Array(solution.length).fill().map(() => Array(solution[0].length).fill(null));

    const table = document.createElement('table');
    table.className = 'nonogram-table';

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

          if (r === -1 && c === -1) {
            td.style.background = '#f0f0f0';
          } else if (r === -1 && c >= 0) {
            td.innerHTML = (colHints[c] || []).join('<br>');
            td.classList.add('hint-cell');
          } else if (r >= 0 && c === -1) {
            td.textContent = (rowHints[r] || []).join(' ');
            td.classList.add('hint-cell');
          } else {
            const val = playerBoard[r][c];

            if (val === 'x') {
              if (solution[r][c] === 1) {
                td.classList.add('cell-error-o');
                td.style.background = colors[colorData[r][c]];
              } else {
                td.textContent = '×';
                td.style.opacity = 0.2;
              }
            } else if (val === 'o') {
              if (solution[r][c] === 1) {
                td.classList.add('solution-cell');
                td.style.background = colors[colorData[r][c]];
              } else {
                td.textContent = '×';
                td.classList.add('cell-error-x');
              }
            }

            if (val === null) {
              td.addEventListener('mousedown', (e) => {
                isMouseDown = true;
                playerBoard[r][c] = currentMark;
                updateTable();
                e.preventDefault();
              });
              td.addEventListener('mouseover', () => {
                if (isMouseDown) {
                  playerBoard[r][c] = currentMark;
                  updateTable();
                }
              });
              td.addEventListener('click', () => {
                playerBoard[r][c] = currentMark;
                updateTable();
              });
            }
          }

          tr.appendChild(td);
        }
        table.appendChild(tr);
      }
    }

    const toggleDiv = document.createElement('div');
    toggleDiv.style.marginBottom = '12px';
    toggleDiv.innerHTML = `
      <span>Đánh dấu: </span>
      <button id="markX" class="tab-mark selected">×</button>
      <button id="markO" class="tab-mark">O</button>
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
	
    const playArea = document.getElementById('playArea');
    playArea.innerHTML = '';
    playArea.appendChild(toggleDiv);
    playArea.appendChild(table);

    updateTable();
    window.addEventListener('mouseup', () => { isMouseDown = false; });

    document.querySelectorAll('section').forEach(sec => sec.style.display = 'none');
    document.getElementById('play').style.display = 'block';
    document.getElementById('playTitle').innerText = p.title;
  });
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