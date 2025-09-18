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
		this._rndTimer=setInterval(()=>this._autoRandom(),1000)
	}

	_lock(ms){
		this.stateLockUntil=performance.now()+ms
		this.nextStateAt=this.stateLockUntil
	}

	_hide(){
		this.node.style.display="none"
		cancelAnimationFrame(this._raf)
		clearInterval(this._rndTimer)
	}

	_makeNode(){
		const el=document.createElement("div")
		el.className="pet"
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
		document.addEventListener("click",e=>{
			if(e.target.closest(".ctx"))return
			this._closeMenu()
		})
	}

	_openMenu(x,y){
		this._closeMenu()
		const m=document.createElement("div")
		m.className="ctx"
		m.style.left=x+"px"
		m.style.top=y+"px"
		const add=(label,fn)=>{
			const b=document.createElement("button")
			b.textContent=label
			b.onclick=()=>{fn();this._closeMenu()}
			m.appendChild(b)
		}
		if(this.name==="Vuong"){
			add("Đi bộ",()=>{this._stopAll();this._startWalk()})
			add("Đổi hướng đi",()=>{if(this.state==="walk"||this.state==="fly"){this.vx*=-1;this.dir*=-1}})
			add("Bay",()=>{this._stopAll();this._startFly()})
			add("Bay lững lờ",()=>{this._stopAll();this._startFlyIdle()})
			add("Random",()=>{this._stopAll();this._startRandom()})
			add("Ẩn",()=>{this._hide()})
		}else if(this.name==="Ga"){
			add("Đi bộ",()=>{this._stopAll();this._startWalk()})
			add("Nhún",()=>{this._stopAll();this._startBounce()})
			add("Ẩn",()=>{this._hide()})
		}
		document.body.appendChild(m)
		this._menu=m
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
		this.frameDur=0.5
		const modes=["glide","swoop","vertical","circle"]
		this.flyMode=modes[Math.floor(Math.random()*modes.length)]
		this.flyAngle=0
		this.flyBaseY=null
		this.flyCenter=null
		this.flyRadius=80+Math.random()*40
		this._lock(10000+Math.random()*10000)
	}

	_startFlyIdle(){
		this.state="flyIdle"
		this.frame=0
		this.frameTime=0
		this.frameDur=4.0
		this._lock(10000+Math.random()*4000)
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
			if(p<0.5)this._startWalk()
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
			}else if(this.state==="fly"){
				this.frameTime+=dt
				if(this.frameTime>=this.frameDur){
					this.frameTime=0
					this._setFlyFrame()
				}
				let x=r.left+this.vx*dt
				let y=r.top
				if(this.flyMode==="glide"){
					const amp=18, freq=2.2
					y=r.top+Math.sin(this.t*freq)*amp*dt
				}else if(this.flyMode==="swoop"){
					if(this.flyBaseY==null)this.flyBaseY=r.top
					const amp=120, freq=1.1
					y=this.flyBaseY+Math.sin(this.t*freq)*amp*dt*3
				}else if(this.flyMode==="vertical"){
					if(this.flyBaseY==null)this.flyBaseY=r.top
					const amp=160, freq=1.6
					y=this.flyBaseY+Math.sin(this.t*freq)*amp*dt*3.2
				}else if(this.flyMode==="circle"){
					if(!this.flyCenter)this.flyCenter={x:r.left+r.width/2,y:r.top+r.height/2}
					this.flyAngle+=(this.vx>0?1:-1)*dt*1.8
					x=this.flyCenter.x+this.flyRadius*Math.cos(this.flyAngle)-r.width/2
					y=this.flyCenter.y+this.flyRadius*Math.sin(this.flyAngle)-r.height/2
				}
				if(x<=0){x=0;this.vx=Math.abs(this.vx);this.dir=1}
				if(x+r.width>=innerWidth){x=innerWidth-r.width;this.vx=-Math.abs(this.vx);this.dir=-1}
				if(y<=0)y=0
				if(y+r.height>=innerHeight)y=innerHeight-r.height
				this._place(x,y)
				if(Math.random()<0.004)this._setFlyIdleFrame()
			}else if(this.state==="flyIdle"){
				this.frameTime+=dt
				if(this.frameTime>=this.frameDur){
					this.frameTime=0
					this._setFlyIdleFrame()
				}
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
}
