const video=document.getElementById('video');
const characterImg=document.getElementById('character');
const speechBox=document.getElementById('speech');
const btnStart=document.getElementById('btnStart');
const btnStop=document.getElementById('btnStop');
const btnTest=document.getElementById('btnTest');
const characterSelect=document.getElementById('characterSelect');

async function startCamera(){
	try{
		const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:false});
		video.srcObject=stream;
	}catch(err){
		showSpeech('Không bật được camera: '+(err.message||err),true);
	}
}

function showSpeech(text,isUser=false){
	if(isUser&&(!canEchoUser()||playing)) return;
	speechBox.textContent=text||'';
	if(!text){
		speechBox.style.display='none';
		return;
	}
	speechBox.style.display='block';
	speechBox.classList.toggle('speech--user',!!isUser);
	if(isUser) lastUserEcho=text;
}

function showCharacter(on){
	characterImg.style.display=on?'block':'none';
	video.style.display=on?'none':'block';
}

function normalizeNoAccent(s){
	return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
}

function imgCandidatesFromAudio(p){
	const base=p.replace(/\.[^/.]+$/,'');
	return [base+'.png',base+'.jpg',base+'.webp'];
}

function pickExistingImage(paths){
	return new Promise(res=>{
		let i=0;
		const probe=()=>{
			if(i>=paths.length){res(null);return;}
			const im=new Image();
			im.onload=()=>res(paths[i]);
			im.onerror=()=>{i++;probe();};
			im.src=paths[i];
		};
		probe();
	});
}

const CHARACTERS={
	artem:{
		label:'Artem',
		responses:[
			{
				name:'hello',
				keywords:['chao','chao buoi sang','buổi sáng','hello','xin chao','hi'],
				audio:'Artem/Hi.mp3',
				subtitle:'Chào buổi sáng, hôm nay em có đi làm không?'
			},
			{
				name:'work',
				keywords:['đi làm','di lam','di lam nhe','da co'],
				audio:'Artem/Go to work.mp3',
				subtitle:'Anh đang chuẩn bị đi làm. 10 phút nữa anh sẽ ghé, chúng ta đi làm cùng nhau nhé?'
			}
		]
	},
	ywz:{
		label:'Dụ Văn Châu',
		responses:[
			{
				name:'tay',
				keywords:['tay','slow hand'],
				audio:'ywz/Slow hand.mp3',
				subtitle:'Tay tàn thì có gì sai chứ? Anh vẫn dắt em chơi game được mà.'
			},
			{
				name:'Vương',
				keywords:['vương','quan hệ'],
				audio:'ywz/Vương.mp3',
				subtitle:'Quan hệ giữa tôi với Vương Kiệt Hi là gì hả? Bạn bè đó. Trên sân thi đấu là đối thủ, xuống sân là bạn bè thân.'
			},			
		]
	}
};

let currentCharacterKey='artem';
function setCharacter(key){
	currentCharacterKey=key;
	setHintForCharacter(key);
}
function getResponses(){
	return (CHARACTERS[currentCharacterKey]||CHARACTERS.artem).responses;
}

function findResponse(transcript){
	const raw=transcript.trim();
	const plain=normalizeNoAccent(raw);
	for(const item of getResponses()){
		for(const kw of item.keywords){
			const needle=normalizeNoAccent(kw);
			if(plain.includes(needle)) return {item,heard:raw};
		}
	}
	return null;
}

let playing=false;
let currentAudio=null;
let keepListening=false;
let recognizer=null;
let lastTriggerAt=0;
let suppressUserEchoUntil=0;
let lastUserEcho='';
const COOLDOWN_MS=1500;
const GRACE_MS=1200;

function canEchoUser(){
	return Date.now()>=suppressUserEchoUntil;
}

async function playResponse(item){
	if(playing) return;
	playing=true;
	const prevSrc=characterImg.src||'';
	const cand=imgCandidatesFromAudio(item.audio);
	const swap=await pickExistingImage(cand);
	if(swap) characterImg.src=swap;
	currentAudio=new Audio(item.audio);
	showCharacter(true);
	if(item.subtitle) showSpeech(item.subtitle,false);
	try{
		await currentAudio.play();
	}catch(e){
		showSpeech('Không phát được âm thanh. Hãy bấm một nút trước để cấp quyền âm thanh.',false);
	}
	currentAudio.onended=()=>{
		characterImg.src=prevSrc;
		showCharacter(false);
		showSpeech('');
		playing=false;
		currentAudio=null;
		suppressUserEchoUntil=Date.now()+GRACE_MS;
		if(keepListening&&recognizer){
			try{recognizer.start();}catch(_){}
		}
	};
}

const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;

function setupRecognizer(){
	if(!SpeechRecognition){
		showSpeech('Trình duyệt không hỗ trợ nhận diện giọng nói. Thử Chrome trên HTTPS.',true);
		return null;
	}
	const rec=new SpeechRecognition();
	rec.lang='vi-VN';
	rec.continuous=true;
	rec.interimResults=true;
	rec.maxAlternatives=1;
	rec.onresult=(evt)=>{
		let chunk='';
		for(let i=evt.resultIndex;i<evt.results.length;i++){
			const part=evt.results[i][0].transcript;
			chunk+=part;
			if(!evt.results[i].isFinal){
				const m=findResponse(chunk);
				if(m&&Date.now()-lastTriggerAt>COOLDOWN_MS&&!playing){
					lastTriggerAt=Date.now();
					try{rec.stop();}catch(_){}
					playResponse(m.item);
					return;
				}
			}
		}
		const finalTxt=chunk.trim();
		if(finalTxt){
			const m=findResponse(finalTxt);
			if(m&&Date.now()-lastTriggerAt>COOLDOWN_MS&&!playing){
				lastTriggerAt=Date.now();
				try{rec.stop();}catch(_){}
				playResponse(m.item);
			}else{
				if(finalTxt!==lastUserEcho) showSpeech('Bạn: '+finalTxt,true);
			}
		}
	};
	rec.onerror=(e)=>{
		showSpeech('Lỗi nhận diện: '+(e.error||e.message),true);
	};
	rec.onend=()=>{
		if(keepListening&&!playing){
			try{rec.start();}catch(_){}
		}
	};
	return rec;
}

btnStart.addEventListener('click',async()=>{
	if(!recognizer) recognizer=setupRecognizer();
	keepListening=true;
	await startCamera();
	if(recognizer){
		try{recognizer.start();}catch(_){}
		showSpeech('Đang lắng nghe…',false);
	}
	if(window.FilesetResolver&&window.HandLandmarker){
		if(!handLandmarker) await initHand();
		requestAnimationFrame(handLoop);
	}else{
		showSpeech('Không tải được nhận diện tay. Tiếp tục nghe giọng nói.',true);
	}
});

btnStop.addEventListener('click',()=>{
	keepListening=false;
	if(recognizer){
		try{recognizer.stop();}catch(_){}
	}
	showSpeech('Đã dừng nghe.',false);
});

btnTest.addEventListener('click',()=>{
	const list=getResponses();
	if(list&&list.length){
		playResponse(list[0]);
	}
});

characterSelect.addEventListener('change',(e)=>{
	setCharacterWithHint(e.target.value);
	showSpeech('Đã chọn '+(CHARACTERS[e.target.value]?.label||'nhân vật'),false);
});

let hintBox=document.getElementById('hint')||(()=>{const n=document.createElement('div');n.id='hint';n.className='hint';document.body.appendChild(n);return n;})();
function setHintForCharacter(key){
	if(key==='artem') hintBox.textContent='Từ gợi ý: "xin chào", "đi làm", "dạ có"';
	else if(key==='ywz') hintBox.textContent='Từ gợi ý: "tay", "Vương"';
	else hintBox.textContent='';
}
function setCharacterWithHint(key){
	currentCharacterKey=key;
	setHintForCharacter(key);
}

setCharacterWithHint(currentCharacterKey);
startCamera();

let handLandmarker=null;
let lastVideoTime=-1;
let prevWrist=null;
let lastTs=0;
let gestureCooldownUntil=0;

async function initHand(){
	if(!window.FilesetResolver||!window.HandLandmarker) throw new Error('Vision bundle not ready');
	const vision = await window.FilesetResolver.forVisionTasks("https://unpkg.com/@mediapipe/tasks-vision@0.10.20/wasm");
	handLandmarker=await window.HandLandmarker.createFromOptions(vision,{
		baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-tasks/hand_landmarker/hand_landmarker.task'},
		runningMode:'VIDEO',
		numHands:2
	});
}

function avgSpeed(pPrev,pNow,dt){
	if(!pPrev||!pNow||dt<=0) return 0;
	const dx=pNow.x-pPrev.x,dy=pNow.y-pPrev.y;
	return Math.sqrt(dx*dx+dy*dy)/dt;
}

function isThumbDownFist(lm){
	if(!lm||lm.length<21) return false;
	const wrist=lm[0];
	const tips=[lm[8],lm[12],lm[16],lm[20]];
	let spread=0;
	for(const t of tips){const dx=t.x-wrist.x,dy=t.y-wrist.y;spread+=Math.sqrt(dx*dx+dy*dy);}
	spread/=4;
	const thumbTip=lm[4];
	const thumbDown=thumbTip.y>wrist.y+0.04;
	return spread<0.18&&thumbDown;
}

function handleGesture(g){
	if(Date.now()<gestureCooldownUntil||playing) return;
	if(currentCharacterKey==='artem'&&g==='wave'){
		const item=getResponses().find(r=>normalizeNoAccent(r.name)==='hello');
		if(item){gestureCooldownUntil=Date.now()+1500;playResponse(item);}
	}
	if(currentCharacterKey==='ywz'&&g==='thumbs_down_fist'){
		const item=getResponses().find(r=>normalizeNoAccent(r.name)==='tay');
		if(item){gestureCooldownUntil=Date.now()+1500;playResponse(item);}
	}
}

async function handLoop(){
	if(!handLandmarker||!video.videoWidth){requestAnimationFrame(handLoop);return;}
	const ts=performance.now();
	if(lastVideoTime!==video.currentTime){
		const res=await handLandmarker.detectForVideo(video,ts);
		if(res.landmarks&&res.landmarks[0]){
			const lm=res.landmarks[0];
			const wrist=lm[0];
			const dt=(ts-lastTs)/1000;
			const v=avgSpeed(prevWrist,wrist,dt);
			prevWrist={x:wrist.x,y:wrist.y};
			lastTs=ts;
			if(v>0.008) handleGesture('wave');
			else if(isThumbDownFist(lm)) handleGesture('thumbs_down_fist');
		}
		lastVideoTime=video.currentTime;
	}
	requestAnimationFrame(handLoop);
}
