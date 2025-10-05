class RadioDrama {
	constructor(opts){
		this.audioUrl=opts.audio
		this.scriptUrl=opts.script
		this.tickMs=200
		this._timer=0
		this._lines=[]
		this._activeIdxByActor=new Map()
		this._started=false
		this.actors={}
		this._actorIndex={}
		const srcActors=opts.actors||{}
		for(const k of Object.keys(srcActors)){
			this.actors[k]=srcActors[k]
			this._actorIndex[this._normName(k)]=srcActors[k]
		}
		this._styleIndex={}
		const styleToActor=opts.styleToActor||{"VKH":"Vuong","DVC":"Du"}
		for(const [sty,who] of Object.entries(styleToActor)){
			if(this.actors[who]) this._styleIndex[this._normName(sty)]=this.actors[who]
		}
		this.audio=new Audio()
		this.audio.preload="auto"
		this._sayFallback=(t,sty)=>this._showBackgroundLine(t,2500,sty)
		if(opts.autostartButton!==false)this._injectPlayButton()
	}

	async start(){
		if(this._started)return
		this._started=true
		const btn=document.getElementById("rd-play-btn")
		if(btn)btn.remove()
		await this._loadASS(this.scriptUrl)
		this.audio.src=this.audioUrl
		this._enableDebug()
		this._createMini()

		this.audio.addEventListener("loadedmetadata",()=>{
			const m=this._mini
			if(m){
				m.back.disabled=false
				m.fwd.disabled=false
				m.s.disabled=false
			}
		})

		this.audio.play().catch(()=>{})
		this._timer=setInterval(()=>this._tick(),this.tickMs)
	}

	stop(){
		if(this._timer)clearInterval(this._timer)
		this._timer=0
		try{this.audio.pause()}catch(e){}
	}

	async _loadASS(url){
		const txt=await fetch(url).then(r=>r.text())
		this._styleMap=this._parseStyles(txt)||{}
		this.lines=this._parseASS(txt)
		this._ix=0
	}

	_parseASS(assText){
		const lines=[]
		const toSec=(s)=>{
			const m=String(s||"").trim().match(/(\d+):(\d{2}):(\d{2})[.,](\d{2})/)
			if(!m)return 0
			const h=+m[1],mi=+m[2],se=+m[3],cs=+m[4]
			return h*3600+mi*60+se+cs/100
		}
		const cleanText=(t)=>{
			let x=String(t||"").replace(/\{[^}]*\}/g,"")
			x=x.replace(/\\N/g,"\n").replace(/\\n/g,"\n").replace(/\\h/g," ")
			return x.trim()
		}
		const splitDialogue=(row)=>{
			const head=row.slice(9).trim()
			let count=0,i=0,cut=-1
			for(;i<head.length;i++){
				if(head[i]===",")count++
				if(count===9){cut=i;break}
			}
			if(cut===-1)return null
			const meta=head.slice(0,cut).split(",")
			const text=head.slice(cut+1)
			return{meta,text}
		}
		const rows=assText.split(/\r?\n/)
		for(let r of rows){
			if(!r.startsWith("Dialogue:"))continue
			const pack=splitDialogue(r)
			if(!pack)continue
			const parts=pack.meta
			const textRaw=pack.text
			const layer=(parts[0]||"").trim()
			const start=toSec(parts[1]||"0:00:00.00")
			const end=toSec(parts[2]||"0:00:00.00")
			const style=(parts[3]||"").trim()
			const name=(parts[4]||"").trim()
			const effect=((parts[8]||"").trim()||"").toLowerCase()
			if(effect.startsWith("template")||effect.includes("code"))continue
			const text=cleanText(textRaw||"")
			if(!text)continue
			lines.push({layer,start,end,style,name,effect,text})
		}
		lines.sort((a,b)=>a.start-b.start||a.end-b.end)
		return lines
	}

	_parseTimeASS(t){
		const m=t.match(/(\d+):(\d{1,2}):(\d{1,2})(?:[.,](\d{1,3}))?/)
		if(!m)return NaN
		const h=parseInt(m[1],10)
		const mn=parseInt(m[2],10)
		const s=parseInt(m[3],10)
		const frac=m[4]?parseInt(m[4].padEnd(2,"0").slice(0,2),10):0
		return h*3600+mn*60+s+frac/100
	}

	_tick(){
		if(!this.audio)return
		const t=this.audio.currentTime||0
		while(this._ix>0&&this.lines[this._ix-1]&&this.lines[this._ix-1].end>t-0.001&&this.lines[this._ix-1].start>t)this._ix--
		while(this._ix<this.lines.length-1&&this.lines[this._ix]&&this.lines[this._ix].end<=t)this._ix++
		const actives=[]
		let i=this._ix
		while(i<this.lines.length&&this.lines[i].start<=t){
			if(this.lines[i].end>t)actives.push(this.lines[i])
			i++
		}
		if(actives.length===0){
			this._renderNone&&this._renderNone()
			return
		}
		const sayList=[]
		for(let L of actives){
			let actor=this._findActorByStyle&&this._findActorByStyle(L.style)
			if(!actor&&this._findActor)actor=this._findActor(L.name)
			const got=this._extractActions?this._extractActions(L.text):{plain:L.text,actions:[]}
			let plain=got.plain
			let actions=got.actions||[]
			if(!actor&&this._findActorFromTextPrefix){
				const tryA=this._findActorFromTextPrefix(plain)
				if(tryA){
					actor=tryA
					plain=this._stripSpeakerPrefix?this._stripSpeakerPrefix(plain):plain
				}
			}else if(actor){
				plain=this._stripSpeakerPrefix?this._stripSpeakerPrefix(plain):plain
			}
			if(!plain)continue
			sayList.push({actor,plain,actions,style:L.style})
		}
		if(sayList.length===0){
			this._renderNone&&this._renderNone()
			return
		}
		const mergedByKey=new Map()
		for(const s of sayList){
			const key=s.actor?(s.actor.id||s.actor.name||"@"):("_"+(s.style||"_"))
			if(!mergedByKey.has(key))mergedByKey.set(key,{actor:s.actor,text:s.plain,actions:[...s.actions],style:s.style})
			else{
				const cur=mergedByKey.get(key)
				cur.text=cur.text?(cur.text+"\n"+s.plain):s.plain
				if(s.actions&&s.actions.length)cur.actions.push(...s.actions)
			}
		}
		for(const[,v]of mergedByKey){
			if(v.actor&&v.actor._say)v.actor._say(v.text,v.actions)
			else if(this._sayFallback)this._sayFallback(v.text,v.style)
		}
	}

	_showBackgroundLine(text,durationMs=2500,styleName=""){
		if(!text)return
		const col=this._getStyleOutline(styleName)||""
		const bg=col?this._hexToRgba(col,0.5):"rgba(15,18,32,0.92)"
		let el=document.getElementById("bg-dialogue")
		if(!el){
			el=document.createElement("div")
			el.id="bg-dialogue"
			Object.assign(el.style,{
				position:"fixed",
				top:"20px",
				left:"50%",
				transform:"translateX(-50%)",
				color:"#e9edf7",
				padding:"10px 16px",
				borderRadius:"12px",
				font:"600 14px/1.4 ui-sans-serif,system-ui",
				textAlign:"center",
				maxWidth:"76vw",
				zIndex:999999,
				opacity:0,
				transition:"opacity .22s ease",
				whiteSpace:"pre-line",
				backdropFilter:"blur(2px)"
			})
			document.body.appendChild(el)
		}
		el.style.background=bg
		el.textContent=text
		el.style.opacity=1
		clearTimeout(this._bgT)
		this._bgT=setTimeout(()=>{el.style.opacity=0},durationMs)
	}

	_extractActions(text){
		const actions=[]
		let plain=text
		const re=/\[([a-z]+)(?::([^\]]+))?\]/gi
		plain=plain.replace(re,(_m,act,arg)=>{
			actions.push({act:(act||"").toLowerCase(),arg:arg?String(arg).trim():undefined})
			return""
		}).trim()
		return{plain,actions}
	}

	_runActions(actor,actions){
		for(const a of actions){
			switch(a.act){
				case"walk":actor._stopAll?.();actor._startWalk?.();break
				case"fly":actor._stopAll?.();actor._startFly?.();break
				case"flyidle":actor._stopAll?.();actor._startFlyIdle?.();break
				case"bounce":actor._stopAll?.();actor._startBounce?.();break
				case"hop":actor._stopAll?.();actor._startHopInPlace?.();break
				case"kiss":{const o=a.arg?this._findActor(a.arg):null;if(o&&actor.startKissWith)actor.startKissWith(o);break}
				case"broom":{const o=a.arg?this._findActor(a.arg):null;if(o&&actor.startBroomRideWith)actor.startBroomRideWith(o);break}
				case"img":{if(a.arg&&actor._loadImage)actor._loadImage(a.arg);break}
				default:break
			}
		}
	}

	_findActorByStyle(style){
		const k=this._normName(style)
		return this._styleIndex[k]||null
	}

	_findActor(name){
		if(!name)return null
		const key=this._normName(name)
		if(this._actorIndex[key])return this._actorIndex[key]
		for(const k of Object.keys(this._actorIndex)){
			if(key.includes(k)||k.includes(key))return this._actorIndex[k]
		}
		return null
	}

	_findActorFromTextPrefix(plain){
		const m=String(plain||"").match(/^\s*([^:：]{1,30})\s*[:：]\s*/u)
		return m?this._findActor(m[1]):null
	}

	_stripSpeakerPrefix(plain){
		const m=String(plain||"").match(/^\s*([^:：]{1,30})\s*[:：]\s*/u)
		return m?String(plain).slice(m[0].length).replace(/\n/g," ").trim():String(plain||"")
	}

	_normName(s){
		return String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim()
	}

	_beautifyText(t){
		if(!t)return t
		const open=' \t\n"“”«»()[]-—'
		let i=0
		while(i<t.length&&open.includes(t[i]))i++
		if(i>=t.length)return t
		const head=t.slice(0,i)
		const ch=t[i].toLocaleUpperCase('vi')
		return head+ch+t.slice(i+1)
	}

	_parseStyles(text){
		const styles={}
		let section=""
		const rows=text.split(/\r?\n/)
		for(const raw of rows){
			const l=raw.trim()
			if(l==="[V4+ Styles]"){section="styles";continue}
			if(/^\[Events\]/i.test(l))break
			if(section!=="styles")continue
			if(!l.startsWith("Style:"))continue
			const arr=l.replace(/^Style:\s*/,"").split(",")
			if(arr.length<7)continue
			const name=(arr[0]||"").trim()
			const pcol=(arr[3]||"").trim()
			const ocol=(arr[5]||"").trim()
			const primary=this._assColorToHex(pcol)
			const outline=this._assColorToHex(ocol)
			styles[name]={primary,outline}
		}
		return styles
	}

	_assColorToHex(s){
		const m=(s||"").match(/&H([0-9A-F]{6,8})/i)
		if(!m)return""
		const hex=m[1].toUpperCase()
		let bb,gg,rr
		if(hex.length===8){bb=hex.slice(2,4);gg=hex.slice(4,6);rr=hex.slice(6,8)}
		else{bb=hex.slice(0,2);gg=hex.slice(2,4);rr=hex.slice(4,6)}
		return"#"+rr+gg+bb
	}

	_guessByName(raw){
		const k=this._normName(raw)
		if(!window.Pet||!Pet.getByName)return null
		if(k==="vuong")return Pet.getByName("Vuong")
		if(k==="du")return Pet.getByName("Du")
		if(k==="ga")return Pet.getByName("Ga")
		return null
	}

	_hexToRgba(hex,alpha){
		const m=String(hex||"").match(/^#([0-9a-f]{6})$/i)
		if(!m)return""
		const n=parseInt(m[1],16)
		const r=(n>>16)&255,g=(n>>8)&255,b=n&255
		return"rgba("+r+","+g+","+b+","+(alpha==null?0.9:alpha)+")"
	}

	_getStyleOutline(sty){
		if(!sty)return""
		const s=this._styleMap[sty]
		return s?(s.outline||s.primary||""):""
	}

	_createMini(){
		let el=document.getElementById("dp-mini")
		if(!el){
			el=document.createElement("div")
			el.id="dp-mini"
			el.innerHTML=`
				<button type="button" id="dp-back">«10s</button>
				<button type="button" id="dp-play">▶</button>
				<button type="button" id="dp-fwd">+10s»</button>
				<span id="dp-cur">0:00</span>
				<input id="dp-seek" type="range" min="0" max="1" step="0.1" value="0" style="width:180px;vertical-align:middle;">
				<span id="dp-dur">0:00</span>
			`
			Object.assign(el.style,{
				position:"fixed",
				left:"50%",
				bottom:"calc(16px + env(safe-area-inset-bottom))",
				transform:"translateX(-50%)",
				background:"rgba(15,18,32,.92)",
				color:"#e9edf7",
				padding:"8px 10px",
				borderRadius:"12px",
				zIndex:2147483647,
				font:"600 13px/1.4 ui-sans-serif,system-ui",
				boxShadow:"0 8px 22px rgba(2,6,23,.4)"
			})
			document.body.appendChild(el)
		}
		const back=el.querySelector("#dp-back")
		const fwd=el.querySelector("#dp-fwd")
		const p=el.querySelector("#dp-play")
		const s=el.querySelector("#dp-seek")
		const L=el.querySelector("#dp-cur")
		const R=el.querySelector("#dp-dur")

		back.disabled=true
		fwd.disabled=true
		s.disabled=true

		if(el.dataset.bound!=="1"){
			const clamp=(v,min,max)=>Math.max(min,Math.min(max,v))
			const setT=(t)=>{
				const a=this.audio
				const dur=a.duration||0
				let start=0,end=dur
				if(dur===0){
					const sr=a.seekable
					if(sr&&sr.length){
						start=sr.start(0)
						end=sr.end(sr.length-1)
					}
				}
				if(!(end>start))return
				const clamped=Math.max(start,Math.min(end-0.05,Number(t)))
				a.currentTime=clamped
				this._tick()
				this._updateMini()
			}
			const jump=(delta)=>{
				const cur=this.audio.currentTime||0
				setT(cur+delta)
			}
			back.addEventListener("click",(e)=>{e.preventDefault();jump(-10)})
			fwd.addEventListener("click",(e)=>{e.preventDefault();jump(10)})
			const onSlide=()=>setT(Number(s.value)||0)
			p.addEventListener("click",(e)=>{e.preventDefault();if(this.audio.paused)this.audio.play().catch(()=>{});else this.audio.pause()})
			s.addEventListener("input",onSlide)
			s.addEventListener("change",onSlide)
			let holdTimer=null,wasPlaying=false
			const startHold=(dir)=>{
				const d=this.audio.duration
				if(!Number.isFinite(d)||d<=0)return
				wasPlaying=!this.audio.paused
				this.audio.pause()
				holdTimer=setInterval(()=>{jump(dir*3)},200)
			}
			const stopHold=()=>{
				if(holdTimer){clearInterval(holdTimer);holdTimer=null}
				if(wasPlaying)this.audio.play().catch(()=>{})
			}
			const bindHold=(btn,dir)=>{
				btn.addEventListener("pointerdown",(e)=>{e.preventDefault();btn.classList.add("active");startHold(dir)})
				btn.addEventListener("pointerup",(e)=>{e.preventDefault();btn.classList.remove("active");stopHold()})
				btn.addEventListener("pointerleave",(e)=>{e.preventDefault();btn.classList.remove("active");stopHold()})
				btn.addEventListener("pointercancel",(e)=>{e.preventDefault();btn.classList.remove("active");stopHold()})
			}
			bindHold(back,-1)
			bindHold(fwd,1)
			el.dataset.bound="1"
		}

		const onMeta=()=>{
			const ready=Number.isFinite(this.audio.duration)&&this.audio.duration>0
			back.disabled=!ready
			fwd.disabled=!ready
			s.disabled=!ready
			this._updateMini()
		}
		this.audio.addEventListener("loadedmetadata",onMeta)
		this.audio.addEventListener("durationchange",onMeta)

		this._mini={el,s,p,L,R,back,fwd}
		this._attachMini()
		this._updateMini()
	}
	_ranges(r){
		if(!r||!r.length)return"[]"
		let a=[]
		for(let i=0;i<r.length;i++)a.push([r.start(i).toFixed(3),r.end(i).toFixed(3)])
		return JSON.stringify(a)
	}
	_enableDebug(){
		const a=this.audio
		const log=(tag)=>()=>console.log(`[AUDIO:${tag}]`,{t:+(a.currentTime||0).toFixed(3),dur:+(a.duration||0).toFixed(3),rs:a.readyState,ns:a.networkState,seek:this._ranges(a.seekable),buf:this._ranges(a.buffered)})
		;["loadedmetadata","canplay","seeking","seeked","timeupdate","waiting","stalled","play","pause"].forEach(ev=>a.addEventListener(ev,log(ev)))
	}
	_attachMini(){
		if(!this.audio||!this._mini)return
		const h={
			time:()=>this._updateMini(),
			dur:()=>this._updateMini(),
			meta:()=>this._updateMini(),
			play:()=>{this._mini.p.textContent="⏸"},
			pause:()=>{this._mini.p.textContent="▶"}
		}
		this._h=h
		this.audio.addEventListener("timeupdate",h.time)
		this.audio.addEventListener("durationchange",h.dur)
		this.audio.addEventListener("loadedmetadata",h.meta)
		this.audio.addEventListener("play",h.play)
		this.audio.addEventListener("pause",h.pause)
	}

	_updateMini(){
		if(!this._mini||!this.audio)return
		const d=this.audio.duration||0
		const c=this.audio.currentTime||0
		if(isFinite(d)&&d>0){
			this._mini.s.max=d
			this._mini.s.value=c
		}
		this._mini.L.textContent=this._fmt(c)
		this._mini.R.textContent=this._fmt(d)
	}

	_fmt(s){
		if(!isFinite(s))return"0:00"
		s=Math.max(0,Math.floor(s))
		const m=Math.floor(s/60)
		const ss=s%60
		return m+":"+(ss<10?"0"+ss:ss)
	}
}

function startRadioDramaDemo(){
	if(window._radioDrama)return
	const actors={
		Vuong:(window.vuong||(window.Pet&&Pet.getByName&&Pet.getByName("Vuong"))),
		Du:(window.du||(window.Pet&&Pet.getByName&&Pet.getByName("Du"))),
		Ga:(window.ga||(window.Pet&&Pet.getByName&&Pet.getByName("Ga")))
	}
	const styleToActor={
		"VKH":"Vuong","Vương":"Vuong","Vương Kiệt Hi":"Vuong",
		"DVC":"Du","Dụ":"Du","Dụ Văn Châu":"Du"
	}
	const drama=new RadioDrama({
		audio:"pet/musics/ktt/ep1_ctl.mp3",
		script:"pet/musics/ktt/ep1_ctl.ass",
		actors,
		styleToActor,
		autostartButton:false
	})
	window._radioDrama=drama
}
document.addEventListener("DOMContentLoaded",startRadioDramaDemo)