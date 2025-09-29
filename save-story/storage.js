import { db } from './firebase.js';
import * as storage from './main.js';
import { displayStoryDetails } from './main.js';
import { collection, getDocs, query, where, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

const storiesCollection = collection(db, "stories");

let allTags = [];
export let idb;

if (!window.indexedDB && !window.mozIndexedDB && !window.webkitIndexedDB && !window.msIndexedDB) {
  console.error("Trình duyệt không hỗ trợ IndexedDB.");
} else {
  const request = window.indexedDB.open("StoryDB", 3);
  request.onerror = function(event) {
    console.error("Lỗi khi mở IndexedDB:", event.target.error);
  };
  request.onsuccess = function(event) {
    idb = event.target.result;
  };
  request.onupgradeneeded = function(event) {
    idb = event.target.result;
    if (!idb.objectStoreNames.contains("stories")) {
      idb.createObjectStore("stories", { keyPath: "url" });
    }
    if (!idb.objectStoreNames.contains("downloaded_stories")) {
      idb.createObjectStore("downloaded_stories", { keyPath: "url" });
    }
  };
}

export async function waitForIndexedDB() {
    return new Promise((resolve) => {
        if (idb) resolve();
        else {
            const checkInterval = setInterval(() => {
                if (idb) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
        }
    });
}

export function normalizeUrl(u){
	try{
		const x=new URL(u);
		let host=x.hostname.replace(/^www\./,'').toLowerCase();
		let path=x.pathname.replace(/\/+/g,'/').replace(/\/$/,'').replace(/\/page-\d+$/,'');
		let qs=new URLSearchParams(x.search);
		['fbclid','gclid','utm_source','utm_medium','utm_campaign','utm_term','utm_content','spm','ref','lang','page'].forEach(k=>qs.delete(k));
		let q=qs.toString();
		return host+path+(q?('?'+q):'');
	}catch(e){
		return String(u).trim().replace(/^https?:\/\//,'').replace(/^www\./,'').replace(/[#?].*$/,'').replace(/\/+$/,'').toLowerCase();
	}
}

async function urlExists(url){
	const key=normalizeUrl(url);
	let snap1=await getDocs(query(collection(db,"stories"),where("urlKey","==",key)));
	if(!snap1.empty) return true;
	let snap2=await getDocs(query(collection(db,"stories"),where("url","==",url)));
	return !snap2.empty;
}

export async function fetchStory() {
    let inputField = document.getElementById("storyLink");
    let url = inputField.value.trim();
    inputField.value = url;
    if (!url) {
        alert("Vui lòng nhập link truyện!");
        return;
    }

    let cnTitle = document.getElementById("cnTitle").value.trim();
    let originalLink = document.getElementById("originalLink").value.trim();
    let manualForm = document.getElementById("manualForm");
    let saveButton = document.getElementById("saveStory");

    let existingStory = await fetchStoryFromFirestore(url);
    if (await urlExists(url)) {
        alert("Link này đã có trong cơ sở dữ liệu. Dữ liệu hiện có sẽ được điền sẵn để chỉnh sửa.");
        document.getElementById("cnTitle").value = existingStory.cnTitle || "";
        document.getElementById("originalLink").value = existingStory.originalLink || "";
        document.getElementById("manualTitle").value = existingStory.title || "";
        document.getElementById("manualTag").value = existingStory.defaultTag || "";
        document.getElementById("manualAuthor").value = existingStory.author || "";
        document.getElementById("manualEditor").value = Array.isArray(existingStory.editor) ? existingStory.editor.join(", ") : existingStory.editor || "";
        document.getElementById("manualStatus").value = existingStory.status || "";
        displayStoryDetails(existingStory);
        saveButton.textContent = "Cập nhật";
        manualForm.style.display = "block";
        saveButton.disabled = false;

        function checkManualFields() {
            if (
                document.getElementById("manualTitle").value.trim() &&
                document.getElementById("manualTag").value.trim() &&
                document.getElementById("manualAuthor").value.trim() &&
                document.getElementById("manualEditor").value.trim()
            ) {
                saveButton.disabled = false;
            } else {
                saveButton.disabled = true;
            }
        }

        document.getElementById("manualTitle").addEventListener("input", checkManualFields);
        document.getElementById("manualTag").addEventListener("input", checkManualFields);
        document.getElementById("manualAuthor").addEventListener("input", checkManualFields);
        document.getElementById("manualEditor").addEventListener("input", checkManualFields);

		saveButton.onclick = async function() {
		  let newTags = document.getElementById("additionalTags").value
			.split(",")
			.map(t => t.trim())
			.filter(Boolean);

		  let existingTags = existingStory.userTags ? Object.values(existingStory.userTags).flat() : [];

		  const dft = (existingStory.defaultTag || "").toLowerCase();
		  newTags = newTags.filter(t => t.toLowerCase() !== dft);

		  let mergedTags = [...new Set([...existingTags, ...newTags])];

		  let username = localStorage.getItem("username") || "Guest";
		  let updatedUserTags = {
			...existingStory.userTags,
			[username]: mergedTags
		  };

		  let newEditors = document.getElementById("manualEditor").value
			.split(",").map(e => e.trim()).filter(Boolean);
		  let existingEditors = Array.isArray(existingStory.editor)
			? existingStory.editor
			: (existingStory.editor ? [existingStory.editor] : []);
		  let mergedEditors = [...new Set([...existingEditors, ...newEditors])];

		  let updatedStory = {
			title: document.getElementById("manualTitle").value.trim(),
			cnTitle: document.getElementById("cnTitle").value.trim(),
			originalLink: document.getElementById("originalLink").value.trim(),
			defaultTag: existingStory.defaultTag,
			userTags: updatedUserTags,
			author: document.getElementById("manualAuthor").value.trim(),
			editor: mergedEditors,
			status: document.getElementById("manualStatus").value,
			url
		  };

		  displayStoryDetails(updatedStory);
		  await saveStory(updatedStory);
		  alert("Đã cập nhật truyện.");

            document.getElementById("manualTitle").value = "";
            document.getElementById("manualTag").value = "";
            document.getElementById("manualAuthor").value = "";
            document.getElementById("manualEditor").value = "";
            document.getElementById("cnTitle").value = "";
            document.getElementById("originalLink").value = "";
            document.getElementById("additionalTags").value = "";
            manualForm.style.display = "none";
            saveButton.textContent = "Lưu Truyện";
            saveButton.disabled = false;
            saveButton.onclick = fetchStory;
        };
        return;
    }

    let isForumLink = url.includes('toanchuccaothu');
    saveButton.disabled = false;

    if (isForumLink) {
        manualForm.style.display = "none";
        const proxyUrl = "https://api.allorigins.win/raw?url=";
        let fetchUrl = proxyUrl + encodeURIComponent(url);
        try {
            let response = await fetch(fetchUrl);
            let text = await response.text();
            let parser = new DOMParser();
            let docHtml = parser.parseFromString(text, "text/html");
            let titleMatch = docHtml.querySelector("h1")?.innerText.match(/\[(.*?)\]\s*(\[.*?\])?(.*)/);
            let title = titleMatch ? titleMatch[3].trim() : "Không rõ";
            let fullTitle = docHtml.querySelector("h1")?.innerText.trim() || "Không rõ";
            let tagMatches = fullTitle.match(/\[(.*?)\]/g);
            let defaultTag = tagMatches ? tagMatches[tagMatches.length - 1].replace(/\[|\]/g, "") : "Không rõ";
            let status = docHtml.querySelector("h1.p-title-value span")?.textContent.trim() || "Không rõ";
            let author = "Không rõ";
            let editors = [];
            docHtml.querySelectorAll("article.message-body.js-selectToQuote div").forEach(div => {
                let t = div.innerText.trim();
                let authorMatch = t.match(/Tác giả:\s*(.+)|Author:\s*(.+)/i);
                if (authorMatch) author = authorMatch[1] || authorMatch[2];
				let editorRegex = new RegExp(
				  "(?:Editor:\\s*(.+))" +
				  "|(?:Edit:\\s*(.+))" +
				  "|(?:Edit\\s*\\+\\s*beta:\\s*(.+))" +
				  "|(?:Beta:\\s*(.+))" +
				  "|(?:Editor\\s*\\+\\s*beta:\\s*(.+))" +
				  "|(?:Edit bởi:\\s*(.+))" +
				  "|(?:Dịch:\\s*(.+))",
				  "i"
				);
                let editorMatch = t.match(editorRegex);
                if (editorMatch) {
                    let editorStr = editorMatch[1] || editorMatch[2] || editorMatch[3] || editorMatch[4] || editorMatch[5] || editorMatch[6] || editorMatch[7];
                    editors = editorStr.split(",").map(e => e.replace(/^@/, "").trim()).filter(e => e);
                }
            });

            let story = {
                title,
                cnTitle,
                originalLink,
                defaultTag,
                userTags: [],
                author,
                editor: editors,
                status,
                url,
				urlKey: normalizeUrl(url)
            };

            displayStoryDetails(story);
            await saveStory(story);
            alert("Đã lưu truyện.");
        } catch (error) {
            console.error("Lỗi khi fetch truyện:", error);
            alert("Không thể lấy dữ liệu từ link này!");
        }
    } else {
        manualForm.style.display = "block";
        saveButton.disabled = true;

        let manualTitle = document.getElementById("manualTitle");
        let manualTag = document.getElementById("manualTag");
        let manualAuthor = document.getElementById("manualAuthor");
        let manualEditor = document.getElementById("manualEditor");
        let manualStatus = document.getElementById("manualStatus");

        function checkManualFields() {
            if (manualTitle.value.trim() && manualTag.value.trim() && manualAuthor.value.trim() && manualEditor.value.trim()) {
                saveButton.disabled = false;
            } else {
                saveButton.disabled = true;
            }
        }

        manualTitle.addEventListener("input", checkManualFields);
        manualTag.addEventListener("input", checkManualFields);
        manualAuthor.addEventListener("input", checkManualFields);
        manualEditor.addEventListener("input", checkManualFields);

        saveButton.onclick = async function() {
            let editors = document.getElementById("manualEditor").value.split(",").map(e => e.trim()).filter(e => e);
            let story = {
                title: manualTitle.value.trim(),
                cnTitle,
                originalLink,
                defaultTag: manualTag.value.trim(),
                userTags: [],
                author: manualAuthor.value.trim(),
                editor: editors,
                status: manualStatus.value,
                url,
				urlKey: normalizeUrl(url)
            };

            displayStoryDetails(story);
            await saveStory(story);

            manualTitle.value = "";
            manualTag.value = "";
            manualAuthor.value = "";
            manualEditor.value = "";
            document.getElementById("cnTitle").value = "";
            document.getElementById("originalLink").value = "";
            manualForm.style.display = "none";
            saveButton.disabled = false;
            saveButton.onclick = fetchStory;
            alert("Đã lưu truyện.");
        };
    }
}

export async function batchFetchStories(){
	let raw=document.getElementById("multiLinks").value.trim();
	if(!raw){
		alert("Nhập danh sách link, mỗi dòng một link.");
		return;
	}
	let links=raw.split(/\r?\n|,|\s/).map(s=>s.trim()).filter(Boolean);
	let items=links.map(u=>({url:u,key:normalizeUrl(u)}));
	let seen=new Set();
	let unique=[];
	for(let it of items){
		if(seen.has(it.key)) continue;
		seen.add(it.key);
		unique.push(it);
	}

	let saved=[];
	let duplicates=[];
	let nonForum=[];
	let failed=[];
	const total=unique.length;
	let done=0;

	const box=document.getElementById("batchProgress");
	const txt=document.getElementById("batchProgressText");
	const pct=document.getElementById("batchPercent");
	const bar=box.querySelector(".progress-bar");
	box.style.display="block";
	txt.textContent=`Bắt đầu xử lý 0/${total} link...`;
	pct.textContent="0%";
	bar.style.width="0%";

	for(let it of unique){
		try{
			if(await urlExists(it.url)){
				duplicates.push(it.url);
			}else if(!it.url.includes("toanchuccaothu")){
				nonForum.push(it.url);
			}else{
				document.getElementById("storyLink").value=it.url;
				await fetchStory();
				saved.push(it.url);
			}
		}catch(e){
			failed.push(it.url);
		}
		done++;
		const per=Math.round(done*100/total);
		txt.textContent=`Đã xử lý ${done}/${total} link...`;
		pct.textContent=per+"%";
		bar.style.width=per+"%";
	}

	renderBatchReport({saved,duplicates,nonForum,failed});
	txt.textContent=`Hoàn tất: lưu ${saved.length}/${total} link`;
	pct.textContent="100%";
	bar.style.width="100%";

	let ok=saved.length;
	let skipped=duplicates.length;
	let nf=nonForum.length;
	let fail=failed.length;
	alert(`Xong: lưu ${ok}, trùng ${skipped}, bỏ qua không phải forum ${nf}, lỗi ${fail}. Chi tiết ở dưới.`);
}

function renderBatchReport(groups) {
	let el=document.getElementById("batchReport");
	if(!el){
		el=document.createElement("div");
		el.id="batchReport";
		document.getElementById("multiLinks").parentElement.appendChild(el);
	}
	const openKey=groups.failed?.length?"failed":(groups.duplicates?.length?"duplicates":(groups.nonForum?.length?"nonForum":"saved"));
	const section=(key,title,arr,highlight)=>{
		if(!arr||!arr.length) return "";
		const openAttr=openKey===key?" open":"";
		const style=highlight?' style="color:#b00020"':"";
		return `
<details${openAttr}>
	<summary${style}><b>${title}</b> (${arr.length})</summary>
	<ul style="margin:8px 0 12px 20px; padding:0;">
		${arr.map(u=>`<li><a href="${u}" target="_blank">${u}</a></li>`).join("")}
	</ul>
</details>`;
	};
	el.innerHTML=`
<div style="background:#f8f9ff;border:1px solid #dcdcff;border-radius:8px;padding:12px 14px;">
	<div style="font-weight:700;margin-bottom:6px;">Kết quả batch</div>
	${section("failed","Lỗi khi lấy",groups.failed,true)}
	${section("duplicates","Trùng",groups.duplicates,false)}
	${section("nonForum","Không phải forum",groups.nonForum,false)}
	${section("saved","Đã lưu",groups.saved,false)}
</div>`;
	el.scrollIntoView({behavior:"smooth",block:"center"});
}

export function removeVietnameseTones(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d").replace(/Đ/g, "D");
}

export async function saveStoryToFirestore(story){
	try{
		let storyId=removeVietnameseTones(story.title||"").replace(/[^\w\s]/gi,"").replace(/\s+/g,"_").trim();
		if(!storyId) storyId=btoa(story.url).slice(0,16);
		let storyRef=doc(storiesCollection,storyId);
		let existingDoc=await getDoc(storyRef);
		let existingData=existingDoc.exists()?existingDoc.data():{};
		let updatedStory={
			...existingData,
			...story,
			urlKey: normalizeUrl(story.url||existingData.url||""),
			userTags:{
				...(existingData.userTags||{}),
				...(story.userTags||{})
			},
			updatedAt: serverTimestamp()
		};
		await setDoc(storyRef,updatedStory,{ merge:true });
	}catch(error){
		console.error("Lỗi khi lưu vào Firestore:",error);
	}
}

export async function saveStoryToIndexedDB(story,storeName="stories"){
	if(!idb){
		console.warn("IndexedDB chưa sẵn sàng.");
		return;
	}
	if(!story.url){
		console.error("Lỗi: Không thể lưu truyện vào IndexedDB vì thiếu 'url'!");
		return;
	}
	let transaction=idb.transaction([storeName],"readwrite");
	let store=transaction.objectStore(storeName);
	let getRequest=store.get(story.url);
	getRequest.onsuccess=function(event){
		let existingStory=event.target.result||{};
		let updatedStory={
			...existingStory,
			...story,
			urlKey: normalizeUrl(story.url||existingStory.url||""),
			userTags:{
				...(existingStory.userTags||{}),
				...(story.userTags||{})
			}
		};
		store.put(updatedStory);
	};
	getRequest.onerror=function(event){
		console.error("Lỗi khi truy vấn IndexedDB:",event.target.error);
	};
}

export async function saveStory(story) {
    try {
        await Promise.all([
            saveStoryToFirestore(story),
            saveStoryToIndexedDB(story)
        ]);
    } catch (error) {
        console.error("Lỗi khi lưu truyện:", error);
    }
}

export async function fetchStoryFromFirestore(url){
	const key=normalizeUrl(url);
	let snap1=await getDocs(query(collection(db,"stories"),where("urlKey","==",key)));
	if(!snap1.empty) return snap1.docs[0].data()||{};
	let snap2=await getDocs(query(collection(db,"stories"),where("url","==",url)));
	if(!snap2.empty) return snap2.docs[0].data()||{};
	return {};
}

export async function loadStories() {
  await waitForIndexedDB();
  let indexedDBStories = await loadStoriesFromIndexedDB("stories");
  let storyMap = {};
  indexedDBStories.forEach(story => { storyMap[story.url] = story; });

  try {
    let firestoreStories = await getDocs(storiesCollection);
    let stories = [];
    firestoreStories.forEach((docSnap) => {
      let story = docSnap.data();
      story.id = docSnap.id;
      if (storyMap[story.url]) {
        story.userTags = {
          ...(storyMap[story.url].userTags || {}),
          ...(story.userTags || {})
        };
      }
      stories.push(story);
      saveStoryToIndexedDB(story);
    });

    const list = window.applySort ? window.applySort(stories) : stories;
    window.currentStories = list;
    renderStories(list, "storyTable");

  } catch (error) {
    console.error("Lỗi khi tải truyện từ Firestore:", error);

    const list = window.applySort ? window.applySort(indexedDBStories) : indexedDBStories;
    window.currentStories = list;
    renderStories(list, "storyTable");
  }
}

export async function loadStoriesFromIndexedDB(storeName) {
    return new Promise((resolve) => {
        if (!idb) {
            resolve([]);
            return;
        }
        let transaction = idb.transaction([storeName], "readonly");
        let store = transaction.objectStore(storeName);
        let request = store.getAll();
        request.onsuccess = function (event) {
            resolve(event.target.result);
        };
        request.onerror = function (event) {
            console.error("Lỗi khi tải từ IndexedDB:", event.target.error);
            resolve([]);
        };
    });
}

export async function deleteStoryFromFirestore(storyId, collectionName = "stories") {
    await deleteDoc(doc(db, collectionName, storyId));
}

export async function deleteStoryFromIndexedDB(storyUrl, storeName = "stories") {
    let transaction = idb.transaction([storeName], "readwrite");
    let store = transaction.objectStore(storeName);
    store.delete(storyUrl);
}

export async function deleteStory(storyUrl, storyId, collectionName = "stories", tableId = "storyTable") {
    const password = prompt("Vui lòng nhập mật khẩu để xóa truyện:");
    if (password !== "3,141592654") {
        alert("Mật khẩu không đúng! Không thể xóa truyện.");
        return;
    }
    deleteStoryFromIndexedDB(storyUrl, "stories");
    if (storyId) {
        deleteStoryFromFirestore(storyId, "stories");
    }
    setTimeout(() => {
        loadStories();
    }, 500);
    alert("Đã xóa truyện thành công.");
}

export async function fetchTagsFromDatabase() {
    try {
        let querySnapshot = await getDocs(collection(db, "stories"));
        allTags = new Set();
        querySnapshot.forEach(docSnap => {
            let storyData = docSnap.data();
            if (storyData.defaultTag) allTags.add(storyData.defaultTag);
            if (storyData.userTags && typeof storyData.userTags === "object") {
                Object.values(storyData.userTags).forEach(tag => allTags.add(tag));
            }
        });
        allTags = [...allTags];
    } catch (error) {
        console.error("Lỗi khi tải tag:", error);
    }
}

export async function loadAllTags() {
    let allTagsSet = new Set();
    let querySnapshot = await getDocs(collection(db, "stories"));
    querySnapshot.forEach(docSnap => {
        let story = docSnap.data();
        if (story.defaultTag) allTagsSet.add(story.defaultTag);
        if (story.userTags && typeof story.userTags === "object") {
			Object.values(story.userTags).forEach(userTagList => {
				if (!Array.isArray(userTagList)) userTagList = [userTagList];
				userTagList.forEach(tag => {
					if (tag) allTagsSet.add(String(tag).trim());
				});
			});
        }
    });
    window.allTags = Array.from(allTagsSet);
}

export async function exportStoriesToCSV(){
	let querySnapshot=await getDocs(collection(db,"stories"));
	let rows=[["Tiền tố","Tag CP","Tên fic"]];
	querySnapshot.forEach(docSnap=>{
		let s=docSnap.data();
		rows.push([
			s.status || "",
			s.defaultTag || "",
			`=HYPERLINK("${s.url}","${(s.title||"").replace(/"/g,'""')}")`
		]);
	});
	let csv=rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
	let blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
	let url=URL.createObjectURL(blob);
	let a=document.createElement("a");
	a.href=url;
	a.download="stories_export.csv";
	a.click();
	URL.revokeObjectURL(url);
}
window.exportStoriesToCSV = exportStoriesToCSV;

window.fetchStory = fetchStory;
window.deleteStory = deleteStory;
window.saveStory = saveStory;
window.batchFetchStories = batchFetchStories;