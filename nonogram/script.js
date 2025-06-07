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

    // Giảm kích thước ảnh preview
    function generateSmallPreviewImage() {
      const canvas = document.createElement('canvas');
      const cellSize = 12; // nhỏ hơn
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
    const previewBlob = dataUrlToBlob(previewImageDataUrl);

    // Gửi log lên pendingNonograms
    await window.db.collection('pendingNonograms').doc(puzzleId).set({
      title: "Tác phẩm chưa đặt tên",
      creator: creatorInput.value.trim() || "anon",
      message: messageInput.value.trim() || "",
      solution: JSON.stringify(norm),
      hintRows: JSON.stringify(hintRows),
      hintCols: JSON.stringify(hintCols),
	  id: puzzleId,
      colorData: JSON.stringify(data),
      status: "pending",
      imageUrl: "", // hiện chưa có URL
      coverUrl: "", // để trống giống approved
      createdAt: new Date().toISOString()
    });

    // Gửi message lên Discord
    const payload = {
      content: "**Nonogram mới cần duyệt**\n" +
               `**Tên:** Tác phẩm chưa đặt tên\n` +
               `**Người tạo:** ${creatorInput.value.trim() || "anon"}\n` +
			   `**Lời nhắn:** ${messageInput.value.trim() || ""}\n` +
               `**ID:** ${puzzleId}\n` +
               "*React ✅ để duyệt, ❌ để từ chối.*",
      embeds: [{
        title: "Dữ liệu Nonogram",
        description: `**Hint hàng:** ${hintRows.map(h => h.join(" ")).join(" | ")}\n` +
                     `**Hint cột:** ${hintCols.map(h => h.join(" ")).join(" | ")}`,
        fields: [{
          name: "ID",
          value: puzzleId,
          inline: true
        }],
        color: 0xE9967A,
        image: {
          url: `attachment://${puzzleId}.png`
        }
      }]
    };

    console.log("Payload trước khi gửi:", payload);

    const formData = new FormData();
    formData.append("payload_json", JSON.stringify(payload));
    formData.append("file", previewBlob, `${puzzleId}.png`);

    console.log("FormData sau khi chuẩn bị:");
    for (let pair of formData.entries()) {
      console.log("FormData entry:", pair[0], pair[1]);
    }

    const response = await fetch("https://shimmering-liberation-production.up.railway.app/send-message", {
      method: "POST",
      body: formData
    });

    console.log("Response status:", response.status);
    console.log("Response headers:", [...response.headers.entries()]);

    const resultText = await response.text();
    console.log("Webhook gửi kết quả:", resultText);

    if (response.ok) {
      alert("Đã gửi Nonogram lên duyệt thành công!");
    } else {
      alert("Gửi Nonogram thất bại. Kiểm tra console log để biết chi tiết.");
    }
  } catch (err) {
    console.error("Lỗi submit chi tiết:", err);
    alert("Gửi Nonogram thất bại do lỗi client.");
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