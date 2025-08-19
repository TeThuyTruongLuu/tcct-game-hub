const canvas=document.getElementById('game')
const ctx=canvas.getContext('2d')
const W=canvas.width,H=canvas.height
ctx.imageSmoothingEnabled=true
const SCALE=1.5
const PLAYER_H=Math.round(48*SCALE)
const OBST_H=Math.round(46*SCALE)

const ui={
  score:document.getElementById('score'),
  best:document.getElementById('best'),
  previews:{
    player:document.getElementById('preview-player'),
    gain:document.getElementById('preview-gain'),
    lose:document.getElementById('preview-lose'),
    support:[
      document.getElementById('preview-support-0'),
      document.getElementById('preview-support-1'),
      document.getElementById('preview-support-2')
    ]
  }
}

const ASSETS={
  player:['player/1.png','player/2.png','player/3.png','player/4.png','player/5.png','player/6.png','player/7.png'],
  gain:['gain/1.png','gain/2.png','gain/3.png','gain/4.png','gain/5.png','gain/6.png','gain/7.png'],
  lose:['lose/1.png','lose/2.png','lose/3.png','lose/4.png','lose/5.png','lose/6.png','lose/7.png'],
  support:['support/1.png','support/2.png','support/3.png']
}

const indices={player:0,gain:0,lose:0,support:[0,0,0]}

function makeSprite(path,targetH){
  const img=loadImage(path)
  const sp={img,w:targetH,h:targetH}
  img.onload=()=>{const r=img.width/img.height;sp.w=Math.round(targetH*r)}
  return sp
}

function loadImage(path){const img=new Image();img.src='assets/'+path;return img}
function setPreview(type,path,i=0){
  const img=loadImage(path)
  if(type==='player'){ui.previews.player.src=img.src}
  if(type==='gain'){ui.previews.gain.src=img.src}
  if(type==='lose'){ui.previews.lose.src=img.src}
  if(type==='support'){ui.previews.support[i].src=img.src}
}

const spinning={player:false,gain:false,lose:false,support:[false,false,false]}

function updatePreview(type,delta,i=0){
  if(type==='player'){
    indices.player=(indices.player+delta+ASSETS.player.length)%ASSETS.player.length
    setPreview('player',ASSETS.player[indices.player])
    player.sp=makeSprite(ASSETS.player[indices.player],PLAYER_H)
  }
  if(type==='gain'){
    indices.gain=(indices.gain+delta+ASSETS.gain.length)%ASSETS.gain.length
    setPreview('gain',ASSETS.gain[indices.gain])
  }
  if(type==='lose'){
    indices.lose=(indices.lose+delta+ASSETS.lose.length)%ASSETS.lose.length
    setPreview('lose',ASSETS.lose[indices.lose])
  }
  if(type==='support'){
    indices.support[i]=(indices.support[i]+delta+ASSETS.support.length)%ASSETS.support.length
    setPreview('support',ASSETS.support[indices.support[i]],i)
  }
}

function spinListDirect(list,setter,el,lock){
  if(lock.flag)return
  lock.flag=true
  let t=0,delay=60,steps=12+Math.floor(Math.random()*12)
  const final=Math.floor(Math.random()*list.length)
  el.classList.add('spin')
  function tick(){
    const idx=t%list.length;setter(idx)
    t++
    if(t<steps){setTimeout(tick,delay);delay+=25}
    else{setter(final);el.classList.remove('spin');lock.flag=false}
  }
  tick()
}
function setIndex(type,idx,i=0){
  if(type==='player'){indices.player=idx;setPreview('player',ASSETS.player[idx]);player.sp=makeSprite(ASSETS.player[idx],PLAYER_H);if(!running)renderIdle()}
  if(type==='gain'){indices.gain=idx;setPreview('gain',ASSETS.gain[idx])}
  if(type==='lose'){indices.lose=idx;setPreview('lose',ASSETS.lose[idx])}
  if(type==='support'){indices.support[i]=idx;setPreview('support',ASSETS.support[idx],i)}
}
function spin(type){
  if(type==='player')return spinListDirect(ASSETS.player,i=>setIndex('player',i),ui.previews.player,spinning.player={flag:spinning.player.flag||false})
  if(type==='gain')return spinListDirect(ASSETS.gain,i=>setIndex('gain',i),ui.previews.gain,spinning.gain={flag:spinning.gain.flag||false})
  if(type==='lose')return spinListDirect(ASSETS.lose,i=>setIndex('lose',i),ui.previews.lose,spinning.lose={flag:spinning.lose.flag||false})
  if(type.startsWith('support')){
    const k=Number(type.split('-')[1])
    spinning.support[k]=spinning.support[k]||{flag:false}
    return spinListDirect(ASSETS.support,i=>setIndex('support',i,k),ui.previews.support[k],spinning.support[k])
  }
}

document.querySelectorAll('[data-prev]').forEach(btn=>{
  btn.addEventListener('click',()=>{const t=btn.getAttribute('data-prev');if(t.includes('support'))updatePreview('support',-1,Number(t.split('-')[1]));else updatePreview(t,-1)})
})
document.querySelectorAll('[data-next]').forEach(btn=>{
  btn.addEventListener('click',()=>{const t=btn.getAttribute('data-next');if(t.includes('support'))updatePreview('support',1,Number(t.split('-')[1]));else updatePreview(t,1)})
})
document.querySelectorAll('[data-spin]').forEach(btn=>{
  btn.addEventListener('click',()=>{spin(btn.getAttribute('data-spin'))})
})
document.getElementById('btn-spin-all').addEventListener('click',()=>{spin('player');setTimeout(()=>spin('gain'),100);setTimeout(()=>spin('lose'),200);setTimeout(()=>spin('support-0'),300);setTimeout(()=>spin('support-1'),400);setTimeout(()=>spin('support-2'),500)})

setPreview('player',ASSETS.player[0])
setPreview('gain',ASSETS.gain[0])
setPreview('lose',ASSETS.lose[0])
setPreview('support',ASSETS.support[0],0)
setPreview('support',ASSETS.support[1],1)
setPreview('support',ASSETS.support[2],2)

let running=false,score=0,best=0
let player={x:50,y:H-10,w:40,h:40,vy:0,onGround:true,sp:makeSprite(ASSETS.player[indices.player],PLAYER_H)}
let obstacles=[],gains=[]
const gravity=0.7, jump=-16
let startTime=0
let prev=performance.now()

let spawnTimer=0
function getMinGapSec(sec){
  if(sec>=300)return 0.85
  if(sec>=120)return 1.0
  return 1.2
}

function getSpeedSec(sec){
  if(sec>=300)return 5
  if(sec>=120)return 3.4
  return 2.9
}

let nextSpawnSec=0
function scheduleNextSpawn(sec){
  const min=getMinGapSec(sec)
  const extra=1.2
  nextSpawnSec=sec+min+Math.random()*extra
}

function startGame(){
  resetState()
  running=true
  loop()
}

function loop(){
  if(!running)return
  const now=performance.now()
  const dt=(now-prev)/1000
  prev=now
  const sec=(now-startTime)/1000
  const speed=getSpeedSec(sec)

  ctx.clearRect(0,0,W,H)
  drawBackground(sec,speed,dt)

  player.vy+=gravity
  player.y+=player.vy
  if(player.y>H-10){player.y=H-10;player.vy=0;player.onGround=true}

  ctx.drawImage(player.sp.img,player.x,player.y-player.sp.h,player.sp.w,player.sp.h)

  if(sec>=nextSpawnSec){
    obstacles.push({x:W,y:H-10,sp:makeSprite(ASSETS.lose[indices.lose],OBST_H)})
    scheduleNextSpawn(sec)
  }

  obstacles.forEach(o=>{o.x-=speed;ctx.drawImage(o.sp.img,o.x,o.y-o.sp.h,o.sp.w,o.sp.h)})
  obstacles=obstacles.filter(o=>o.x+o.sp.w>0)

  if(!lofi && obstacles.some(o=>collideRect(player,o))){gameOver();return}

  if(!lofi){score=Math.floor(sec);ui.score.textContent=score}else{ui.score.textContent='—'}

  requestAnimationFrame(loop)
}

function collideRect(a,b){
  const m=12
  const ax=a.x+m, ay=a.y-a.sp.h+m, aw=a.sp.w-2*m, ah=a.sp.h-2*m
  const bx=b.x+m, by=b.y-b.sp.h+m, bw=b.sp.w-2*m, bh=b.sp.h-2*m
  return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by
}

let groundOff=0,bgOff=0,cloudOff=0
function drawBackground(sec,speed,dt){
  const p=sec%180
  let sky='#eef7ff', tag='Sáng'
  if(p>60&&p<=120){sky='#fdebd2';tag='Chiều'}
  if(p>120){sky='#dfe7f2';tag='Tối'}
  document.getElementById('badge-bg').textContent=tag
  ctx.fillStyle=sky
  ctx.fillRect(0,0,W,H)
  const horizon=H-28
  bgOff+=(speed*0.3)
  cloudOff+=(speed*0.15)
  ctx.fillStyle='rgba(0,0,0,0.05)'
  for(let i=0;i<4;i++){
    const x=((i*260)- (bgOff%260))
    ctx.fillRect(x,horizon-40,220,22)
  }
  ctx.fillStyle='rgba(0,0,0,0.08)'
  for(let i=0;i<6;i++){
    const x=((i*180)- (cloudOff%180))
    ctx.fillRect(x,30+((i%2)*10),60,8)
  }
  groundOff=(groundOff+speed*2)%40
  ctx.fillStyle='#3b3b3b'
  ctx.fillRect(0,horizon,W,H-horizon)
  ctx.fillStyle='#f5f5f5'
  for(let i=-1;i<Math.ceil(W/40)+1;i++){
    const x=i*40-groundOff
    ctx.fillRect(x,horizon+10,20,3)
  }
}

function renderIdle(){
  ctx.clearRect(0,0,W,H)
  drawBackground(0,0,0)
  ctx.drawImage(player.sp.img,player.x,(H-10)-player.sp.h,player.sp.w,player.sp.h)
}

function resetState(){
  score=0
  ui.score.textContent=0
  obstacles=[]
  gains=[]
  player.y=H-10;player.vy=0;player.onGround=true
  spawnTimer=0
  nextSpawnSec=0
  groundOff=0;bgOff=0;cloudOff=0
  prev=performance.now()
  startTime=performance.now()
  scheduleNextSpawn(0)
}

function gameOver(){
  if(lofi)return
  running=false
  if(score>best)best=score
  ui.best.textContent=best
  renderIdle()
}

const badgeLofi=document.getElementById('badge-lofi')
let lofi=false,lCount=0


document.addEventListener('keydown',e=>{
  if(e.code==='Space'){
    if(!running)startGame()
    else if(player.onGround){player.vy=jump;player.onGround=false}
  }
  if(e.code==='KeyL'){
    lCount++
    if(lCount>=3){lofi=true;badgeLofi.classList.remove('hidden')}
  }
  if(e.code==='KeyX'){
    lofi=false
    lCount=0
    badgeLofi.classList.add('hidden')
  }
})

document.getElementById('btn-start').addEventListener('click',()=>{if(!running)startGame()})
document.getElementById('btn-reset').addEventListener('click',()=>{
  running=false
  ui.score.textContent=0
})
