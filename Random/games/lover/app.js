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
				subtitle:'Tay tồn thì có gì sai chứ? Anh vẫn dắt em chơi game được mà.'
			},
			{
				name:'Vương',
				keywords:['vương','quan hệ'],
				audio:'ywz/Vương.mp3',
				subtitle:'Quan hệ giữa tôi với Vương Kiệt Hi là gì hả? Bạn bè đó. Trên sân thi đấu là đối thủ, xuống sân là bạn bè thân.'
			}
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
	if(Date.now()<suppressDetectUntil) return null;
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
let suppressDetectUntil=0;
const COOLDOWN_MS=2000;
const GRACE_MS=1200;
const RESTART_DELAY_MS=800;

function canEchoUser(){
	return Date.now()>=suppressUserEchoUntil;
}

async function playResponse(item){
	if(playing) return;
	playing=true;
	lastTriggerAt=Date.now();
	if(recognizer){try{recognizer.stop();}catch(_){}}	
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
		suppressDetectUntil=Date.now()+1200;
		if(keepListening&&recognizer){
			setTimeout(()=>{try{recognizer.start();}catch(_){}},RESTART_DELAY_MS);
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
		if(Date.now()<suppressDetectUntil) return;
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
	if(window.GestureRecognizer){
		if(!gestureRecognizer) await initGesture();
		requestAnimationFrame(gestureLoop);
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
	if(key==='artem') hintBox.textContent='Từ gợi ý: "chào buổi sáng", "đi làm" hoặc 👍';
	else if(key==='ywz') hintBox.textContent='Từ gợi ý: "tay", "Vương" hoặc 👎';
	else hintBox.textContent='';
}
function setCharacterWithHint(key){
	currentCharacterKey=key;
	setHintForCharacter(key);
}

setCharacterWithHint(currentCharacterKey);
startCamera();

let gestureRecognizer=null;
let lastVideoTime=-1;
let gestureCooldownUntil=0;
let waveBuf=[];
let gestureCount={};
let gestureFrames=0;

async function initGesture(){
	if(!window.FilesetResolver||!window.GestureRecognizer) throw new Error('Vision bundle not ready');
	const vision=await window.FilesetResolver.forVisionTasks("https://unpkg.com/@mediapipe/tasks-vision@0.10.20/wasm");
	gestureRecognizer=await window.GestureRecognizer.createFromOptions(vision,{
		baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task'},
		runningMode:'VIDEO',
		numHands:2
	});
	console.log('GestureRecognizer initialized');
}

function isWaving(series){
	if(series.length<5) return false;
	const now=performance.now();
	const recent=series.filter(p=>now-p.t<1000);
	if(recent.length<5) return false;
	let dirs=[];
	for(let i=1;i<recent.length;i++){
		const dx=recent[i].x-recent[i-1].x;
		if(Math.abs(dx)>0.003) dirs.push(Math.sign(dx));
	}
	let flips=0;
	for(let i=1;i<dirs.length;i++){
		if(dirs[i]!==dirs[i-1]) flips++;
	}
	const xs=recent.map(p=>p.x);
	const range=Math.max(...xs)-Math.min(...xs);
	return flips>=2&&range>=0.08;
}

function handleGesture(g){
	console.log('handleGesture called:',g,'playing:',playing,'cooldown:',Date.now()<gestureCooldownUntil,'char:',currentCharacterKey);
	if(Date.now()<gestureCooldownUntil||playing) return;
	if(currentCharacterKey==='artem'&&g==='wave'){
		const item=getResponses().find(r=>r.name==='hello');
		console.log('Artem wave -> hello',item);
		if(item){
			gestureCooldownUntil=Date.now()+1800;
			playResponse(item);
		}
	}
	if(currentCharacterKey==='artem'&&g==='thumbs_up'){
		const item=getResponses().find(r=>r.name==='work');
		console.log('Artem thumbs_up -> work',item);
		if(item){
			gestureCooldownUntil=Date.now()+1800;
			playResponse(item);
		}
	}
	if(currentCharacterKey==='ywz'&&g==='thumbs_down'){
		const item=getResponses().find(r=>r.name==='tay');
		console.log('YWZ thumbs_down -> tay',item);
		if(item){
			gestureCooldownUntil=Date.now()+1800;
			playResponse(item);
		}
	}
}

async function gestureLoop(){
	if(!gestureRecognizer||!video.videoWidth){requestAnimationFrame(gestureLoop);return;}
	const ts=performance.now();
	if(lastVideoTime!==video.currentTime){
		const res=await gestureRecognizer.recognizeForVideo(video,ts);
		let detectedLabel=null;
		if(res.gestures&&res.gestures.length){
			console.log('Detected hands:',res.gestures.length);
			for(let h=0;h<res.gestures.length;h++){
				const gests=res.gestures[h];
				const lms=res.landmarks[h];
				if(!gests||!gests.length||!lms||lms.length<21) continue;
				const top=gests[0];
				console.log('Hand',h,'gesture:',top.categoryName,'score:',top.score.toFixed(2));
				if(top.categoryName==='Open_Palm'&&top.score>=0.55){
					const wrist=lms[0];
					waveBuf.push({t:ts,x:wrist.x});
					if(waveBuf.length>40) waveBuf.shift();
					if(isWaving(waveBuf)){
						detectedLabel='wave';
						console.log('Wave detected!');
						break;
					}
				}
				if(top.categoryName==='Thumb_Up'&&top.score>=0.5){
					detectedLabel='thumbs_up';
					console.log('Thumbs up detected!');
					break;
				}
				if(top.categoryName==='Thumb_Down'&&top.score>=0.5){
					detectedLabel='thumbs_down';
					console.log('Thumbs down detected!');
					break;
				}
			}
		}
		if(!res.gestures||!res.gestures.length){
			waveBuf=[];
		}
		if(detectedLabel){
			gestureCount[detectedLabel]=(gestureCount[detectedLabel]||0)+1;
		}
		gestureFrames++;
		if(gestureFrames>=4){
			let best=null,maxCount=0;
			for(const k in gestureCount){
				if(gestureCount[k]>maxCount){
					maxCount=gestureCount[k];
					best=k;
				}
			}
			if(best&&maxCount>=2){
				console.log('Triggering gesture:',best,'count:',maxCount);
				handleGesture(best);
			}
			gestureCount={};
			gestureFrames=0;
		}
		lastVideoTime=video.currentTime;
	}
	requestAnimationFrame(gestureLoop);
}