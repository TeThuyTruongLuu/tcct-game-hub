const firebaseConfig = {
	apiKey: "AIzaSyB8VV4gk1Hl7u8dtNWevdj1lvqZEuDAfrc",
	authDomain: "tcct-storage.firebaseapp.com",
	projectId: "tcct-storage",
	storageBucket: "tcct-storage.firebasestorage.app",
	messagingSenderId: "480838528645",
	appId: "1:480838528645:web:d13d12ba5ab0aedaf183ec",
	measurementId: "G-HQ7F9XXP5W"
};

firebase.initializeApp(firebaseConfig);
const storage = firebase.storage();
const db = firebase.firestore();

let currentPage = 0;
let photoList = [];
let allTags = [];
let allArtists = [];

const albumBtn = document.getElementById("toggleAlbum");
const uploadBtn = document.getElementById("toggleUpload");

albumBtn.onclick = () => {
    albumBtn.classList.add("active");
    uploadBtn.classList.remove("active");
    document.getElementById("albumSection").classList.remove("hidden");
    document.getElementById("filterSection").classList.remove("hidden");
    document.getElementById("uploadSection").classList.add("hidden");
    loadBook();
};

uploadBtn.onclick = () => {
    uploadBtn.classList.add("active");
    albumBtn.classList.remove("active");
    document.getElementById("uploadSection").classList.remove("hidden");
    document.getElementById("albumSection").classList.add("hidden");
    document.getElementById("filterSection").classList.add("hidden");
};

function filterPhotos() {
    const characterSearch = document.getElementById("characterInput").value.trim().toLowerCase();
    const artistSearch = document.getElementById("artistInput").value.trim().toLowerCase();
    const selectedCategories = Array.from(document.querySelectorAll(".filter-category:checked")).map(cb => cb.value.toLowerCase());
    const selectedTags = Array.from(document.querySelectorAll(".filter-tag:checked")).map(cb => cb.value.toLowerCase());

    const filtered = photoList.filter(photo => {
        // Chuẩn hóa dữ liệu
        const photoTags = Array.isArray(photo.tags) ? photo.tags.map(t => t.toLowerCase()) : [];
        const photoOtherTags = Array.isArray(photo.otherTags) ? photo.otherTags.map(t => t.toLowerCase()) : [];
        const photoCategories = Array.isArray(photo.category) ? photo.category.map(c => c.toLowerCase()) : [photo.category.toLowerCase()];
        const photoArtist = (photo.artist || "").toLowerCase();

        // Kiểm tra từng điều kiện
        const characterMatch = !characterSearch || photoTags.includes(characterSearch);
        const artistMatch = !artistSearch || photoArtist.includes(artistSearch);
        const categoryMatch = selectedCategories.length === 0 || selectedCategories.some(cat => photoCategories.includes(cat));
        const tagMatch = selectedTags.length === 0 || selectedTags.every(tag => photoOtherTags.includes(tag));

        return characterMatch && artistMatch && categoryMatch && tagMatch;
    });

    if (filtered.length > 0) {
        currentPage = 0;
        showFilteredBook(filtered);
    } else {
        document.getElementById("leftPage").innerHTML = "";
        document.getElementById("rightPage").innerHTML = "<p>Không tìm thấy ảnh phù hợp.</p>";
    }
}

function showFilteredBook(list) {
	const data = list[currentPage];
	document.getElementById("leftPage").innerHTML = `<img src="${data.img}" alt="Ảnh">`;
	document.getElementById("rightPage").innerHTML = `<div>${data.info}</div>`;
}

const form = document.getElementById("uploadForm");
form.addEventListener("submit", async (e) => {
	e.preventDefault();
	const file = document.getElementById("photo").files[0];
	const title = document.getElementById("title").value;

	// Tạo file nén WebP
	const webpBlob = await compressImageToWebp(file);

	// Upload ảnh gốc
	const id = Date.now().toString();
	const storageRefOriginal = storage.ref(`photos/originals/${id}_${file.name}`);
	const snapshotOriginal = await storageRefOriginal.put(file);
	const originalURL = await snapshotOriginal.ref.getDownloadURL();

	// Upload ảnh webp
	const storageRefWebp = storage.ref(`photos/previews/${id}.webp`);
	const snapshotWebp = await storageRefWebp.put(webpBlob);
	const previewURL = await snapshotWebp.ref.getDownloadURL();

	const artist = document.getElementById("artist").value;
	const source = document.getElementById("source").value;
	const category = Array.from(document.querySelectorAll('input[name="uploadCategory"]:checked')).map(cb => cb.value);
	const commissionedBy = document.getElementById("commissionedBy").value;
	const tags = document.getElementById("tags").value.split(",").map(t => t.trim());
	const otherTags = document.getElementById("otherTags").value.split(",").map(t => t.trim());
	const storageRef = storage.ref(`photos/originals/${id}_${file.name}`);

	try {
		const snapshot = await storageRef.put(file);
		const url = await snapshot.ref.getDownloadURL();
		await db.collection("photos_metadata").doc(id).set({
			Caption: title,
			Artist: artist,
			Source: source,
			Category: category,
			CommissionedBy: commissionedBy,
			Tags: tags,
			"Other tags": otherTags,
			"URL backup": originalURL,
			"URL preview": previewURL,
			created_at: firebase.firestore.FieldValue.serverTimestamp()
		});
		document.getElementById("status").innerText = "✅ Upload thành công!";
		form.reset();
	} catch (err) {
		console.error(err);
		document.getElementById("status").innerText = "❌ Upload thất bại.";
	}
});

async function fetchSuggestions() {
	const snapshot = await db.collection("photos_metadata").get();
	const tagsSet = new Set();
	const artistSet = new Set();

	snapshot.forEach(doc => {
		const data = doc.data();
		data.Tags?.forEach(tag => tagsSet.add(tag));
		if (data.Artist) artistSet.add(data.Artist);
	});

	allTags = Array.from(tagsSet);
	allArtists = Array.from(artistSet);
}

function setupAutocomplete(inputId, suggestionId, dataList) {
	const input = document.getElementById(inputId);
	const suggestionBox = document.getElementById(suggestionId);

	input.addEventListener("input", () => {
		const val = input.value.toLowerCase();
		suggestionBox.innerHTML = "";

		if (!val) {
			suggestionBox.style.display = "none";
			return;
		}

		const filtered = dataList.filter(item => item.toLowerCase().includes(val));
		filtered.slice(0, 5).forEach(item => {
			const div = document.createElement("div");
			div.textContent = item;
			div.onclick = () => {
				input.value = item;
				suggestionBox.style.display = "none";
			};
			suggestionBox.appendChild(div);
		});

		suggestionBox.style.display = filtered.length ? "block" : "none";
	});
}

window.addEventListener("DOMContentLoaded", async () => {
    await fetchSuggestions();
    setupAutocomplete("characterInput", "characterSuggestions", allTags);
    setupAutocomplete("artistInput", "artistSuggestions", allArtists);
    loadBook();
});

const commissionCheckbox = document.querySelector('input[name="uploadCategory"][value="Commission"]');
const commissionedByInput = document.getElementById("commissionedBy");

commissionCheckbox.addEventListener("change", () => {
    if (commissionCheckbox.checked) {
        commissionedByInput.classList.remove("hidden");
    } else {
        commissionedByInput.classList.add("hidden");
        commissionedByInput.value = ""; // clear nếu bỏ tick
    }
});

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

async function compressImageToWebp(file, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const img = new Image();
            img.src = reader.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/webp', quality);
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}


async function loadBook() {
	currentPage = 0;
	photoList = [];

	try {
		const snapshot = await db.collection("photos_metadata")
			.orderBy("Caption", "asc")
			.get();

		snapshot.forEach(doc => {
			const data = doc.data();
			photoList.push({
				img: data["URL preview"] || data["URL backup"],
				artist: data.Artist || "",
				category: data.Category || "",
				tags: data.Tags || [],
				otherTags: data["Other tags"] || [],
				info: `
					<strong>${data.Caption || "(Không có caption)"}</strong><br>
					<ul>
						<li><b>Artist:</b> ${data.Artist || "Không rõ tác giả"}</li>
						${data.CommissionedBy ? `<li><b>Commissioned by:</b> ${data.CommissionedBy}</li>` : ""}
						<li><b>Nhân vật/Chiến đội:</b> ${data.Tags?.join(", ") || "?"}</li>
						<li><b>Category:</b> ${data.Category?.join(", ") || "-" }</li>
						<li><b>Tags khác:</b> ${data["Other tags"]?.join(", ") || "-" }</li>
						<li><a href="${data.Source}" target="_blank">Link gốc</a></li>
						<li><b>Ảnh gốc:</b> <a href="${data["URL backup"]}" target="_blank">Link</a></li>
					</ul>`
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

document.getElementById("applyFilter").addEventListener("click", () => {
    filterPhotos();
});
