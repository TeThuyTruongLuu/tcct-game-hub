import * as storage from './storage.js';
import { removeVietnameseTones } from './storage.js';

import { db } from './firebase.js';
import { collection, getDocs, query, where, doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const norm = s => removeVietnameseTones(String(s||"")).toLowerCase();
const escRe = s => String(s||"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&");

const dbName = "StoryDB";
let idb;

export async function toggleSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(section).classList.add('active');
    document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + section).classList.add('active');
    document.querySelectorAll('.table-section').forEach(t => t.classList.add('hidden'));
    if (section !== 'epub') {
        document.getElementById('saved-stories').classList.remove('hidden');
    }
}

export async function populateSelectOptions() {
    let authors = new Set();
    let editors = new Set();
    let querySnapshot = await getDocs(collection(db, "stories"));
    querySnapshot.forEach(doc => {
        let story = doc.data();
        if (story.author) authors.add(story.author);
        if (story.editor) {
            if (Array.isArray(story.editor)) {
                story.editor.forEach(editor => editors.add(editor));
            } else {
                editors.add(story.editor);
            }
        }
    });
    let authorSelect = document.getElementById("authorSelect");
    let editorSelect = document.getElementById("editorSelect");
    authorSelect.innerHTML = '<option value="">Tất cả</option>';
    editorSelect.innerHTML = '<option value="">Tất cả</option>';
    authors.forEach(author => {
        authorSelect.innerHTML += `<option value="${author}">${author}</option>`;
    });
    editors.forEach(editor => {
        editorSelect.innerHTML += `<option value="${editor}">${editor}</option>`;
    });
}

export async function sortTable(columnIndex) {
    let table = document.getElementById("storyTable");
    let rows = Array.from(table.rows);
    let isAscending = table.dataset.sortOrder !== "asc";
    table.dataset.sortOrder = isAscending ? "asc" : "desc";
    rows.sort((a, b) => {
        let aValue = a.cells[columnIndex].innerText;
        let bValue = b.cells[columnIndex].innerText;
        if (columnIndex === 0) {
            aValue = parseInt(aValue) || 0;
            bValue = parseInt(bValue) || 0;
        }
        if (aValue < bValue) return isAscending ? -1 : 1;
        if (aValue > bValue) return isAscending ? 1 : -1;
        return 0;
    });
    table.innerHTML = "";
    rows.forEach(row => table.appendChild(row));
}

export async function displayStoryDetails(story) {
    let allTags = [story.defaultTag];
    if (story.userTags && typeof story.userTags === "object") {
        Object.values(story.userTags).forEach(tagList => {
            tagList.forEach(tag => allTags.push(tag));
        });
    }
    document.getElementById("additionalTags").value = allTags.join(", ");
}

export async function renderStories(stories, tableId, page = 1) {
    if (tableId !== "storyTable") return;
    const perPage = 25;
    const start = (page - 1) * perPage;
    const end = start + perPage;
    const paginatedStories = stories.slice(start, end);
    let storyTable = document.getElementById(tableId);
    storyTable.innerHTML = "";
    paginatedStories.forEach((story, index) => {
        let allTags = story.defaultTag || "Không có tag";
        if (story.userTags && typeof story.userTags === "object") {
            let userTagList = Object.entries(story.userTags).flatMap(([_, tags]) => tags).join(", ");
            if (userTagList) {
                allTags += `, ${userTagList}`;
            }
        }
        let editorDisplay = Array.isArray(story.editor) ? story.editor.join(", ") : story.editor || "";
        let row = `
            <tr>
                <td>${start + index + 1}</td>
                <td>${story.title || ""}</td>
                <td>${story.cnTitle || ""}</td>
                <td>${allTags}</td>
                <td>${story.author || ""}</td>
                <td>${editorDisplay}</td>
                <td>${story.status || ""}</td>
                <td><a href="${story.url}" target="_blank">Xem</a></td>
                <td>${story.originalLink ? `<a href="${story.originalLink}" target="_blank">Gốc</a>` : ""}</td>
                <td class="delete-btn" onclick="deleteStory('${story.url}', '${story.id || ""}', 'stories', 'storyTable')">🗑</td>
            </tr>
        `;
        storyTable.innerHTML += row;
    });
    renderPagination(stories.length, page, perPage);
}

function renderPagination(total, currentPage, perPage) {
  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";
  const totalPages = Math.ceil(total / perPage);
  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.onclick = () => {
      renderStories(window.currentStories, "storyTable", i);
    };
    pagination.appendChild(btn);
  }
}


export async function suggestTags(event) {
    let input = event.target;
    let inputValue = input.value.trim().toLowerCase();
    let suggestionsBox = document.getElementById("tagSuggestions");
    if (!inputValue) {
        suggestionsBox.style.display = "none";
        return;
    }
    let filteredTags = window.allTags.filter(tag => {
        let words = tag.toLowerCase().split(" ");
        return words.some(word => word.startsWith(inputValue));
    });
    if (filteredTags.length === 0) {
        suggestionsBox.style.display = "none";
        return;
    }
    suggestionsBox.innerHTML = "";
    filteredTags.forEach(tag => {
        let suggestion = document.createElement("div");
        suggestion.textContent = tag;
        suggestion.classList.add("suggestion-item");
        suggestion.onclick = () => selectTag(tag);
        suggestionsBox.appendChild(suggestion);
    });
    suggestionsBox.style.display = "block";
}

export async function selectTag(tag) {
    let inputField = document.getElementById("additionalTags");
    let existingTags = inputField.value.split(",").map(t => t.trim());
    if (!existingTags.includes(tag)) {
        existingTags.push(tag);
    }
    inputField.value = existingTags.join(", ");
    document.getElementById("tagSuggestions").style.display = "none";
}

export async function filterStories() {
    let desiredTags = document.getElementById("desiredTags").value.split(",").map(t => t.trim()).filter(t => t);
    let excludedTags = document.getElementById("excludedTags").value.split(",").map(t => t.trim()).filter(t => t);
    let author = document.getElementById("authorSelect").value;
    let editor = document.getElementById("editorSelect").value;
    let status = document.getElementById("statusSelect").value;

    let searchRaw = document.getElementById("searchText").value.trim();
    let searchRe = searchRaw ? new RegExp(escRe(searchRaw), "i") : null;

    let q = query(collection(db, "stories"));
    let stories = [];
    let querySnapshot = await getDocs(q);

    querySnapshot.forEach(docSnap => {
        let story = docSnap.data();
        story.id = docSnap.id;

        let tagList = [story.defaultTag, ...(story.userTags ? Object.values(story.userTags).flat() : [])].filter(Boolean);

        let include = true;

        if (searchRe) {
            let hay = `${story.title || ""} ${story.cnTitle || ""} ${story.url || ""} ${story.originalLink || ""}`;
            if (!searchRe.test(hay)) include = false;
        }

        if (desiredTags.length > 0) {
            let ok = desiredTags.every(qt => tagList.some(t => norm(t).includes(norm(qt))));
            if (!ok) include = false;
        }

        if (excludedTags.length > 0) {
            let bad = excludedTags.some(qt => tagList.some(t => norm(t).includes(norm(qt))));
            if (bad) include = false;
        }

        if (author && story.author !== author) include = false;

        if (editor) {
            let edOk = Array.isArray(story.editor) ? story.editor.includes(editor) : story.editor === editor;
            if (!edOk) include = false;
        }

        if (status && story.status !== status) include = false;

        if (include) stories.push(story);
    });

    renderStories(stories, "storyTable");
}


export async function randomStory() {
    let querySnapshot = await getDocs(collection(db, "stories"));
    let stories = [];
    querySnapshot.forEach(doc => {
        let story = doc.data();
        story.id = doc.id;
        stories.push(story);
    });
    if (stories.length > 0) {
        let randomIndex = Math.floor(Math.random() * stories.length);
        renderStories([stories[randomIndex]], "storyTable");
    }
}

window.checkPassword = function () {
    const input = document.getElementById("epubPassword").value.trim();
    const correct = "Not-for-profit-All Rights-reserved";
    const container = document.getElementById("epubLinkContainer");
    if (input === correct) {
        container.style.display = "block";
    } else {
        alert("Sai mật khẩu!");
        container.style.display = "none";
    }
};

document.getElementById("additionalTags").addEventListener("input", async function(event) {
    let input = event.target;
    let value = input.value.trim();
    if (value.endsWith(",")) {
        let tag = value.slice(0, -1).trim();
        if (!tag) return;
        let storyURL = document.getElementById("storyLink").value.trim();
        if (!storyURL) {
            alert("Bạn cần nhập link truyện trước khi thêm tag.");
            return;
        }
        let querySnapshot = await getDocs(query(collection(db, "stories"), where("url", "==", storyURL)));
        if (querySnapshot.empty) {
            alert("Truyện này chưa được lưu, không thể thêm tag.");
            return;
        }
        let storyDoc = querySnapshot.docs[0];
        let storyId = storyDoc.id;
        let username = localStorage.getItem("username") || "Guest";
        let storyRef = doc(db, "stories", storyId);
        let storyData = storyDoc.data();
        if (!storyData) return;
        let existingTags = storyData.userTags || {};
        existingTags[username] = existingTags[username] ? [...new Set([...existingTags[username], tag])] : [tag];
        await setDoc(storyRef, { userTags: existingTags }, { merge: true });
    }
});

document.getElementById("additionalTags").addEventListener("input", suggestTags);

document.getElementById("resetFilter").addEventListener("click", async () => {
    await storage.loadStories();
});

document.addEventListener("click", function(event) {
    if (!event.target.closest("#additionalTags") && !event.target.closest("#tagSuggestions")) {
        document.getElementById("tagSuggestions").style.display = "none";
    }
});

document.addEventListener("DOMContentLoaded", async () => {
    await storage.loadStories();
    await storage.loadAllTags();
    await populateSelectOptions();
    document.getElementById("saveStory").addEventListener("click", async () => {
        await fetchStory();
    });
    document.getElementById("batchFetch").addEventListener("click", async () => {
        await storage.batchFetchStories();
    });
});

window.toggleSection = toggleSection;
window.renderStories = renderStories;
window.suggestTags = suggestTags;
window.filterStories = filterStories;
window.randomStory = randomStory;