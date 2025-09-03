(()=>{	
	const fdb=window.db
	const storage=firebase.storage()
	const uname=localStorage.getItem("username")||""
	const hello=document.getElementById("hello")
	if(uname)hello.textContent="Xin chào, "+uname

	const commentsList=document.getElementById("comments-list")
	const composer=document.querySelector(".composer")
	const currentDayEl=document.getElementById("current-day")
	const input=document.getElementById("comment-input")
	const imgInput=document.getElementById("image-input")
	const saveBtn=document.getElementById("save-comment")
	const sortSelect=document.getElementById("sort-select")
	const saveHint=document.getElementById("save-hint")

	let currentDay=null
	let myStatus={}
	const hasDone=d=>Boolean(myStatus["day"+d])

	const prompts=[
		"Cơ duyên khiến bạn sa vào hố 《Toàn Chức Cao Thủ》",
		"Bạn đã sa hố 《Toàn Chức Cao Thủ》 bao lâu rồi?",
		"Tâm trạng lần đầu đọc 《Toàn Chức Cao Thủ》",
		"Cảm nhận lần đầu đọc xong toàn bộ nguyên tác",
		"Khoảnh khắc vui nhất sau khi sa hố",
		"Dùng một câu để giới thiệu 《Toàn Chức Cao Thủ》 cho người ngoài",
		"Điểm hấp dẫn lớn nhất của 《Toàn Chức Cao Thủ》 trong mắt bạn",
		"Ảnh hưởng từ việc sa hố 《Toàn Chức Cao Thủ》 mang lại cho bạn",
		"Ấn tượng đầu tiên và ấn tượng hiện tại về nhân vật chính Diệp Tu",
		"Khi nhắc đến 《Toàn Chức Cao Thủ》 điều đầu tiên bạn nghĩ đến là gì",
		"Nói về lý do vì sao bạn ngưỡng mộ Diệp Tu",
		"Chia sẻ một đoạn thú vị trong truyện",
		"Giới thiệu nhân vật bạn thích nhất trong truyện",
		"Giới thiệu tài khoản game bạn thích nhất trong truyện",
		"Đội tuyển bạn muốn gia nhập nhất và lý do",
		"Chia sẻ một đoạn trong truyện khiến bạn xúc động",
		"Bạn muốn làm đồng đội với tuyển thủ nào nhất",
		"Kỹ năng Vinh Quang mà bạn muốn trải nghiệm nhất",
		"Đặt tên cho nhân vật Vinh Quang của chính bạn",
		"Bạn hy vọng có trình độ thao tác của tuyển thủ nào nhất",
		"Chia sẻ một phụ bản mà bạn thấy thú vị nhất",
		"Chi tiết/ấn tượng bạn phát hiện khi đọc lại nguyên tác",
		"Chia sẻ một câu thoại khiến bạn ấn tượng sâu sắc nhất",
		"Cảm nhận khi thấy Hưng Hãn giành chiến thắng ở trận khiêu chiến",
		"Chia sẻ một trận đấu bạn thấy máu lửa nhất",
		"Bạn muốn sở hữu đặc điểm nào của nhân vật nào nhất",
		"Khoảnh khắc bạn muốn “xuyên vào truyện” để được chứng kiến trực tiếp nhất",
		"Nghe bài hát nào là bạn lập tức liên tưởng đến 《Toàn Chức Cao Thủ》",
		"Chia sẻ một đoạn thoại của nhân vật mà bạn thích nhất",
		"Dùng ba từ để miêu tả đội tuyển bạn thích",
		"Chia sẻ một kiến thức thú vị (ít người biết) liên quan đến 《Toàn Chức Cao Thủ》",
		"Bức tranh chính thức hoặc fanart bạn thích nhất",
		"Thói quen mà bạn hình thành được nhờ 《Toàn Chức Cao Thủ》"
	]

	const overlay=document.getElementById("overlay")
	const baseW=900,baseH=2002
	const cellW=150,cellH=143
	const gapX=9,gapY=23
	const startX=59,startY=737
	const fullCols=5,rows=7
	let day=1
	for(let r=0;r<rows;r++){
		const colsThisRow=r<6?fullCols:3
		const offsetCols=r<6?0:1
		for(let c=0;c<colsThisRow;c++){
			if(day>33)break
			const x=startX+(offsetCols+c)*(cellW+gapX)
			const y=startY+r*(cellH+gapY)
			const slot=document.createElement("div")
			slot.className="day-slot"
			slot.dataset.day=day
			slot.style.left=`${x/baseW*100}%`
			slot.style.top=`${y/baseH*100}%`
			slot.style.width=`${cellW/baseW*100}%`
			slot.style.height=`${cellH/baseH*100}%`
			const d = day
			slot.onclick=()=>pick(d,slot)
			overlay.appendChild(slot)
			day++
		}
	}

	async function pick(d,slot){
		document.querySelectorAll(".day-slot").forEach(s=>s.classList.remove("active"))
		slot.classList.add("active")
		currentDay=d
		currentDayEl.textContent="Ngày "+d+": "+(prompts[d-1]||"")
		composer.classList.add("show")
		input.value=""
		imgInput.value=""
		saveHint.textContent=""
		await loadMine(d)
		await loadComments(d)
	}

	async function loadProgress(){
		if(!uname)return
		const ref=fdb.collection("challenge33Progress").doc(uname)
		const snap=await ref.get()
		myStatus=snap.exists?(snap.data()||{}):{}
		for(let d=1;d<=33;d++)if(hasDone(d))markDone(d)
	}

	function markDone(d){
		const slot=document.querySelector(`.day-slot[data-day='${d}']`)
		if(slot)slot.classList.add("done")
	}

	async function loadMine(d){
		if(!uname)return
		const docRef=fdb.collection("challenge33").doc("day"+d).collection("comments").doc(uname)
		const snap=await docRef.get()
		if(snap.exists)input.value=snap.data().text||""
	}

	function fmt(ts){
		const t=ts?new Date(ts):new Date()
		return t.toLocaleString()
	}
	function avatar(name){
		const s=(name||"U").trim()
		return s.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()||"U"
	}

	async function loadComments(d){
		commentsList.innerHTML=""
		const order=sortSelect.value==="asc"?"asc":"desc"
		const ref=fdb.collection("challenge33").doc("day"+d).collection("comments").orderBy("updatedAt",order)
		const snap=await ref.get()
		if(snap.empty){
			const p=document.createElement("p")
			p.textContent="Chưa có bình luận nào. Hãy là người đầu tiên!"
			p.style.color="#8a6b82"
			commentsList.appendChild(p)
			return
		}
		snap.forEach(doc=>{
			const c=doc.data()
			const card=document.createElement("div")
			card.className="card"
			const ava=document.createElement("div")
			ava.className="avatar"
			ava.textContent=avatar(c.username)
			const body=document.createElement("div")
			const meta=document.createElement("div")
			meta.className="meta"
			const n=document.createElement("span")
			n.className="name"
			n.textContent=c.username
			const t=document.createElement("span")
			t.textContent="• "+fmt(c.updatedAt)
			meta.appendChild(n)
			meta.appendChild(t)
			const msg=document.createElement("div")
			msg.className="msg"
			msg.textContent=c.text||""
			body.appendChild(meta)
			body.appendChild(msg)

			const tools=document.createElement("div")
			tools.className="self-tools"
			const like=document.createElement("button")
			like.className="tool"
			like.textContent=`❤️ ${c.likeCount||0}`
			like.onclick=()=>toggleLike(d, doc.id, c)
			const replyBtn=document.createElement("button")
			replyBtn.className="tool"
			replyBtn.textContent="Trả lời"
			replyBtn.onclick=()=>openReply(d, doc.id)
			tools.appendChild(like)
			tools.appendChild(replyBtn)
			body.appendChild(tools)

			const repliesWrap=document.createElement("div")
			repliesWrap.dataset.rid=doc.id
			body.appendChild(repliesWrap)
			loadReplies(d, doc.id, repliesWrap)

			if(c.imageUrl){
				const im=document.createElement("img")
				im.src=c.imageUrl
				im.className="thumb"
				body.appendChild(im)
			}
			if(uname&&c.username===uname){
				const tools=document.createElement("div")
				tools.className="self-tools"
				const edit=document.createElement("button")
				edit.className="tool"
				edit.textContent="Sửa"
				edit.onclick=()=>{
					input.value=c.text||""
					window.scrollTo({top:0,behavior:"smooth"})
				}
				const me=document.createElement("span")
				me.className="tool ok"
				me.textContent="Của bạn"
				tools.appendChild(edit)
				tools.appendChild(me)
				body.appendChild(tools)
			}
			card.appendChild(ava)
			card.appendChild(body)
			commentsList.appendChild(card)
		})
	}

	async function toggleLike(day, ownerId, cached){
		if(!uname)return alert("Bạn cần đăng nhập")
		const ref=fdb.collection("challenge33").doc("day"+day).collection("comments").doc(ownerId)
		await fdb.runTransaction(async tx=>{
			const snap=await tx.get(ref)
			if(!snap.exists)return
			const data=snap.data()
			const likes=data.likes||{}
			if(likes[uname]) delete likes[uname]
			else likes[uname]=true
			const likeCount=Object.keys(likes).length
			tx.update(ref,{likes,likeCount})
		})
		await loadComments(day)
	}

	function openReply(day, ownerId){
		const wrap=document.querySelector(`[data-rid='${ownerId}']`)
		wrap.innerHTML=""
		const ta=document.createElement("textarea")
		ta.placeholder="Viết phản hồi…"
		const send=document.createElement("button")
		send.className="tool"
		send.textContent="Gửi"
		send.onclick=async()=>{
			if(!uname)return alert("Bạn cần đăng nhập")
			const ref=fdb.collection("challenge33").doc("day"+day).collection("comments").doc(ownerId).collection("replies").doc()
			await ref.set({username:uname,text:ta.value.trim(),updatedAt:new Date().toISOString()})
			ta.value=""
			await loadReplies(day, ownerId, wrap)
		}
		wrap.appendChild(ta)
		wrap.appendChild(send)
	}

	async function loadReplies(day, ownerId, mount){
		mount.innerHTML=""
		const ref=fdb.collection("challenge33").doc("day"+day).collection("comments").doc(ownerId).collection("replies").orderBy("updatedAt","asc")
		const snap=await ref.get()
		snap.forEach(r=>{
			const d=r.data()
			const div=document.createElement("div")
			div.style.marginTop="6px"
			div.innerHTML=`<span style="font-weight:700">${d.username}</span>: ${d.text}`
			mount.appendChild(div)
		})
	}

	async function ensureLogin(){
		if(!uname){
			alert("Bạn cần đăng nhập ở trang chủ trước.")
			saveBtn.disabled=true
		}
	}

	async function save(){
		if(!currentDay){alert("Chọn một ngày trước đã.");return}
		if(!uname){alert("Bạn cần đăng nhập.");return}
		saveBtn.disabled=true
		saveHint.textContent="Đang lưu..."
		let imageUrl=""
		if(imgInput.files[0]){
			const f=imgInput.files[0]
			const ref=storage.ref("challenge33/"+uname+"/day"+currentDay+"_"+Date.now()+"_"+f.name)
			await ref.put(f)
			imageUrl=await ref.getDownloadURL()
		}
		const wasDone=hasDone(currentDay)
		const docRef=fdb.collection("challenge33").doc("day"+currentDay).collection("comments").doc(uname)
		await docRef.set({
			username:uname,
			text:input.value.trim(),
			imageUrl:imageUrl||firebase.firestore.FieldValue.delete(),
			updatedAt:new Date().toISOString()
		},{merge:true})
		if(!wasDone){
			await fdb.collection("challenge33Progress").doc(uname).set({["day"+currentDay]:true},{merge:true})
			myStatus["day"+currentDay]=true
			markDone(currentDay)
			await fdb.collection("users").doc(uname).set({
				totalScore:firebase.firestore.FieldValue.increment(10)
			},{merge:true})
			await fdb.collection("userScores")
			  .doc(`${uname}-Challenge`)
			  .set({
				username: uname,
				game: "Challenge",
				score: firebase.firestore.FieldValue.increment(10),
				updatedAt: new Date().toISOString()
			  }, { merge: true })
		}
		await loadComments(currentDay)
		saveHint.textContent=wasDone?"Đã cập nhật bình luận.":"+10 điểm cho ngày này!"
		saveBtn.disabled=false
	}

	saveBtn.onclick=save
	sortSelect.onchange=()=>{if(currentDay)loadComments(currentDay)}
	;(async()=>{await ensureLogin();await loadProgress()})()
})()
