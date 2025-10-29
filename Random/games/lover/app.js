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

const CHARACTERS={
	artem:{
		label:'Artem',
		image:'artem.png',
		responses:[
			{
				name:'hello',
				keywords:['chao', 'chao buoi sang'],
				audio:'Artem/Hi.mp3',
				subtitle:'Chào buổi sáng, hôm nay em có đi làm không?'
			},
			{
				name:'work',
				keywords:['đi làm','di lam','di lam nhe', 'da co'],
				audio:'Artem/Go to work.mp3',
				subtitle:'Anh đang chuẩn bị đi làm. 10 phút nữa anh sẽ ghé, chúng ta đi làm cùng nhau nhé?'
			}
		]
	},
	ywz:{
		label:'Dụ Văn Châu',
		image:'ywz.jpg',
		responses:[
			{
				name:'tay',
				keywords:['tay','slow hand'],
				audio:'ywz/Slow hand.mp3',
				subtitle:'Tay tàn thì có gì sai chứ? Anh vẫn dắt em chơi game được mà.'
			}
		]
	}
};

let currentCharacterKey='artem';
function setCharacter(key){
	const cfg=CHARACTERS[key]||CHARACTERS.artem;
	currentCharacterKey=key;
	characterImg.src=cfg.image;
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
	currentAudio=new Audio(item.audio);
	showCharacter(true);
	if(item.subtitle) showSpeech(item.subtitle,false);
	try{
		await currentAudio.play();
	}catch(e){
		showSpeech('Không phát được âm thanh. Hãy bấm một nút trước để cấp quyền âm thanh.',false);
	}
	currentAudio.onended=()=>{
		showCharacter(false);
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
	setCharacter(e.target.value);
	showSpeech('Đã chọn '+(CHARACTERS[e.target.value]?.label||'nhân vật'),false);
});

let hintBox=document.getElementById('hint')||(()=>{const n=document.createElement('div');n.id='hint';n.className='hint';document.body.appendChild(n);return n;})();
function setHintForCharacter(key){
	if(key==='artem') hintBox.textContent='Từ gợi ý: "xin chào", "đi làm", "dạ có"';
	else if(key==='ywz') hintBox.textContent='Từ gợi ý: "tay"';
	else hintBox.textContent='';
}
function setCharacter(key){
	const cfg=CHARACTERS[key]||CHARACTERS.artem;
	currentCharacterKey=key;
	characterImg.src=cfg.image;
	setHintForCharacter(key);
}

setCharacter(currentCharacterKey);
startCamera();
