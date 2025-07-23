const firebaseConfig = {
  apiKey: "AIzaSyB8VV4gk1Hl7u8dtNWevdj1lvqZEuDAfrc",
  authDomain: "tcct-storage.firebaseapp.com",
  projectId: "tcct-storage",
  storageBucket: "tcct-storage.appspot.com",
  messagingSenderId: "480838528645",
  appId: "1:480838528645:web:d13d12ba5ab0aedaf183ec"
};

firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const db = firebase.firestore();

document.getElementById("toggleUpload").onclick = () => {
  document.getElementById("uploadSection").classList.remove("hidden");
  document.getElementById("albumSection").classList.add("hidden");
};

document.getElementById("toggleAlbum").onclick = () => {
  document.getElementById("uploadSection").classList.add("hidden");
  document.getElementById("albumSection").classList.remove("hidden");
  loadBook();
};

const form = document.getElementById("uploadForm");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
	const file = document.getElementById("photo").files[0];
	const title = document.getElementById("title").value;
	const artist = document.getElementById("artist").value;
	const source = document.getElementById("source").value;
	const category = document.getElementById("category").value;
	const tags = document.getElementById("tags").value.split(",").map(t => t.trim());
	const otherTags = document.getElementById("otherTags").value.split(",").map(t => t.trim());
	const id = Date.now().toString();
	const storageRef = storage.ref(`photos/originals/${id}_${file.name}`);

  try {
    const snapshot = await storageRef.put(file);
    const url = await snapshot.ref.getDownloadURL();
	await db.collection("photos_metadata").doc(id).set({
	  Caption: title,
	  Artist: artist,
	  Source: source,
	  Category: category,
	  Tags: tags,
	  "Other tags": otherTags,
	  "URL backup": url,
	  created_at: firebase.firestore.FieldValue.serverTimestamp()
	});
    document.getElementById("status").innerText = "✅ Upload thành công!";
    form.reset();
  } catch (err) {
    console.error(err);
    document.getElementById("status").innerText = "❌ Upload thất bại.";
  }
});

let currentPage = 0;
let photoList = [];

function updateBook() {
  const data = photoList[currentPage];
  document.getElementById("leftPage").innerHTML = `<img src="${data.img}" alt="Ảnh">`;
  document.getElementById("rightPage").innerHTML = `<div>${data.info}</div>`;
  document.getElementById("book").classList.add("opened");
}

function nextPage() {
  if (currentPage < photoList.length - 1) {
    currentPage++;
    updateBook();
  }
}

function prevPage() {
  if (currentPage > 0) {
    currentPage--;
    updateBook();
  }
}

async function loadBook() {
  currentPage = 0;
  photoList = [];

  try {
    const snapshot = await db.collection("photos_metadata")
      .orderBy("created_at", "desc")
      .limit(50)
      .get();

    snapshot.forEach(doc => {
      const data = doc.data();
      photoList.push({
        img: data["URL backup"],
        info: `
          <strong>${data.Caption || "(Không có caption)"}</strong><br>
          👤 <em>${data.Artist || "Không rõ tác giả"}</em><br>
          🏷️ Nhân vật: ${data.Tags?.join(", ") || "?"}<br>
          📂 Category: ${data.Category || "-" }<br>
          🔖 Other tags: ${data["Other tags"]?.join(", ") || "-" }<br>
          🌐 <a href="${data.Source}" target="_blank">Link gốc</a>
        `
      });
    });

    if (photoList.length > 0) {
      updateBook();
    } else {
      document.getElementById("leftPage").innerHTML = "";
      document.getElementById("rightPage").innerHTML = "<p>Chưa có ảnh nào.</p>";
    }
  } catch (err) {
    console.error("Lỗi khi load ảnh:", err);
  }
}
