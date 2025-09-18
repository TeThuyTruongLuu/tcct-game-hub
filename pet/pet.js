class Pet{
	constructor(opts){
		this.name=opts.name||"Pet"
		this.basePath=opts.basePath||""
		this.idle=opts.idle||"idle.png"
		this.actions=opts.actions||{}
		this.speed=opts.speed||80
		this.spawn=opts.spawn||{x:40,y:40}
		this.state="idle"
		this.frame=0
		this.frameTime=0
		this.frameDur=0.25
		this.vx=0
		this.vy=0
		this.gravity=900
		this.dragging=false
		this.offX=0
		this.offY=0
		this.dir=1
		this.node=this._makeNode()
		this.img=this.node.querySelector("img")
		this.bubble=this.node.querySelector(".bubble")
		this._loadImage(this.idle)
		this._place(this.spawn.x,this.spawn.y)
		this._bind()
		this._raf=0
		this._prev=0
		this.t=0
		this.stateLockUntil=0
		this.nextStateAt=0
		this._tick(performance.now())
		requestAnimationFrame(()=>{
		  const r=this.node.getBoundingClientRect()
		  this._place(this.spawn.x, -r.height)
		  this.vx=0
		  this.vy=0
		  this.state="spawnDrop"
		})
		this._rndTimer=setInterval(()=>this._autoRandom(),1000)
		this._initSpeechTimer()
	}

	_lock(ms){
		this.stateLockUntil=performance.now()+ms
		this.nextStateAt=this.stateLockUntil
	}

	_startFlyIdleOverlay(ms){
		this.flyHoldUntil=performance.now()+ms
		this.flyIdleOverlayTime=0
		this.frame=0
		this._setFlyIdleFrame()
	}
	_inFlyIdleOverlay(){
		return this.flyHoldUntil && performance.now()<this.flyHoldUntil
	}

	_hide(){
		this.node.style.display="none"
		cancelAnimationFrame(this._raf)
		clearInterval(this._rndTimer)
	}

	_makeNode(){
		const el=document.createElement("div")
		el.className="pet " + this.name.toLowerCase()
		el.style.left="0px"
		el.style.top="0px"
		const img=document.createElement("img")
		const bubble=document.createElement("div")
		bubble.className="bubble"
		el.appendChild(img)
		el.appendChild(bubble)
		document.getElementById("stage").appendChild(el)
		return el
	}

	_bind(){
		this.node.addEventListener("contextmenu",e=>{
			e.preventDefault()
			this._openMenu(e.clientX,e.clientY)
		})
		this.node.addEventListener("dblclick",e=>{
			e.preventDefault()
			this._openMenu(e.clientX,e.clientY)
		})
		this.node.addEventListener("mousedown",e=>{
			this.dragging=true
			const r=this.node.getBoundingClientRect()
			this.offX=e.clientX-r.left
			this.offY=e.clientY-r.top
			this._loadImage("drag.png")
		})
		let touchId=null, touchStartAt=0, lastTouchXY=null, longPressTimer=0
		const LP=450, DRAG_T=8

		this.node.addEventListener("touchstart",e=>{
			const t=e.changedTouches[0]
			touchId=t.identifier
			touchStartAt=performance.now()
			lastTouchXY={x:t.clientX,y:t.clientY}
			this.dragging=false
			clearTimeout(longPressTimer)
			longPressTimer=setTimeout(()=>{
				this._openMenu(t.clientX,t.clientY)
			},LP)
			this._loadImage("drag.png")
		},{passive:true})

		this.node.addEventListener("touchmove",e=>{
			const t=[...e.changedTouches].find(x=>x.identifier===touchId)
			if(!t)return
			const dx=Math.abs(t.clientX-lastTouchXY.x), dy=Math.abs(t.clientY-lastTouchXY.y)
			if(dx>DRAG_T||dy>DRAG_T){
				this.dragging=true
				clearTimeout(longPressTimer)
				const x=this._clamp(t.clientX-this.node.offsetWidth/2,0,innerWidth-this.node.offsetWidth)
				const y=this._clamp(t.clientY-this.node.offsetHeight/2,0,innerHeight-this.node.offsetHeight)
				this._place(x,y)
			}
		},{passive:true})

		this.node.addEventListener("touchend",e=>{
			const t=[...e.changedTouches].find(x=>x.identifier===touchId)
			if(!t)return
			clearTimeout(longPressTimer)
			if(this.dragging){
				this.dragging=false
				if(this.state==="walk")this._setWalkFrame()
				else if(this.state==="fly")this._setFlyFrame()
				else if(this.state==="flyIdle")this._setFlyIdleFrame()
				else this._loadImage(this.idle)
			}else{
				this._openMenu(t.clientX,t.clientY)
			}
			touchId=null
		},{passive:true})

		window.addEventListener("mousemove",e=>{
			if(!this.dragging)return
			const x=this._clamp(e.clientX-this.offX,0,innerWidth-this.node.offsetWidth)
			const y=this._clamp(e.clientY-this.offY,0,innerHeight-this.node.offsetHeight)
			this._place(x,y)
		})
		window.addEventListener("mouseup",()=>{
			if(!this.dragging)return
			this.dragging=false
			if(this.state==="walk")this._setWalkFrame()
			else if(this.state==="fly")this._setFlyFrame()
			else if(this.state==="flyIdle")this._setFlyIdleFrame()
			else this._loadImage(this.idle)
		})
		const closeIfOutside = e=>{
			if(!this._menu) return
			if(e.target.closest(".ctx")) return
			this._closeMenu()
		}
		document.addEventListener("pointerdown", closeIfOutside)
	}
	
	_placeMenu(m, x, y){
		const margin=12
		requestAnimationFrame(()=>{
		const r=m.getBoundingClientRect()
		let px=Math.min(Math.max(x,margin), innerWidth - r.width - margin)
		let py=Math.min(Math.max(y,margin), innerHeight - r.height - margin)
		const pr=this.node.getBoundingClientRect()
		const overlapX = px < pr.right && (px + r.width) > pr.left
		const overlapY = py < pr.bottom && (py + r.height) > pr.top
		if(overlapX && overlapY){
			const right = pr.right + 12
			const left = pr.left - r.width - 12
			if(right + r.width <= innerWidth - margin) px = right
			else if(left >= margin) px = left
			else py = Math.min(pr.top - r.height - 12, innerHeight - r.height - margin)
		}
		m.style.left = px + "px"
		m.style.top	= py + "px"
		})
	}
	
	_addMenuBtn(m, label, fn){
		const b=document.createElement("button")
		b.textContent=label
		const handler=e=>{ e.stopPropagation(); e.preventDefault(); fn() }
		b.addEventListener("pointerup", handler, {passive:false})
		b.addEventListener("click", handler, {passive:false})
		b.addEventListener("touchend", handler, {passive:false})
		m.appendChild(b)
	}

	_openMenu(x,y){
		this._closeMenu()
		this._menuOpenedAt = performance.now()
		const m=document.createElement("div")
		m.className="ctx " + (this.name==="Vuong" ? "vuong" : "ga")
		m.addEventListener("mousedown",e=>e.stopPropagation())
		m.addEventListener("touchstart",e=>{e.stopPropagation();e.preventDefault()},{passive:false})
		const add=(label,fn)=>{
			const b=document.createElement("button")
			b.textContent=label
			const run = e=>{ e.stopPropagation(); e.preventDefault(); fn() }
			b.addEventListener("pointerup", run, {passive:false})
			b.addEventListener("click", run, {passive:false})
			m.appendChild(b)
		}
		if(this.name==="Vuong"){
		add("Đi bộ",()=>{this._stopAll();this._startWalk()})
		add("Đổi hướng đi",()=>{if(this.state==="walk"||this.state==="fly"){this.vx*=-1;this.dir*=-1}})
		add("Bay",()=>{this._stopAll();this._startFly()})
		add("Bay lững lờ",()=>{this._stopAll();this._startFlyIdle()})
		add("Random",()=>{this._stopAll();this._startRandom()})
		add("Nghe nhạc",()=>{this._openMusicMenu(x,y)})
		add("Ẩn",()=>{this._hide()})
		}else if(this.name==="Ga"){
		add("Đi bộ",()=>{this._stopAll();this._startWalk()})
		add("Nhún",()=>{this._stopAll();this._startHopInPlace()})
		add("Bounce",()=>{this._stopAll();this._startBounce()})
		add("Random",()=>{this._stopAll();this._startRandom()})
		add("Ẩn",()=>{this._hide()})
		}
		document.body.appendChild(m)
		this._menu=m
		this._placeMenu(m,x,y)
	}

	_closeMenu(){
		if(this._menu){this._menu.remove();this._menu=null}
	}

	_stopAll(){
		this.state="idle"
		this.vx=0
		this.vy=0
		this.frame=0
		this.frameTime=0
		this._loadImage(this.idle)
		this._lock(this.name==="Vuong"?5000:4000)
	}

	_startRandom(){
		this.state="random"
		this._lock(3000)
	}

	_startWalk(){
		this.state="walk"
		this.vx=this.speed*(Math.random()<0.5?-1:1)
		this.dir=this.vx<0?-1:1
		this.frame=0
		this.frameTime=0
		this.frameDur=0.25
		const base=this.name==="Vuong"?5000:4000
		this._lock(base+Math.random()*3000)
	}

	_startFly(){
		this.state="fly"
		this.vx=this.speed*(Math.random()<0.5?-1:1)
		this.dir=this.vx<0?-1:1
		this.frame=0
		this.frameTime=0
		this.frameDur=8
		const modes=["glide","swoop","vertical","chaos"]
		this.flyMode=modes[Math.floor(Math.random()*modes.length)]
		this.flyAngle=0
		this.flyBaseY=null
		this.flyCenter=null
		this.flyRadius=80+Math.random()*40
		this.flyHoldUntil=0
		this.flyIdleOverlayTime=0
		this._setFlyFrame()
		this._lock(10000+Math.random()*1000)
		this.flyModeUntil = performance.now() + (30000 + Math.random()*150000)
	}

	_startFlyIdle(){
		this.state="flyIdle"
		this.vx=40*(this.dir||1)
		this.frame=0
		this.frameTime=0
		this.frameDur=10
		this._setFlyIdleFrame()
		this._lock(10000+Math.random()*4000)
	}

	_openMusicMenu(x,y){
		this._closeMenu()
		this._menuOpenedAt = performance.now()
		this._say("Bạn cần đề cử nhạc không?")
		const m=document.createElement("div")
		m.className="ctx " + (this.name==="Vuong" ? "vuong" : "ga")
		m.addEventListener("mousedown",e=>e.stopPropagation())
		m.addEventListener("touchstart",e=>{e.stopPropagation();e.preventDefault()},{passive:false})
		const add=(label,fn)=>{
			const b=document.createElement("button")
			b.textContent=label
			const run = e=>{ e.stopPropagation(); e.preventDefault(); fn() }
			b.addEventListener("pointerup", run, {passive:false})
			b.addEventListener("click", run, {passive:false})
			m.appendChild(b)
		}
		add("Cần",()=>{this._openSuggestMenu(x+8,y+8)})
		add("Không cần",()=>{this._openLinkMenu(x+8,y+8)})
		document.body.appendChild(m)
		this._menu=m
		this._placeMenu(m,x,y)
	}

	_openSuggestMenu(x,y){
		this._closeMenu()
		this._menuOpenedAt = performance.now()
		const m=document.createElement("div")
		m.className="ctx " + (this.name==="Vuong" ? "vuong" : "ga")
		m.addEventListener("mousedown",e=>e.stopPropagation())
		m.addEventListener("touchstart",e=>{e.stopPropagation();e.preventDefault()},{passive:false})
		const add=(label,fn)=>{
			const b=document.createElement("button")
			b.textContent=label
			const run = e=>{ e.stopPropagation(); e.preventDefault(); fn() }
			b.addEventListener("pointerup", run, {passive:false})
			b.addEventListener("click", run, {passive:false})
			m.appendChild(b)
		}
		add("Vinh Quang bất diệt",()=>{this._playYouTube("https://youtu.be/-e4fWUfYM6I"); this._closeMenu()})
		add("Vương Kiệt Hi - Cha ơi",()=>{this._playYouTube("https://youtu.be/QMx1oi13yJo"); this._closeMenu()})
		add("Lofi",()=>{this._playYouTube("https://youtu.be/ihrMnTN0VxU"); this._closeMenu()})
		add("Playlist Toàn chức",()=>{this._playYouTube("https://www.youtube.com/playlist?list=PLqdkd6nEzsKIoUpPyfrRfMOZqmSiW4zFj"); this._closeMenu()})
		document.body.appendChild(m)
		this._menu=m
		this._placeMenu(m,x,y)
	}

	_openLinkMenu(x,y){
		this._closeMenu()
		this._menuOpenedAt = performance.now()
		const m=document.createElement("div")
		m.className="ctx " + (this.name==="Vuong" ? "vuong" : "ga")
		m.addEventListener("mousedown",e=>e.stopPropagation())
		m.addEventListener("touchstart",e=>{e.stopPropagation();e.preventDefault()},{passive:false})
		const input=document.createElement("input")
		input.type="text"
		input.placeholder="Dán link YouTube/playlist"
		const ok=document.createElement("button")
		ok.textContent="Phát"
		ok.style.display="block"
		ok.onclick=()=>{ this._playYouTube(input.value); this._closeMenu() }
		m.appendChild(input)
		m.appendChild(ok)
		document.body.appendChild(m)
		this._menu=m
		this._placeMenu(m,x,y)
	}

	_startBounce(){
		this.state="bounce"
		this.vy=-260
		this.vx=this.speed*(Math.random()<0.5?-1:1)/2
		this.dir=this.vx<0?-1:1
		this.frame=0
		this.frameTime=0
		this.frameDur=0.2
		this._lock(this.name==="Ga"?4000:3000)
	}
	
	_startHopInPlace(){
		this.state="hopInPlace"
		this.vx=0
		this.vy=0
		this.frame=0
		this.frameTime=0
		this.frameDur=0.18
		this.hopBaseY=null
		this._lock(2500+Math.random()*2500)
	}

	_setHopInPlaceFrame(){
		const arr=this.actions.bounce||[]
		if(!arr.length)return
		this.frame=(this.frame+1)%arr.length
		this._loadImage(arr[this.frame])
	}

	_autoRandom(){
		if(this.dragging)return
		if(this.state!=="random")return
		if(performance.now()<this.nextStateAt)return
		if(this.name==="Vuong"){
			const p=Math.random()
			if(p<0.35)this._startWalk()
			else if(p<0.6)this._startFly()
			else if(p<0.8)this._startFlyIdle()
			else this._stopAll()
		}else if(this.name==="Ga"){
			const p=Math.random()
			if(p<0.35)this._startWalk()
			else if(p<0.55)this._startHopInPlace()
			else if(p<0.75)this._startBounce()
			else this._stopAll()
		}
	}

	_tick(ts){
		const dt=this._prev?((ts-this._prev)/1000):0
		this._prev=ts
		this.t+=dt
		if(!this.dragging){
			const r=this.node.getBoundingClientRect()
			if(this.state==="walk"){
				this.frameTime+=dt
				if(this.frameTime>=this.frameDur){
					this.frameTime=0
					this._setWalkFrame()
				}
				let x=r.left+this.vx*dt
				if(x<=0){x=0;this.vx=Math.abs(this.vx);this.dir=1}
				if(x+r.width>=innerWidth){x=innerWidth-r.width;this.vx=-Math.abs(this.vx);this.dir=-1}
				this._place(x,r.top)
				if(Math.random()<0.002)this._loadImage(this.idle)
			}
			else if(this.state==="spawnDrop"){
			  const r=this.node.getBoundingClientRect()
			  const floor=innerHeight - r.height
			  this.vy += this.gravity*dt
			  let y=r.top + this.vy*dt
			  if(y>=floor){ y=floor; this.vy=0; this.state="idle"; this._loadImage(this.idle) }
			  this._place(r.left, y)
			}
			else if(this.state==="fly"){
				if(this.circleUntil && performance.now()>this.circleUntil){
					this.flyMode=this.prevFlyMode||this.flyMode
					this.circleUntil=0
				}
				if(performance.now()>this.flyModeUntil){
					const modes=["glide","swoop","vertical","chaos"]
					this.prevFlyMode=this.flyMode
					this.flyMode=modes[Math.floor(Math.random()*modes.length)]
					this.flyModeUntil=performance.now()+(30000+Math.random()*150000)
					this.flyAngle=0
					this.flyBaseY=null
					this.flyCenter=null
				}else if(this.flyMode!=="circle" && !this.circleUntil && Math.random()<0.0008){
					this.prevFlyMode=this.flyMode
					this.flyMode="circle"
					this.flyAngle=0
					this.flyCenter={x:r.left+r.width/2,y:r.top+r.height/2}
					this.flyRadius=80+Math.random()*40
					this.circleUntil=performance.now()+2000+Math.random()*2500
				}
				this.frameTime+=dt
				if(this.frameTime>=this.frameDur){
					this.frameTime=0
					this._setFlyFrame()
				}
				let x=r.left+this.vx*dt
				let y=r.top
				if(this.flyMode==="glide"){
					if(this.flyBaseY==null)this.flyBaseY=r.top
					const amp=22,freq=2.0
					y=this.flyBaseY+Math.sin(this.t*freq)*amp
				}else if(this.flyMode==="swoop"){
					if(this.flyBaseY==null)this.flyBaseY=r.top
					const amp=140,freq=1.0
					y=this.flyBaseY+Math.sin(this.t*freq)*amp
				}else if(this.flyMode==="vertical"){
					if(this.flyBaseY==null)this.flyBaseY=r.top
					const amp=180,freq=1.4
					y=this.flyBaseY+Math.sin(this.t*freq)*amp
				}else if(this.flyMode==="circle"){
					if(!this.flyCenter)this.flyCenter={x:r.left+r.width/2,y:r.top+r.height/2}
					this.flyAngle+=(this.vx>0?1:-1)*dt*1.8
					x=this.flyCenter.x+this.flyRadius*Math.cos(this.flyAngle)-r.width/2
					y=this.flyCenter.y+this.flyRadius*Math.sin(this.flyAngle)-r.height/2
				}else if(this.flyMode==="chaos"){
					if(this.flyBaseY==null)this.flyBaseY=r.top
					const w1=1.1,w2=2.3,w3=3.5
					const A=120,B=70,C=40
					y=this.flyBaseY+Math.sin(this.t*w1)*A+Math.sin(this.t*w2)*B+Math.sin(this.t*w3)*C
					if(Math.random()<0.01)this.vx*=-1,this.dir*=-1
				}
				if(x<=0){x=0;this.vx=Math.abs(this.vx);this.dir=1}
				if(x+r.width>=innerWidth){x=innerWidth-r.width;this.vx=-Math.abs(this.vx);this.dir=-1}
				if(y<=0)y=0
				if(y+r.height>=innerHeight)y=innerHeight-r.height
				this._place(x,y)
				if(Math.random()<0.002)this._setFlyIdleFrame()
			}else if(this.state==="flyIdle"){
				this.frameTime+=dt
				if(this.frameTime>=this.frameDur){
					this.frameTime=0
					this._setFlyIdleFrame()
				}
				const r2=this.node.getBoundingClientRect()
				let x=r2.left+this.vx*dt
				let y=r2.top
				if(this._inFlyIdleOverlay()){
					if(this.flyBaseY==null)this.flyBaseY=r2.top
					const amp=6, freq=0.8
					y=this.flyBaseY+Math.sin(this.t*freq)*amp
				}else if(Math.random()<0.004){
					this.flyBaseY=null
					this._startFlyIdleOverlay(2000+Math.random()*2000)
				}
				if(x<=0){x=0;this.vx=Math.abs(this.vx);this.dir=1}
				if(x+r2.width>=innerWidth){x=innerWidth-r2.width;this.vx=-Math.abs(this.vx);this.dir=-1}
				if(y<=0)y=0
				if(y+r2.height>=innerHeight)y=innerHeight-r2.height
				this._place(x,y)
			}else if(this.state==="hopInPlace"){
				this.frameTime+=dt
				if(this.frameTime>=this.frameDur){
					this.frameTime=0
					this._setHopInPlaceFrame()
				}
				const r2=this.node.getBoundingClientRect()
				if(this.hopBaseY==null)this.hopBaseY=r2.top
				this._place(r2.left, this.hopBaseY)
			}else if(this.state==="bounce"){
				this.frameTime+=dt
				if(this.frameTime>=this.frameDur){
					this.frameTime=0
					this._setBounceFrame()
				}
				this.vy+=this.gravity*dt
				let x=r.left+this.vx*dt
				let y=r.top+this.vy*dt
				if(x<=0){x=0;this.vx=Math.abs(this.vx);this.dir=1}
				if(x+r.width>=innerWidth){x=innerWidth-r.width;this.vx=-Math.abs(this.vx);this.dir=-1}
				if(y+r.height>=innerHeight){
					y=innerHeight-r.height
					this.vy*=-0.4
					if(Math.abs(this.vy)<40)this._stopAll()
				}
				this._place(x,y)
			}else if(this.state==="random"){
				if(Math.random()<0.002)this._autoRandom()
			}
		}
		this._raf=requestAnimationFrame(t=>this._tick(t))
	}

	_setWalkFrame(){
		if(this.dir<0){
			const leftFrames=this.actions.walk.filter(f=>f.includes("left"))
			this.frame=(this.frame+1)%leftFrames.length
			this._loadImage(leftFrames[this.frame])
		}else{
			const rightFrames=this.actions.walk.filter(f=>f.includes("right"))
			this.frame=(this.frame+1)%rightFrames.length
			this._loadImage(rightFrames[this.frame])
		}
	}

	_setFlyFrame(){
		if(this.dir<0){
			this._loadImage(this.actions.fly.find(f=>f.includes("left")))
		}else{
			this._loadImage(this.actions.fly.find(f=>f.includes("right")))
		}
	}

	_setFlyIdleFrame(){
		this.frame=(this.frame+1)%2
		const idleFrames=this.actions.fly.filter(f=>f.includes("idle"))
		if(idleFrames.length>=2)this._loadImage(idleFrames[this.frame])
	}

	_setBounceFrame(){
		const arr=this.actions.bounce||[]
		if(!arr.length)return
		this.frame=(this.frame+1)%arr.length
		this._loadImage(arr[this.frame])
	}

	_loadImage(file){
		if(!file)return
		this.img.src=this.basePath+file
	}

	_place(x,y){
		this.node.style.left=x+"px"
		this.node.style.top=y+"px"
	}

	_clamp(v,a,b){
		return Math.max(a,Math.min(b,v))
	}
	
	_say(t){
		if(!t)return
		if(!this.bubble)return
		this.bubble.textContent=t
		this.bubble.classList.add("show")
		clearTimeout(this._sayT)
		this._sayT=setTimeout(()=>this.bubble.classList.remove("show"),2000)
	}

	_scheduleSpeech(){
		if(this.name==="Vuong"){
			if(!this.nextSpeakAt) this.nextSpeakAt=Date.now()+120*60*1000
			if(Date.now()>=this.nextSpeakAt){
				const h=new Date().getHours()
				let line="Chào bồ"
				if(h<11)line="Chào buổi sáng"
				else if(h<14)line="Chào buổi trưa"
				else if(h<18)line="Chào buổi chiều"
				else line="Chào buổi tối"
				this._say(line)
				this.nextSpeakAt=Date.now()+120*60*1000
			}
		}else if(this.name==="Ga"){
			if(!this.nextSpeakAt) this.nextSpeakAt=Date.now()+(10+Math.floor(Math.random()*21))*60*1000
			if(Date.now()>=this.nextSpeakAt){
				const lines=["Cục tác~","Pi pi~","Đi dạo không?","Ăn chưa?"]
				this._say(lines[Math.floor(Math.random()*lines.length)])
				this.nextSpeakAt=Date.now()+(10+Math.floor(Math.random()*21))*60*1000
			}
		}
	}

	_initSpeechTimer(){
		if(this._speechTimer)clearInterval(this._speechTimer)
		this._speechTimer=setInterval(()=>this._scheduleSpeech(),5000)
	}
	
	_playLocalMusic(src,lrc){
		if(!this.audio){
			this.audio=new Audio()
			this.audio.preload="auto"
			this.audio.addEventListener("ended",()=>{this._say("Hết bài rồi")})
		}
		this.audio.src=src
		this.audio.play().catch(()=>{})
		if(lrc) this._loadLRC(lrc)
		else this._clearLyrics()
	}

	async _loadLRC(url){
		try{
			const txt=await fetch(url).then(r=>r.text())
			this._lyrics=this._parseLRC(txt)
			if(this._lyTimer)clearInterval(this._lyTimer)
			this._lyTimer=setInterval(()=>this._tickLyrics(),200)
		}catch(e){
			this._clearLyrics()
		}
	}

	_clearLyrics(){
		this._lyrics=null
		if(this._lyTimer)clearInterval(this._lyTimer)
	}

	_parseLRC(txt){
		const lines=txt.split(/\r?\n/)
		const out=[]
		for(const line of lines){
			const m=[...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)]
			if(!m.length)continue
			const text=line.replace(/\[[^\]]+\]/g,"").trim()
			for(const t of m){
				const mm=parseInt(t[1],10)
				const ss=parseFloat(t[2])
				out.push({time:mm*60+ss,text})
			}
		}
		out.sort((a,b)=>a.time-b.time)
		return out
	}

	_tickLyrics(){
		if(!this.audio||!this._lyrics||!this._lyrics.length)return
		const t=this.audio.currentTime
		let i=0
		while(i<this._lyrics.length-1&&this._lyrics[i+1].time<=t)i++
		const line=this._lyrics[i]
		if(line && this._lastLyric!==i){
			this._lastLyric=i
			this._say(line.text)
		}
	}
	
	_playYouTube(raw){
		if(!raw)return
		const u=new URL(raw)
		let embed=""
		if(u.hostname.includes("youtu.be")){
			const id=u.pathname.slice(1)
			embed=`https://www.youtube.com/embed/${id}?autoplay=1`
		}else if(u.hostname.includes("youtube.com")){
			const id=u.searchParams.get("v")
			const list=u.searchParams.get("list")
			if(list && !id) embed=`https://www.youtube.com/embed/videoseries?list=${list}&autoplay=1`
			else if(id) embed=`https://www.youtube.com/embed/${id}?autoplay=1${list?`&list=${list}`:""}`
		}
		if(!embed)return
		if(!this._yt){
			this._yt=document.createElement("div")
			this._yt.id="yt-player"
			this._yt.innerHTML=`<iframe allow="autoplay" frameborder="0" allowfullscreen></iframe><button id="yt-close">×</button>`
			document.body.appendChild(this._yt)
			this._yt.querySelector("#yt-close").onclick=()=>{this._yt.remove();this._yt=null}
		}
		this._yt.querySelector("iframe").src=embed
	}

}
