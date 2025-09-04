(()=>{
	const fdb=window.db
	const storage=firebase.storage()
	const uname=localStorage.getItem("username")||""
	const hello=document.getElementById("hello")
	if(uname) hello.textContent="Xin chào, "+uname

	const commentsList=document.getElementById("comments-list")
	const composer=document.querySelector(".composer")
	const currentDayEl=document.getElementById("current-day")
	const input=document.getElementById("comment-input")
	const imgInput=document.getElementById("image-input")
	const saveBtn=document.getElementById("save-comment")
	const sortSelect=document.getElementById("sort-select")
	const saveHint=document.getElementById("save-hint")

	const pagerEl=document.getElementById("pager")
	const titleEl=document.getElementById("comments-title")

	let currentDay=null
	let myStatus={}
	const hasDone=d=>Boolean(myStatus["day"+d])

	const PALETTE=["#8BD3DD","#A7C7E7","#B8C0FF","#CDE7BE","#B9FBC0","#FFD6A5","#FEC89A","#FFADAD","#CDB4DB","#90DBF4"]
	function colorFor(name){let h=0;for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))>>>0;return PALETTE[h%PALETTE.length]}

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
	function buildSlots(){
		overlay.innerHTML=""
		const baseW=900,baseH=2002
		const cellW=145,cellH=143
		const gapX=7,gapY=20
		const startX=74,startY=739
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
				slot.style.left=(x/baseW*100)+"%"
				slot.style.top=(y/baseH*100)+"%"
				slot.style.width=(cellW/baseW*100)+"%"
				slot.style.height=(cellH/baseH*100)+"%"
				const d=day
				slot.onclick=()=>pick(d,slot)
				overlay.appendChild(slot)
				day++
			}
		}
	}
	const baseImg=document.querySelector(".poster .base")
	if(baseImg.complete) buildSlots(); else baseImg.addEventListener("load",buildSlots)

	async function pick(d,slot){
		document.querySelectorAll(".day-slot").forEach(s=>s.classList.remove("active"))
		slot.classList.add("active")
		currentDay=d
		currentDayEl.textContent="Ngày "+d+": "+(prompts[d-1]||"")
		composer.classList.add("show")
		pagerEl.style.display="flex"
		titleEl.textContent="Cảm nghĩ của mọi người"
		input.value=""
		imgInput.value=""
		saveHint.textContent=""
		await loadMine(d)
		await loadAnswers(d)
	}

	async function loadProgress(){
		if(!uname)return
		const ref=fdb.collection("challenge33Progress").doc(uname)
		const snap=await ref.get()
		myStatus=snap.exists?(snap.data()||{}):{}
		for(let d=1;d<=33;d++) if(hasDone(d)) markDone(d)
	}
	function markDone(d){
		const slot=document.querySelector(".day-slot[data-day='"+d+"']")
		if(slot) slot.classList.add("done")
	}
	async function loadMine(d){
		if(!uname)return
		const docRef=fdb.collection("challenge33").doc("day"+d).collection("comments").doc(uname)
		const snap=await docRef.get()
		if(snap.exists) input.value=snap.data().text||""
	}

	async function loadRecentFeed(){
	  currentDay=null
	  composer.classList.remove("show")
	  pagerEl.style.display="none"
	  sortSelect.value="desc"
	  titleEl.textContent="5 cảm nghĩ gần nhất"
	  commentsList.innerHTML=""
	  const snap=await fdb.collectionGroup("comments").orderBy("updatedAt","desc").limit(5).get()
	  if(snap.empty){
		const p=document.createElement("p")
		p.textContent="Chưa có bình luận nào."
		p.style.color="#8a6b82"
		commentsList.appendChild(p)
		return
	  }
	  for(const doc of snap.docs){
		const c=doc.data()
		const dayId=doc.ref.parent.parent.id
		const day=parseInt(dayId.replace("day",""))||0

		const card=document.createElement("div")
		card.className="card"
		const ava=document.createElement("div")
		ava.className="avatar"
		ava.style.background=colorFor(c.username)
		ava.style.color="#fff"
		ava.style.borderColor=ava.style.background
		ava.textContent=avatar(c.username)
		const body=document.createElement("div")

		const meta=document.createElement("div")
		meta.className="meta"
		const n=document.createElement("span")
		n.className="name"; n.textContent=c.username
		const t=document.createElement("span")
		t.textContent="• "+fmt(c.updatedAt)+" • Ngày "+day
		meta.appendChild(n); meta.appendChild(t)

		const msg=document.createElement("div")
		msg.className="msg"; msg.textContent=c.text||""

		body.appendChild(meta)
		body.appendChild(msg)
		if(c.imageUrl){
		  const im=document.createElement("img")
		  im.src=c.imageUrl; im.className="thumb"
		  body.appendChild(im)
		}

		const toolsRow=document.createElement("div")
		toolsRow.className="tools-row"
		const leftTools=document.createElement("div")
		leftTools.className="left-tools"
		const openBtn=document.createElement("button")
		openBtn.className="tool"
		openBtn.textContent="Xem ngày "+day
		openBtn.onclick=()=>{
		  const slot=document.querySelector(".day-slot[data-day='"+day+"']")
		  if(slot) pick(day,slot)
		}
		leftTools.appendChild(openBtn)
		toolsRow.appendChild(leftTools)
		body.appendChild(toolsRow)

		card.appendChild(ava)
		card.appendChild(body)
		commentsList.appendChild(card)
	  }
	}

	function fmt(ts){const t=ts?new Date(ts):new Date();return t.toLocaleString()}
	function avatar(name){const s=(name||"U").trim();return s.split(/\s+/).map(x=>x[0]).join("").slice(0,2).toUpperCase()||"U"}

	let allComments=[]
	let currentPage=1
	const pageSize=5

	async function loadAnswers(d){
		commentsList.innerHTML=""
		currentPage=1
		const order=sortSelect.value==="asc"?"asc":"desc"
		const ref=fdb.collection("challenge33").doc("day"+d).collection("comments").orderBy("updatedAt",order)
		const snap=await ref.get()
		allComments=snap.docs
		if(allComments.length===0){
			const p=document.createElement("p")
			p.textContent="Chưa có bình luận nào."
			p.style.color="#8a6b82"
			commentsList.appendChild(p)
			document.getElementById("page-info").textContent="0/0"
			return
		}
		await renderPage(d)
	}

	async function renderPage(day){
		commentsList.innerHTML=""
		const start=(currentPage-1)*pageSize
		const end=start+pageSize
		const pageDocs=allComments.slice(start,end)
		for(const doc of pageDocs){
			const c=doc.data()
			const card=document.createElement("div")
			card.className="card"
			const ava=document.createElement("div")
			ava.className="avatar"
			ava.style.background=colorFor(c.username)
			ava.style.color="#fff"
			ava.style.borderColor=ava.style.background
			ava.textContent=avatar(c.username)
			const body=document.createElement("div")

			const meta=document.createElement("div")
			meta.className="meta"
			const n=document.createElement("span")
			n.className="name"; n.textContent=c.username
			const t=document.createElement("span")
			t.textContent="• "+fmt(c.updatedAt)
			meta.appendChild(n); meta.appendChild(t)

			const msg=document.createElement("div")
			msg.className="msg"; msg.textContent=c.text||""

			body.appendChild(meta)
			body.appendChild(msg)
			if(c.imageUrl){
				const im=document.createElement("img")
				im.src=c.imageUrl; im.className="thumb"
				body.appendChild(im)
			}

			const toolsRow=document.createElement("div")
			toolsRow.className="tools-row"
			const leftTools=document.createElement("div")
			leftTools.className="left-tools"
			if(uname&&c.username===uname){
				const you=document.createElement("span")
				you.className="tool ok"; you.textContent="Của bạn"
				const editAns=document.createElement("button")
				editAns.className="tool"
				editAns.textContent="Sửa"
				editAns.onclick=()=>{
					input.value=c.text||""
					window.scrollTo({top:0,behavior:"smooth"})
				}
				leftTools.appendChild(you)
				leftTools.appendChild(editAns)
			}
			const rightTools=document.createElement("div")
			rightTools.className="right-tools"
			const likeBtn=document.createElement("button")
			likeBtn.className="tool"; likeBtn.textContent="❤️"
			likeBtn.onclick=()=>toggleLike(day,doc.id)
			const likeCount=document.createElement("button")
			likeCount.className="like-count"; likeCount.textContent=String(c.likeCount||0)
			likeCount.onclick=()=>showLikes(day,doc.id)
			rightTools.appendChild(likeBtn)
			rightTools.appendChild(likeCount)
			toolsRow.appendChild(leftTools)
			toolsRow.appendChild(rightTools)
			body.appendChild(toolsRow)

			const replyWrap=document.createElement("div")
			replyWrap.className="reply-wrap"
			body.appendChild(replyWrap)

			card.appendChild(ava)
			card.appendChild(body)
			commentsList.appendChild(card)

			await renderReplies(day,doc.id,replyWrap,0)
		}
		const totalPages=Math.ceil(allComments.length/pageSize)
		document.getElementById("page-info").textContent=currentPage+"/"+totalPages
	}

	async function toggleLike(day,ownerId){
		if(!uname){alert("Bạn cần đăng nhập");return}
		const ref=fdb.collection("challenge33").doc("day"+day).collection("comments").doc(ownerId)
		await fdb.runTransaction(async tx=>{
			const snap=await tx.get(ref)
			if(!snap.exists)return
			const data=snap.data()||{}
			const likes=data.likes||{}
			if(likes[uname]) delete likes[uname]; else likes[uname]=true
			const likeCount=Object.keys(likes).length
			tx.update(ref,{likes,likeCount})
		})
		await loadAnswers(day)
	}

	function replyBox(day,pathMount,ownerId,replyId){
		const wrap=document.createElement("div")
		wrap.className="reply-box"
		const ta=document.createElement("textarea")
		ta.placeholder="Viết phản hồi…"
		const send=document.createElement("button")
		send.className="tool"; send.textContent="Gửi"
		send.onclick=async()=>{
			if(!uname){alert("Bạn cần đăng nhập");return}
			let col=fdb.collection("challenge33").doc("day"+day).collection("comments").doc(ownerId)
			if(replyId) col=col.collection("replies").doc(replyId)
			const newRef=col.collection("replies").doc()
			await newRef.set({username:uname,text:ta.value.trim(),updatedAt:new Date().toISOString()})
			ta.value=""
			pathMount.innerHTML=""
			await renderReplies(day,ownerId,pathMount,0)
		}
		wrap.appendChild(ta); wrap.appendChild(send)
		return wrap
	}

	async function renderReplies(day,ownerId,mount,depth){
		mount.innerHTML=""
		const base=fdb.collection("challenge33").doc("day"+day).collection("comments").doc(ownerId)
		await renderReplyLevel(base,mount,day,ownerId,depth)
		mount.appendChild(replyBox(day,mount,ownerId,null))
	}

	async function renderReplyLevel(nodeRef,mount,day,ownerId,depth){
		const ref=nodeRef.collection("replies").orderBy("updatedAt","asc")
		const snap=await ref.get()
		for(const r of snap.docs){
			const d=r.data()
			const item=document.createElement("div")
			item.className="reply-card"
			const ava=document.createElement("div")
			ava.className="avatar"; ava.textContent=avatar(d.username)
			ava.style.background=colorFor(d.username)
			ava.style.color="#fff"
			ava.style.borderColor=ava.style.background
			const body=document.createElement("div")
			const meta=document.createElement("div")
			meta.className="meta"
			const nm=document.createElement("span")
			nm.className="name"; nm.textContent=d.username
			meta.appendChild(nm)
			const msg=document.createElement("div")
			msg.className="msg"; msg.textContent=d.text||""
			const foot=document.createElement("div")
			foot.className="small-meta"
			const time=document.createElement("span")
			time.textContent=fmt(d.updatedAt)
			foot.appendChild(time)
			if(uname&&d.username===uname){
				const editBtn=document.createElement("button")
				editBtn.className="tool"
				editBtn.textContent="Sửa"
				editBtn.onclick=async()=>{
					const nv=prompt("Sửa nội dung:",d.text||"")
					if(nv===null)return
					await nodeRef.collection("replies").doc(r.id).set({text:nv,updatedAt:new Date().toISOString(),username:d.username},{merge:true})
					await renderReplies(day,ownerId,mount,depth)
				}
				foot.appendChild(editBtn)
			}
			const replyBtn=document.createElement("button")
			replyBtn.className="tool ghost"; replyBtn.textContent="Trả lời"
			replyBtn.onclick=()=>{
				item.querySelectorAll(".reply-box").forEach(x=>x.remove())
				const box=replyBox(day,mount,ownerId,r.id)
				item.appendChild(box)
			}
			foot.appendChild(replyBtn)
			body.appendChild(meta)
			body.appendChild(msg)
			body.appendChild(foot)
			item.appendChild(ava)
			item.appendChild(body)
			mount.appendChild(item)
			await renderReplyLevel(nodeRef.collection("replies").doc(r.id),mount,day,ownerId,depth+1)
		}
	}

	const backdrop=document.createElement("div")
	backdrop.className="modal-backdrop"
	backdrop.innerHTML=`
		<div class="modal">
			<h3>Người đã thả tim</h3>
			<ul id="likes-ul"></ul>
			<button class="tool close">Đóng</button>
		</div>`
	document.body.appendChild(backdrop)
	backdrop.querySelector(".close").onclick=()=>backdrop.classList.remove("show")
	async function showLikes(day,ownerId){
		const ul=backdrop.querySelector("#likes-ul")
		ul.innerHTML=""
		const ref=fdb.collection("challenge33").doc("day"+day).collection("comments").doc(ownerId)
		const snap=await ref.get()
		const likes=(snap.data()&&snap.data().likes)||{}
		const names=Object.keys(likes)
		if(names.length===0){ul.innerHTML="<li>Chưa có ai</li>"}
		else names.sort().forEach(n=>{const li=document.createElement("li"); li.textContent=n; ul.appendChild(li)})
		backdrop.classList.add("show")
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
			await fdb.collection("userScores").doc(uname+"-Challenge").set({
				username:uname,game:"Challenge",
				score:firebase.firestore.FieldValue.increment(10),
				updatedAt:new Date().toISOString()
			},{merge:true})
		}
		await loadAnswers(currentDay)
		saveHint.textContent=wasDone?"Đã cập nhật.":"+10 điểm cho ngày này!"
		saveBtn.disabled=false
	}

	saveBtn.onclick=save
	sortSelect.onchange=()=>{if(currentDay)loadAnswers(currentDay)}
	document.getElementById("prev-page").onclick=()=>{
		if(currentPage>1){currentPage--; if(currentDay)renderPage(currentDay)}
	}
	document.getElementById("next-page").onclick=()=>{
		const totalPages=Math.ceil(allComments.length/pageSize)
		if(currentPage<totalPages){currentPage++; if(currentDay)renderPage(currentDay)}
	}
	;(async()=>{
	  await ensureLogin()
	  await loadProgress()
	  await loadRecentFeed()
	})()
})()
