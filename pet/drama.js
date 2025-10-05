class RadioDrama {
	constructor(opts){
		this.audioUrl=opts.audio
		this.scriptUrl=opts.script
		this.series=(opts.series||"ctl")
		this.episode=(opts.episode||1)
		this.tickMs=200
		this._timer=0
		this._started=false
		this.actors={}
		this._actorIndex={}
		this._styleIndex={}
		this.bgAlpha=(opts&&typeof opts.bgAlpha==="number")?opts.bgAlpha:0.95
		this.audio=new Audio()
		this.audio.preload="auto"
		this._sayFallback=(t,sty)=>this._showBackgroundLine(t,2500,sty)
		this._initActors(opts.actors||{},opts.styleToActor)
		if(opts.autostartButton!==false)this._injectPlayButton()
	}

	_initActors(srcActors,styleToActor){
		for(const k of Object.keys(srcActors)){
			this.actors[k]=srcActors[k]
			this._actorIndex[this._normName(k)]=srcActors[k]
		}
		const map=styleToActor||{"VKH":"Vuong","Vương":"Vuong","Vương Kiệt Hi":"Vuong","DVC":"Du","Dụ":"Du","Dụ Văn Châu":"Du"}
		for(const [sty,who] of Object.entries(map)){
			const a=this._resolvePetByName(who)
			if(a){ this._styleIndex[this._normName(sty)]=a; this.actors[who]=a; this._actorIndex[this._normName(who)]=a }
		}
	}

	_resolvePetByName(name){
		if(!name)return null
		if(this.actors[name])return this.actors[name]
		if(window.Pet&&typeof Pet.getByName==="function"){
			const a=Pet.getByName(name)
			if(a){ this.actors[name]=a; this._actorIndex[this._normName(name)]=a; return a }
		}
		return null
	}

	async start(){
		if(this._started)return
		this._started=true
		const btn=document.getElementById("rd-play-btn")
		if(btn)btn.remove()
		await this._loadEpisode(this.series,this.episode)
		this._createMini()
		this.audio.play().catch(()=>{})
		this._timer=setInterval(()=>this._tick(),this.tickMs)
	}
		
	stop(){
		if(this._timer) clearInterval(this._timer);
		this._timer=0;
		try{ this.audio.pause() }catch(e){}
		try{ this.audio.src="" }catch(e){}

		if(this._bgT) { clearTimeout(this._bgT); this._bgT = null; }
		const bg = document.getElementById("bg-dialogue");
		if(bg) bg.remove();

		if(this._mini){
			if(this._h){
				this.audio.removeEventListener("timeupdate",this._h.time);
				this.audio.removeEventListener("durationchange",this._h.dur);
				this.audio.removeEventListener("loadedmetadata",this._h.meta);
				this.audio.removeEventListener("play",this._h.play);
				this.audio.removeEventListener("pause",this._h.pause);
			}
			this._mini.el && this._mini.el.remove();
			this._mini = null;
		}
		this._started=false;
	}
	
	async _loadEpisode(series,episode){
		this.series=series
		this.episode=episode
		const base="pet/musics/ktt/"
		const suf=series.toLowerCase()==="bd"?"bd":"ctl"
		const epStr="ep"+episode+"_"+suf
		const mp3=base+epStr+".mp3"
		const ass=base+epStr+".ass"
		const assTxt=await fetch(ass).then(r=>{if(!r.ok)throw new Error("ass");return r.text()}).catch(()=>null)
		if(!assTxt){ this._showBackgroundLine("Không tìm thấy tập "+episode.toString().trim().padStart(1,"0").replace(/^0+/,"")+" ("+suf.toUpperCase()+")",2400,""); return }
		this._styleMap=this._parseStyles(assTxt)||{}
		this.lines=this._parseASS(assTxt)
		this._ix=0
		this.audio.src=mp3
		this.audio.load()
		if(this._mini)this._updateHeader()
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

	_tick(){
		this._refreshActorHandles()
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
		if(!actives.length){return}
		const sayList=[]
		for(let L of actives){
			let actor=this._findActorByStyle(L.style)
			const got=this._extractActions(L.text)
			let plain=got.plain
			let actions=got.actions||[]
			if(actor){
				plain=this._stripSpeakerPrefix(plain)
			}else{
				const tryA=this._findActorFromTextPrefix(plain)
				if(tryA){ actor=tryA; plain=this._stripSpeakerPrefix(plain) }
			}
			if(!plain)continue
			sayList.push({actor,plain,actions,style:L.style})
		}
		const merged=new Map()
		for(const s of sayList){
			const key=s.actor?(s.actor.name||"@"):("_"+(s.style||"_"))
			if(!merged.has(key))merged.set(key,{actor:s.actor,text:s.plain,actions:[...s.actions],style:s.style})
			else{
				const cur=merged.get(key)
				cur.text=cur.text?(cur.text+"\n"+s.plain):s.plain
				if(s.actions&&s.actions.length)cur.actions.push(...s.actions)
			}
		}
		for(const[,v]of merged){
			if(v.actor)this._deliverToActor(v.actor,v.text,v.actions,v.style)
			else this._sayFallback(v.text,v.style)
		}
	}

	_refreshActorHandles(){
		const need=["Vuong","Du","Ga"]
		for(const n of need){
			if(!this.actors[n]) this._resolvePetByName(n)
		}
		for(const k of Object.keys(this._styleIndex)){
			const a=this._styleIndex[k]
			if(a&&a.name&&(a.name==="Vuong"||a.name==="Du"||a.name==="Ga")) continue
		}
	}

	_deliverToActor(actor,text,actions,style){
		const fns=["_say","say","speak","talk","bubbleSay","showSpeech"]
		let ok=false
		for(let i=0;i<fns.length;i++){
			const fn=fns[i]
			if(actor&&typeof actor[fn]==="function"){
				actor[fn](text)
				ok=true
				break
			}
		}
		if(actions&&actions.length)this._runActions(actor,actions)
		if(!ok)this._sayFallback(text,style)
	}

	_showBackgroundLine(text,durationMs=2500,styleName=""){
		if(!text)return
		const col=this._getStyleOutline(styleName)||""
		const bg=col?this._hexToRgba(col,this.bgAlpha):"rgba(15,18,32,"+this.bgAlpha+")"
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
		let a=this._styleIndex[k]||null
		if(!a){
			const guess=this._normName(style).includes("vkh")?"Vuong":(this._normName(style).includes("dvc")?"Du":null)
			if(guess)a=this._resolvePetByName(guess)
			if(a)this._styleIndex[k]=a
		}
		return a
	}

	_findActor(name){
		if(!name)return null
		const key=this._normName(name)
		if(this._actorIndex[key])return this._actorIndex[key]
		const a=this._resolvePetByName(name)
		if(a)return a
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

	_hexToRgba(hex,alpha){
		const m=String(hex||"").match(/^#([0-9a-f]{6})$/i)
		if(!m)return""
		const n=parseInt(m[1],16)
		const r=(n>>16)&255,g=(n>>8)&255,b=n&255
		return"rgba("+r+","+g+","+b+","+(alpha==null?0.95:alpha)+")"
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
				<div id="dp-top" style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
					<div id="dp-title" style="font:700 13px ui-sans-serif,system-ui;letter-spacing:.2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60vw;"></div>
					<div id="dp-series" style="display:flex;gap:6px;margin-left:auto;">
						<button type="button" id="dp-s-ctl" data-s="ctl">CTL</button>
						<button type="button" id="dp-s-bd" data-s="bd">BD</button>
						<div style="width:1px;height:18px;background:rgba(255,255,255,.12)"></div>
						<button type="button" id="dp-prev">◀</button>
						<span id="dp-ep" style="min-width:84px;text-align:center"></span>
						<button type="button" id="dp-next">▶</button>
					</div>
				</div>
				<div id="dp-row" style="display:flex;align-items:center;gap:8px;">
					<button type="button" id="dp-back">«10s</button>
					<button type="button" id="dp-play">▶</button>
					<button type="button" id="dp-fwd">+10s»</button>
					<span id="dp-cur">0:00</span>
					<input id="dp-seek" type="range" min="0" max="1" step="0.1" value="0" style="width:240px;vertical-align:middle;">
					<span id="dp-dur">0:00</span>
					<button type="button" id="dp-close" title="Đóng">✕</button>
				</div>
			`
			Object.assign(el.style,{
                position:"fixed",
                left:"50%",
                bottom:"calc(18px + env(safe-area-inset-bottom))",
                transform:"translateX(-50%)",
                background:"rgba(16,18,28,.92)",
                color:"#e9edf7",
                padding:"10px 12px",
                borderRadius:"14px",
                zIndex:2147483647,
                font:"600 13px/1.45 ui-sans-serif,system-ui",
                boxShadow:"0 10px 26px rgba(2,6,23,.45)",
				backdropFilter:"blur(6px)"
            })
			document.body.appendChild(el)
		}
		const back=el.querySelector("#dp-back")
		const fwd=el.querySelector("#dp-fwd")
		const p=el.querySelector("#dp-play")
		const s=el.querySelector("#dp-seek")
		const L=el.querySelector("#dp-cur")
		const R=el.querySelector("#dp-dur")
		const title=el.querySelector("#dp-title")
		const epLbl=el.querySelector("#dp-ep")
		const sCtl=el.querySelector("#dp-s-ctl")
		const sBd=el.querySelector("#dp-s-bd")
		const prev=el.querySelector("#dp-prev")
		const next=el.querySelector("#dp-next")
		const close=el.querySelector("#dp-close")
		for(const btn of el.querySelectorAll("button")){
			Object.assign(btn.style,{background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",color:"inherit",padding:"6px 10px",borderRadius:"10px",cursor:"pointer"})
		}
		back.disabled=true
		fwd.disabled=true
		s.disabled=true
		if(el.dataset.bound!=="1"){
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
			const setSeries=(skey)=>{
				if(this.series===skey)return
				this._loadEpisode(skey,1).then(()=>{ if(this.audio.paused){} else{ this.audio.play().catch(()=>{}) } })
				this._highlightSeries()
			}
			const incEp=(d)=>{
				const n=Math.max(1,(this.episode||1)+d)
				this._loadEpisode(this.series,n).then(()=>{ if(!this.audio.paused)this.audio.play().catch(()=>{}) })
			}
			sCtl.addEventListener("click",(e)=>{e.preventDefault();setSeries("ctl")})
			sBd.addEventListener("click",(e)=>{e.preventDefault();setSeries("bd")})
			prev.addEventListener("click",(e)=>{e.preventDefault();incEp(-1)})
			next.addEventListener("click",(e)=>{e.preventDefault();incEp(1)})
			close.addEventListener("click",(e)=>{e.preventDefault();this.stop()})
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
		this._mini={el,s,p,L,R,back,fwd,title,epLbl}
		this._attachMini()
		this._updateHeader()
		this._updateMini()
		this._highlightSeries()
	}

	_highlightSeries(){
		const ctl=document.getElementById("dp-s-ctl")
		const bd=document.getElementById("dp-s-bd")
		for(const b of [ctl,bd]){
			if(!b)continue
			b.style.opacity="0.65"
			b.style.borderColor="rgba(255,255,255,.14)"
		}
		const active=this.series==="bd"?bd:ctl
		if(active){
			active.style.opacity="1"
			active.style.borderColor="rgba(255,255,255,.35)"
		}
	}

	_updateHeader(){
		if(!this._mini)return
		const name=this.series==="bd"?"Breaking Dawn":"Clear to Land"
		this._mini.title.textContent=name
		this._mini.epLbl.textContent="Ep "+this.episode+" – "+(this.series==="bd"?"BD":"CTL")
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

	_injectPlayButton(){
		if(document.getElementById("rd-play-btn"))return
		const b=document.createElement("button")
		b.id="rd-play-btn"
		b.textContent="▶ Radio Drama"
		Object.assign(b.style,{position:"fixed",right:"16px",bottom:"16px",zIndex:2147483647})
		b.addEventListener("click",()=>this.start())
		document.body.appendChild(b)
	}
}

function ensureRadioDrama(){
	if(window._radioDrama) return window._radioDrama;
	const actors = {
		Vuong:(window.Pet&&Pet.getByName&&Pet.getByName("Vuong")),
		Du:(window.Pet&&Pet.getByName&&Pet.getByName("Du"))
	};
	const styleToActor = {
		"VKH":"Vuong","Vương":"Vuong","Vương Kiệt Hi":"Vuong",
		"DVC":"Du","Dụ":"Du","Dụ Văn Châu":"Du"
	};
	const drama = new RadioDrama({
		audio:"pet/musics/ktt/ep1_ctl.mp3",
		script:"pet/musics/ktt/ep1_ctl.ass",
		series:"ctl",
		episode:1,
		actors,
		styleToActor,
		bgAlpha:0.95,
		autostartButton:false     // Optional: hiện nút ▶ Radio Drama
	});
	window._radioDrama = drama;
	return drama;
}

window.startRadioDrama = function(){
	ensureRadioDrama().start();
};

document.addEventListener("DOMContentLoaded", ()=>{ ensureRadioDrama(); });
