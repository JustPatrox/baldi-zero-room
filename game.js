/* Aula Cero raycaster. Original Classic assets are bundled locally in assets/. */
(()=>{'use strict';
const $=id=>document.getElementById(id),canvas=$('game'),ctx=canvas.getContext('2d',{alpha:false});
let W=640,H=360,zbuf,background,bgData,viewAspect=innerWidth/Math.max(1,innerHeight);
const metrics={renders:0,renderMs:0,fps:0};
const defaults={volume:65,ambience:45,sensitivity:1,graphics:'standard',reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,muted:false};
function readStore(key){try{const value=JSON.parse(localStorage.getItem(key)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{};}catch(e){return {};}}
const stored=readStore('aula-cero-settings');
const options={...defaults,...stored};
options.reducedMotion=typeof options.reducedMotion==='boolean'?options.reducedMotion:defaults.reducedMotion;
options.ambience=AulaEngine.clamp(Number(options.ambience)||0,0,100);
options.volume=AulaEngine.clamp(Number(options.volume)||0,0,100);options.sensitivity=AulaEngine.clamp(Number(options.sensitivity)||1,.5,2);
if(!['low','standard','high'].includes(options.graphics))options.graphics='standard';
function resizeRenderer(){W={low:480,standard:640,high:800}[options.graphics];H=Math.round(W*9/16/2)*2;canvas.width=W;canvas.height=H;ctx.imageSmoothingEnabled=false;zbuf=new Float32Array(W);background=ctx.createImageData(W,H);bgData=new Uint32Array(background.data.buffer);forceRender=true;}
let forceRender=true;resizeRenderer();
let game=new AulaEngine.Game(),mode='menu',keys={},muted=!!options.muted,mapVisible=false,last=0,step=0,slap=0,toastTime=0,currentNote=null,lookX=0,session=0;
const screens=['menu','helpScreen','puzzle','loreScreen','pause','ending','settingsScreen','journalScreen','jumpscare'];
const lore=[
 ['El pupitre vacío','El registro de 1999 tiene treinta nombres. En la fotografía hay treinta y un pupitres. Alguien ha raspado el último rostro con una regla. Bajo el papel lees una frase: «Si nadie me recuerda, la escuela podrá olvidarme».'],
 ['La primera equivocación','La letra del alumno cambia a mitad de página. «Saqué un diez. Mi madre dejó de reconocerme. Saqué otro diez. Mi casa desapareció». En el margen, Baldi ha escrito con tinta roja: «Mañana debes fallar».'],
 ['Un profesor que escucha','El timbre nunca anuncia el recreo. Su frecuencia interrumpe el mecanismo del Aula Cero. Baldi lleva años golpeando su regla para tapar la voz que pide respuestas perfectas desde debajo del suelo.'],
 ['La lista de ausentes','No te habías olvidado un cuaderno. Volviste porque tu nombre estaba desapareciendo. Dos errores rompen el sello del Aula Cero. Cinco recuerdos permiten regresar a casa. Ahora sabes por qué Baldi no quiere dejarte solo.'],
 ['El último alumno','Tu nombre ocupa la línea cero. El colegio se alimenta de alumnos perfectos; cada error devuelve un recuerdo que no puede digerir. Puedes huir por la salida, o llevar los cinco recuerdos al Aula Cero y terminar la clase para todos.']
];
const problems=[['7 + 8',15],['18 − 9',9],['6 × 4',24],['35 ÷ 5',7],['12 + 19',31]];
function makeCanvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);return c;}
function text(g,str,x,y,size,color='#182018'){g.fillStyle=color;g.font='bold '+size+'px monospace';g.textAlign='center';g.fillText(str,x,y);}
const wallTextures=Array.from({length:6},(_,i)=>makeCanvas(64,64,g=>{
 g.fillStyle=['#c7c9b5','#c4c6ae','#bfc5ad','#9ba494','#aab39a','#c0c4a9'][i];g.fillRect(0,0,64,64);
 for(let y=0;y<64;y+=16){g.fillStyle='#7e897455';g.fillRect(0,y,64,1);for(let x=(y%32?0:-16);x<64;x+=32)g.fillRect(x,y,1,16);}
 let seed=123+i*91;for(let j=0;j<300;j++){seed=(seed*16807)%2147483647;const x=seed%64;seed=(seed*16807)%2147483647;const y=seed%64;g.fillStyle=j%2?'#ffffff0d':'#0000000c';g.fillRect(x,y,1,1);}
 g.fillStyle='#49663e';g.fillRect(0,44,64,20);g.fillStyle='#28432d';g.fillRect(0,43,64,2);g.fillRect(0,61,64,3);
 if(i===1){g.fillStyle='#dad6b6';g.fillRect(14,9,36,26);g.strokeStyle='#645e45';g.strokeRect(14,9,36,26);text(g,'APRENDE',32,18,6);text(g,'2 + 2 = 4',32,29,5);}
 if(i===2){g.fillStyle='#164b35';g.fillRect(5,9,54,28);g.strokeStyle='#8a734d';g.lineWidth=3;g.strokeRect(5,9,54,28);text(g,'NO OLVIDES',32,20,6,'#d6e1b9');text(g,'TU NOMBRE',32,30,6,'#d6e1b9');}
 if(i===4){g.fillStyle='#978d65';g.fillRect(19,7,28,54);g.fillStyle='#b5ab7b';g.fillRect(21,9,24,49);g.fillStyle='#354b35';g.fillRect(25,13,16,13);g.fillStyle='#c5b257';g.fillRect(39,37,3,3);text(g,'1999',33,24,5,'#eee9cf');}
}));
const sprites={};
sprites.baldi=makeCanvas(106,256,()=>{});
sprites.notebook=makeCanvas(64,80,g=>{g.shadowColor='#cce96e';g.shadowBlur=10;g.fillStyle='#d8ea81';g.fillRect(11,9,43,59);g.shadowBlur=0;g.fillStyle='#2c4221';g.fillRect(11,9,7,59);g.strokeStyle='#a4ae73';g.strokeRect(18,9,36,59);g.fillStyle='#f0efd3';g.fillRect(23,20,25,19);text(g,'?',36,35,15);g.fillStyle='#526e39';g.fillRect(24,46,22,2);g.fillRect(24,51,17,2);for(let y=14;y<65;y+=8){g.fillStyle='#c6c5af';g.fillRect(8,y,8,2);}});
sprites.exit=makeCanvas(100,120,g=>{g.fillStyle='#264b2b';g.fillRect(10,10,80,108);g.fillStyle='#4d7050';g.fillRect(15,15,70,100);g.fillStyle='#bada79';g.fillRect(15,15,70,24);text(g,'SALIDA',50,32,13);g.fillStyle='#203b2a';g.fillRect(28,47,44,38);g.fillStyle='#e0d793';g.fillRect(68,89,7,4);text(g,'←',50,76,25,'#bfda80');});
sprites.secret=makeCanvas(100,120,g=>{g.fillStyle='#242a28';g.fillRect(10,10,80,108);g.strokeStyle='#a5b077';g.lineWidth=2;g.strokeRect(15,15,70,100);text(g,'AULA',50,36,12,'#b6c887');text(g,'0',50,84,48,'#b6c887');g.fillStyle='#995241';g.fillRect(18,91,64,9);text(g,'CLAUSURADA',50,98,7,'#e1d7b8');});
sprites.bell=makeCanvas(64,100,g=>{g.fillStyle='#68725b';g.fillRect(10,9,44,78);g.fillStyle='#c7b261';g.beginPath();g.arc(32,35,17,Math.PI,0);g.lineTo(52,60);g.lineTo(12,60);g.closePath();g.fill();g.fillStyle='#e0cb80';g.fillRect(12,58,40,4);g.fillStyle='#7e3328';g.fillRect(25,71,14,10);text(g,'TIMBRE',32,97,8,'#d3dcad');});
sprites.desk=makeCanvas(100,90,g=>{g.fillStyle='#383d33';g.fillRect(17,43,6,42);g.fillRect(78,43,6,42);g.fillStyle='#805f35';g.fillRect(9,25,82,24);g.fillStyle='#ab8751';g.fillRect(7,23,86,13);g.fillStyle='#dbd8bc';g.fillRect(34,19,28,6);g.fillStyle='#333a2d';g.fillRect(68,17,2,13);});
// Assets remain local and work below a repository subdirectory on GitHub Pages.
const real={frames:[],floor:null,ceiling:null,ready:false,pixelSampling:true};
const assetFiles=['Baldi_Slap0000.png','Baldi_Slap0006.png','Baldi_Slap0012.png','Baldi_Slap0018.png','Baldi_Slap0024.png','Baldi_Wave0000.png','Notebooks.png','WhiteBrickWall.png','TileFloor.png','Ceiling.png','BaldisBlackboard.png'];
let loading=false;
const startLabel=$('start').innerHTML;
function shadedPixels(image,ceiling=false){
 try{
  const c=makeCanvas(128,128,g=>g.drawImage(image,0,0,128,128));
  const data=c.getContext('2d',{willReadFrequently:true}).getImageData(0,0,128,128).data;
  return Array.from({length:16},(_,level)=>{const result=new Uint32Array(128*128),shade=(ceiling?.15:.2)+level/15*(ceiling?.6:.8);for(let i=0;i<result.length;i++){const n=i*4;result[i]=0xff000000|((data[n+2]*shade|0)<<16)|((data[n+1]*shade|0)<<8)|(data[n]*shade|0);}return result;});
 }catch(e){real.pixelSampling=false;return null;} // file:// can forbid pixel reads; wall/sprite drawing still works.
}
function loadAsset(name,attempt=0){return new Promise((resolve,reject)=>{
 const im=new Image();let done=false;
 const timer=setTimeout(failed,6000);
 function failed(){if(done)return;done=true;clearTimeout(timer);if(attempt<2)setTimeout(()=>loadAsset(name,attempt+1).then(resolve,reject),200);else reject(new Error(name));}
 im.onload=()=>{if(done)return;done=true;clearTimeout(timer);resolve([name,im]);};im.onerror=failed;im.src='assets/'+name+(attempt?'?retry='+attempt:'');
});}
async function loadAssets(){
 if(loading)return;loading=true;$('start').disabled=true;let count=0;
 try{
  const entries=[];
  for(let i=0;i<assetFiles.length;i+=3)entries.push(...await Promise.all(assetFiles.slice(i,i+3).map(async name=>{const entry=await loadAsset(name);$('start').textContent='CARGANDO ARCHIVO '+(++count)+' / '+assetFiles.length;return entry;})));
  const a=Object.fromEntries(entries);real.frames=assetFiles.slice(0,5).map(n=>a[n]);sprites.baldi=real.frames[0];sprites.notebook=a['Notebooks.png'];
  real.floor=shadedPixels(a['TileFloor.png']);real.ceiling=shadedPixels(a['Ceiling.png'],true);
  for(let i=0;i<wallTextures.length;i++)wallTextures[i]=makeCanvas(64,64,g=>{g.drawImage(a['WhiteBrickWall.png'],0,0,64,64);if(i===2)g.drawImage(a['BaldisBlackboard.png'],8,9,48,35);});
  const portrait=makeCanvas(258,210,g=>{g.fillStyle='#a7ae93';g.fillRect(0,0,258,210);g.imageSmoothingEnabled=false;g.drawImage(a['Baldi_Wave0000.png'],20,-5,220,375);});$('portrait').replaceChildren(portrait);
  real.ready=true;forceRender=true;$('start').innerHTML=startLabel;
 }catch(error){$('start').textContent='REINTENTAR CARGA ↻';$('start').title='Falta '+error.message+'. Comprueba que subiste la carpeta assets.';}
 finally{loading=false;$('start').disabled=false;}
}
const desks=[[5.4,6.5],[8.5,8.4],[16.4,6.5],[19.4,8.5],[5.5,14.4],[8.4,16.4],[16.4,14.4],[19.4,16.4]].map(n=>({x:n[0],y:n[1],key:'desk',height:.65}));
function renderWorld(menu=false,now=performance.now()){
 const begun=performance.now(),p=menu?{x:2.5,y:3.5,angle:.13+(options.reducedMotion?0:Math.sin(now/9000)*.14)}:game.player;
 const ca=Math.cos(p.angle),sa=Math.sin(p.angle),plane=viewAspect*.5,px=-sa*plane,py=ca*plane,half=H/2;
 // Persistent buffers and 2x2 texel blocks: no per-frame ImageData allocation.
 for(let y=0;y<half;y+=2){
  const dist=H*.5/(y+1),lx=p.x+dist*(ca-px),ly=p.y+dist*(sa-py),dx=dist*2*px/W,dy=dist*2*py/W;
  const level=Math.max(0,Math.min(15,15-dist*.8|0)),fp=real.floor?.[level],cp=real.ceiling?.[level];
  for(let x=0;x<W;x+=2){
   const wx=lx+dx*x,wy=ly+dy*x,tx=((wx-Math.floor(wx))*128)|0,ty=((wy-Math.floor(wy))*128)|0,index=ty*128+tx;
   const fallback=((Math.floor(wx)+Math.floor(wy))&1)?0xff3f4a44:0xff636e62;
   const fc=fp?fp[index]:fallback,cc=cp?cp[index]:0xff414b40;
   for(let yy=0;yy<2&&y+yy<half;yy++){const fi=(half+y+yy)*W+x,ci=(half-1-y-yy)*W+x;bgData[fi]=bgData[fi+1]=fc;bgData[ci]=bgData[ci+1]=cc;}
  }
 }
 ctx.putImageData(background,0,0);
 for(let x=0;x<W;x++){
  const cam=2*x/W-1,rx=ca+px*cam,ry=sa+py*cam;
  let mx=Math.floor(p.x),my=Math.floor(p.y),ddx=Math.abs(1/rx),ddy=Math.abs(1/ry),sx=rx<0?-1:1,sy=ry<0?-1:1;
  let sideX=(rx<0?p.x-mx:mx+1-p.x)*ddx,sideY=(ry<0?p.y-my:my+1-p.y)*ddy,side=0;
  for(let j=0;j<80;j++){if(sideX<sideY){sideX+=ddx;mx+=sx;side=0;}else{sideY+=ddy;my+=sy;side=1;}if(!game.map[my]||game.map[my][mx]!==0)break;}
  const d=Math.max(.05,side?sideY-ddy:sideX-ddx);zbuf[x]=d;
  const lh=Math.min(14000,H/d),top=(H-lh)/2;let wx=side?p.x+d*rx:p.y+d*ry;wx-=Math.floor(wx);let tx=Math.floor(wx*64);if((!side&&rx>0)||(side&&ry<0))tx=63-tx;
  ctx.drawImage(wallTextures[Math.abs(mx*3+my*5)%6],tx,0,1,64,x,top,1,lh);
  ctx.fillStyle='rgba(5,12,5,'+Math.min(.91,d*.045+(side?.12:0))+')';ctx.fillRect(x,Math.max(0,top),1,Math.min(H,lh));
 }
 const entities=[{...game.exit,key:'exit',height:1.08},{...game.secret,key:'secret',height:1.08},{...game.bell,key:'bell',height:.85},...game.notebooks.filter(n=>!n.collected).map(n=>({...n,key:'notebook',height:.4})),...desks,{...(menu?{x:6.6,y:3.55}:game.baldi),key:'baldi',height:1.34}];
 entities.sort((a,b)=>Math.hypot(b.x-p.x,b.y-p.y)-Math.hypot(a.x-p.x,a.y-p.y));
 for(const e of entities){
  const dx=e.x-p.x,dy=e.y-p.y,depth=dx*ca+dy*sa;if(depth<.15)continue;
  const lateral=-dx*sa+dy*ca,scrX=W/2*(1+lateral/(depth*plane));
  const animation=options.reducedMotion||menu||slapAge>=.45?0:Math.min(4,Math.floor(slapAge/.09));
  const image=e.key==='baldi'&&real.ready?real.frames[animation]:sprites[e.key];
  const h=H/depth*e.height,w=h*image.width/image.height*(W/H)/viewAspect,bottom=half+H/depth*.5,top=bottom-h;
  const bob=options.reducedMotion?0:e.key==='notebook'?Math.sin(now/650+e.x)*2:0;
  const left=scrX-w/2;
  for(let x=Math.max(0,Math.ceil(left));x<Math.min(W,left+w);x++)if(depth<zbuf[x]){const tx=Math.min(image.width-1,Math.max(0,Math.floor((x-left)/w*image.width)));ctx.drawImage(image,tx,0,1,image.height,x,top+bob,1,h);}
 }
 if(!menu&&game.status==='playing'){
  const danger=Math.max(0,1-Math.hypot(p.x-game.baldi.x,p.y-game.baldi.y)/5);
  if(danger>0){ctx.fillStyle='rgba(100,13,5,'+(danger*.14)+')';ctx.fillRect(0,0,W,H);}
 }
 metrics.renders++;metrics.renderMs=performance.now()-begun;
}
// Audio has a single owner. Every screen change ends previous sounds.
let audio=null,master=null,droneGain=null;const tones=new Set(),clips={};
for(const name of ['BAL_Hi','BAL_Slap','BAL_Praise1','BAL_Screech','bell','Aula_Ambience']){const clip=new Audio('assets/'+(name==='BAL_Slap'?'BAL_Slap_Loud':name)+'.wav');clip.preload='none';clips[name]=clip;}
clips.Aula_Ambience.loop=true;
function ruleVolume(distance){return Math.max(.18,Math.min(1,1.45-distance*.05));}
function syncAmbient(){const clip=clips.Aula_Ambience;if(mode!=='playing'||muted||options.volume===0||options.ambience===0||document.hidden){clip.pause();return;}clip._level=options.ambience/100;clip.volume=clip._level*options.volume/100;if(clip.paused)clip.play().catch(()=>{});}
function stopSounds(){for(const clip of Object.values(clips)){clip.pause();try{clip.currentTime=0;}catch(e){}}for(const o of tones){try{o.stop();}catch(e){}}tones.clear();}
function applyAudio(){const level=muted?0:options.volume/100;if(master)master.gain.value=level*.2;for(const c of Object.values(clips))c.volume=(c._level??.6)*level;}
function initAudio(){try{if(!audio){audio=new(window.AudioContext||window.webkitAudioContext)();master=audio.createGain();master.connect(audio.destination);const o=audio.createOscillator();droneGain=audio.createGain();o.frequency.value=57;droneGain.gain.value=.08;o.connect(droneGain);droneGain.connect(master);o.start();}if(droneGain)droneGain.gain.value=mode==='playing'?.02*options.ambience/45:0;applyAudio();audio.resume().catch(()=>{});}catch(e){/* Visual gameplay remains available without audio support. */}}
function playClip(name,volume=.6){if(muted||options.volume===0||!clips[name]||document.hidden)return;const clip=clips[name];clip._level=volume;clip.pause();try{clip.currentTime=0;}catch(e){}clip.volume=Math.max(0,Math.min(1,volume*options.volume/100));clip.play().catch(()=>{});}
function tone(freq,duration=.1,type='sine',vol=.4,delay=0){if(!audio||muted||options.volume===0)return;const o=audio.createOscillator(),g=audio.createGain(),t=audio.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,t);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(master);tones.add(o);o.onended=()=>{tones.delete(o);o.disconnect();g.disconnect();};o.start(t);o.stop(t+duration+.01);}
function say(s,seconds=4){$('subtitle').textContent=s;$('subtitle').hidden=false;toastTime=seconds;}
const touchMedia=matchMedia('(pointer: coarse)');let touches={},settingsReturn='menu',journalReturn='playing',lastMenuDraw=0,lastHUD=0,slapAge=1,scareRemaining=0;
function clearInput(){keys={};touches={};lookX=0;document.querySelectorAll('[data-touch].pressed').forEach(b=>b.classList.remove('pressed'));}
function focusScreen(next){if(next==='playing'){canvas.focus({preventScroll:true});return;}const screen=$(next);const first=next==='puzzle'?$('answer'):screen?.querySelector('button:not(:disabled), input, select');first?.focus({preventScroll:true});}
function setMode(next){
 mode=next;clearInput();stopSounds();screens.forEach(id=>$(id).hidden=id!==next);
 const active=next==='playing';['hud','bottomHud','crosshair'].forEach(id=>$(id).hidden=!active);$('touchControls').hidden=!(active&&touchMedia.matches);
 canvas.tabIndex=active?0:-1;$('interaction').hidden=true;$('subtitle').hidden=true;$('map').hidden=!(active&&mapVisible);
 if(!active&&document.pointerLockElement)document.exitPointerLock();
 if(droneGain)droneGain.gain.value=active?.02*options.ambience/45:0;
 if(audio){if(active)audio.resume().catch(()=>{});else audio.suspend().catch(()=>{});}
 syncAmbient();if(next==='menu')updateBadges();forceRender=true;focusScreen(next);
}
function lock(){if(mode==='playing'&&!touchMedia.matches&&canvas.requestPointerLock){try{const r=canvas.requestPointerLock();r?.catch(()=>{});}catch(e){}}}
function resume(){setMode('playing');lastHUD=0;lock();}
function start(){if(!real.ready){loadAssets();return;}game=new AulaEngine.Game();session++;currentNote=null;step=slap=0;slapAge=1;mapVisible=false;setMode('playing');initAudio();playClip('BAL_Hi',.7);say('BALDI: Bienvenido de nuevo. Hoy… intenta no ser perfecto.',6);lock();}
function menu(){game=new AulaEngine.Game();currentNote=null;setMode('menu');}
function updateBadges(){const saved=readStore('aula-cero');const count=Number(!!saved.escape)+Number(!!saved.secret);$('endingBadges').replaceChildren();for(const [label,on]of[[count+' / 2 FINALES',count>0],['SALIDA',saved.escape],['AULA CERO',saved.secret]]){const span=document.createElement('span');span.textContent=label;if(on)span.className='unlocked';$('endingBadges').append(span);}}
function saveOptions(){options.muted=muted;try{localStorage.setItem('aula-cero-settings',JSON.stringify(options));}catch(e){}}
function applyOptions(){document.body.classList.toggle('reduced-motion',!!options.reducedMotion);$('ambience').value=options.ambience;$('ambienceValue').textContent=options.ambience+'%';$('volume').value=options.volume;$('volumeValue').textContent=options.volume+'%';$('sensitivity').value=options.sensitivity;$('sensitivityValue').textContent=options.sensitivity.toFixed(1)+'×';$('graphics').value=options.graphics;$('reducedMotion').checked=!!options.reducedMotion;applyAudio();}
function openSettings(){settingsReturn=mode==='menu'?'menu':'pause';setMode('settingsScreen');}
function closeSettings(){saveOptions();setMode(settingsReturn);}
$('volume').oninput=()=>{options.volume=Number($('volume').value);muted=false;applyOptions();saveOptions();};
$('ambience').oninput=()=>{options.ambience=Number($('ambience').value);applyOptions();saveOptions();};
$('sensitivity').oninput=()=>{options.sensitivity=Number($('sensitivity').value);applyOptions();saveOptions();};
$('graphics').onchange=()=>{options.graphics=$('graphics').value;resizeRenderer();saveOptions();};
$('reducedMotion').onchange=()=>{options.reducedMotion=$('reducedMotion').checked;applyOptions();saveOptions();forceRender=true;};
function openJournal(){journalReturn=mode==='pause'?'pause':'playing';$('journalEntries').replaceChildren();const notes=game.notebooks.filter(n=>n.collected);if(!notes.length){const p=document.createElement('p');p.className='journal-empty';p.textContent='Todavía no has recuperado ningún recuerdo.';$('journalEntries').append(p);}for(const n of notes){const article=document.createElement('article');article.className='journal-entry';const h=document.createElement('h3'),p=document.createElement('p');h.textContent=String(n.id+1).padStart(2,'0')+' / '+lore[n.id][0];p.textContent=lore[n.id][1];article.append(h,p);$('journalEntries').append(article);}setMode('journalScreen');}
function closeJournal(){if(journalReturn==='playing')resume();else setMode('pause');}
async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else{$('fullscreenButton').textContent='USA EL MENÚ DEL NAVEGADOR';if(mode==='playing')say('Usa la opción de pantalla completa de tu navegador.',4);}}catch(e){$('fullscreenButton').textContent='USA EL MENÚ DEL NAVEGADOR';if(mode==='playing')say('Activa pantalla completa desde el menú de tu navegador.',4);}}
function toggleMap(){mapVisible=!mapVisible;$('map').hidden=!mapVisible;if(mapVisible)drawMap();}
function toggleMute(){muted=!muted;if(muted)stopSounds();applyAudio();syncAmbient();saveOptions();say(muted?'Sonido desactivado.':'Sonido activado.',2);}
function cancelPuzzle(){currentNote=null;resume();}
function closeLore(){resume();say(game.count===5?'SALIDA ABIERTA. El Aula Cero espera si has cometido dos errores.':game.message,5);}
$('start').onclick=start;$('help').onclick=()=>setMode('helpScreen');$('back').onclick=()=>setMode('menu');$('pauseButton').onclick=()=>setMode('pause');$('resume').onclick=resume;$('quit').onclick=menu;$('retry').onclick=start;$('endingMenu').onclick=menu;canvas.onclick=lock;$('continue').onclick=closeLore;$('cancelPuzzle').onclick=cancelPuzzle;
$('openSettings').onclick=$('pauseSettings').onclick=openSettings;$('settingsBack').onclick=closeSettings;$('pauseJournal').onclick=openJournal;$('journalBack').onclick=closeJournal;$('fullscreenButton').onclick=fullscreen;
function interact(){
 const item=game.interact();if(!item)return;
 if(item.type==='notebook'){currentNote=item.id;setMode('puzzle');$('pageNumber').textContent=String(item.id+1).padStart(2,'0');$('question').textContent=problems[item.id][0]+' = ?';$('answer').value='';$('answerError').hidden=true;$('answer').removeAttribute('aria-invalid');$('answer').focus();}
 else if(game.status==='lost')beginJumpscare();else if(game.status!=='playing')finish();else{say(game.message,5);if(item.type==='bell')playClip('bell',.6);}
}
$('answerForm').onsubmit=e=>{
 e.preventDefault();if(currentNote===null)return;
 const raw=$('answer').value.trim();if(!/^[+-]?\d{1,6}$/.test(raw)){$('answerError').textContent='Escribe un número entero, por ejemplo 15.';$('answerError').hidden=false;$('answer').setAttribute('aria-invalid','true');$('answer').focus();return;}
 const correct=Number(raw)===problems[currentNote][1];if(!game.answer(currentNote,correct))return;
 $('loreNumber').textContent='RECUERDO '+String(currentNote+1).padStart(2,'0')+' / ARCHIVO 1999';$('loreTitle').textContent=lore[currentNote][0];$('loreText').textContent=lore[currentNote][1];
 $('loreFeedback').textContent=correct?'✓ Respuesta correcta. Has recuperado un recuerdo.':'✕ Respuesta incorrecta. Un muro ha cedido. '+(game.mistakes>=2?'El sello del Aula Cero está roto.':'Un segundo error romperá el sello.');
 setMode('loreScreen');if(correct)playClip('BAL_Praise1',.65);currentNote=null;
};
function beginJumpscare(){
 setMode('jumpscare');scareRemaining=1.35;initAudio();playClip('BAL_Screech',.85);
 const face=$('scareCanvas'),g=face.getContext('2d');g.imageSmoothingEnabled=false;g.fillStyle='#180d08';g.fillRect(0,0,face.width,face.height);
 const sprite=real.frames[2]||sprites.baldi;g.drawImage(sprite,18,12,70,85,0,0,face.width,face.height);
}
function finish(){
 setMode('ending');initAudio();const secret=game.status==='secret',won=game.status==='won';
 $('endingLabel').textContent=secret?'FINAL 02 / LA ÚLTIMA CLASE':won?'FINAL 01 / EL ALUMNO AUSENTE':'EXPEDIENTE BORRADO';$('endingTitle').textContent=secret?'Presente.':won?'Fuera de clase.':'Te has olvidado.';
 $('endingText').textContent=secret?'Pronuncias los treinta y un nombres. La escuela pierde su última pared. Baldi deja caer la regla; por primera vez, suena el timbre del recreo. En la lista de 1999 ya no falta nadie.':won?'La puerta cede. Afuera amanece, y tu nombre vuelve a la tarjeta de estudiante. Detrás de ti, Baldi pasa lista otra vez. Hay un pupitre que sigue vacío. El Aula Cero aún espera.':'La regla golpea el suelo. En la lista aparece un espacio en blanco donde estaba tu nombre. La próxima vez, escucha el timbre, conserva tu resistencia y recuerda que algunos errores abren puertas.';
 $('resultTime').textContent=Math.floor(game.time/60)+':'+String(Math.floor(game.time%60)).padStart(2,'0');$('resultPages').textContent=game.count+'/5';$('resultErrors').textContent=game.mistakes;
 if(won||secret){[440,554,660,880].forEach((f,i)=>tone(f,.5,'triangle',.3,i*.15));try{const old=readStore('aula-cero');old[secret?'secret':'escape']=true;localStorage.setItem('aula-cero',JSON.stringify(old));}catch(e){}}
}
function trapTab(e){const screen=$(mode);if(!screen)return;const items=[...screen.querySelectorAll('button:not(:disabled),input,select,[tabindex="0"]')].filter(n=>n.getClientRects().length);if(!items.length)return;const first=items[0],last=items[items.length-1];if(e.shiftKey&&(document.activeElement===first||!screen.contains(document.activeElement))){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||!screen.contains(document.activeElement))){e.preventDefault();first.focus();}}
window.addEventListener('keydown',e=>{
 if(mode==='jumpscare'){if(e.code==='KeyM'&&!e.repeat){e.preventDefault();toggleMute();}return;}
 if(e.code==='Tab'){if(mode==='playing'){e.preventDefault();setMode('pause');}else trapTab(e);return;}
 if(e.code==='Escape'&&!e.repeat){e.preventDefault();if(mode==='playing')setMode('pause');else if(mode==='pause')resume();else if(mode==='puzzle')cancelPuzzle();else if(mode==='loreScreen')closeLore();else if(mode==='helpScreen')setMode('menu');else if(mode==='settingsScreen')closeSettings();else if(mode==='journalScreen')closeJournal();return;}
 if(mode!=='playing'||/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;
 const gameplay=['KeyW','KeyS','KeyA','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight','KeyE','KeyQ','KeyM','KeyJ','KeyF','Space'];if(gameplay.includes(e.code))e.preventDefault();keys[e.code]=true;
 if(e.repeat)return;
 if(e.code==='KeyE')interact();else if(e.code==='KeyQ')toggleMap();else if(e.code==='KeyM')toggleMute();else if(e.code==='KeyJ')openJournal();else if(e.code==='KeyF')fullscreen();
});
window.addEventListener('resize',()=>{viewAspect=canvas.clientWidth/Math.max(1,canvas.clientHeight);forceRender=true;});
window.addEventListener('keyup',e=>{delete keys[e.code];});
window.addEventListener('blur',()=>{clearInput();if(mode==='playing')setMode('pause');else stopSounds();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){if(mode==='playing')setMode('pause');stopSounds();audio?.suspend().catch(()=>{});}last=0;});
document.addEventListener('pointerlockchange',()=>{lookX=0;if(!document.pointerLockElement&&mode==='playing'&&!touchMedia.matches)setMode('pause');});
document.addEventListener('mousemove',e=>{if(document.pointerLockElement===canvas&&mode==='playing')lookX=AulaEngine.clamp(lookX+(Number(e.movementX)||0),-600,600);});
touchMedia.addEventListener?.('change',()=>{$('touchControls').hidden=!(mode==='playing'&&touchMedia.matches);clearInput();});
const touchKey={forward:'KeyW',back:'KeyS',left:'KeyA',right:'KeyD',turnLeft:'ArrowLeft',turnRight:'ArrowRight',sprint:'ShiftLeft'};
for(const button of document.querySelectorAll('[data-touch]')){
 const action=button.dataset.touch;
 button.addEventListener('pointerdown',e=>{if(mode!=='playing')return;e.preventDefault();button.setPointerCapture(e.pointerId);button.classList.add('pressed');if(touchKey[action])touches[e.pointerId]=touchKey[action];else if(action==='interact')interact();else if(action==='map')toggleMap();else if(action==='pause')setMode('pause');});
 const release=e=>{delete touches[e.pointerId];button.classList.remove('pressed');};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
function drawMap(){
 const c=$('map'),g=c.getContext('2d'),s=10,ox=25,oy=20;g.fillStyle='#11190f';g.fillRect(0,0,300,280);
 for(let y=0;y<game.map.length;y++)for(let x=0;x<game.map[y].length;x++){g.fillStyle=game.map[y][x]?'#343f2d':'#adb78c';g.fillRect(ox+x*s,oy+y*s,s-1,s-1);}
 function dot(p,color,size=5){g.fillStyle=color;g.fillRect(ox+p.x*s-size/2,oy+p.y*s-size/2,size,size);}
 for(const n of game.notebooks.filter(n=>!n.collected)){dot(n,'#edff80',7);g.fillStyle='#17220f';g.font='7px monospace';g.fillText(n.id+1,ox+n.x*s-2,oy+n.y*s+2);}
 dot(game.exit,'#449eff',7);dot(game.secret,game.mistakes>=2?'#b994ef':'#695c7c',7);dot(game.bell,'#dca942',6);dot(game.player,'#fff',6);
 g.strokeStyle='#fff';g.beginPath();g.moveTo(ox+game.player.x*s,oy+game.player.y*s);g.lineTo(ox+(game.player.x+Math.cos(game.player.angle))*s,oy+(game.player.y+Math.sin(game.player.angle))*s);g.stroke();
 g.font='8px monospace';g.fillStyle='#d1e976';g.fillText('NÚMEROS: CUADERNOS · AZUL: SALIDA',18,264);g.fillStyle='#b994ef';g.fillText('VIOLETA: AULA 0 · NARANJA: TIMBRE',18,275);
}
function updateHUD(){
 const item=game.nearestInteractable();$('count').textContent=game.count;$('stamina').style.width=(game.player.stamina*100)+'%';$('noise').style.width=(game.noise*100)+'%';$('noiseText').textContent=game.exhausted?'SIN ALIENTO · RECUPERANDO':game.noise>.7?'BALDI PUEDE OÍRTE':'PASOS SILENCIOSOS';
 const dist=AulaEngine.distance(game.player,game.baldi);$('threat').textContent=game.grace>0?'LA CLASE AÚN NO EMPIEZA':game.distraction>0?'TIMBRE · '+Math.ceil(game.distraction)+' s':dist<4?'BALDI ESTÁ MUY CERCA':dist<9?'ESCUCHA SU REGLA':'BALDI ESTÁ LEJOS';
 $('objective').textContent=game.count===5?(game.mistakes>=2?'Escapa o lleva los recuerdos al Aula Cero':'Vuelve a la salida · 5 recuerdos recuperados'):'Recupera los cuadernos · '+game.count+'/5'+(game.mistakes>=2?' · Aula Cero desbloqueada':'');
 $('interaction').hidden=!item;if(item)$('interactLabel').textContent={notebook:'RECOGER CUADERNO '+(item.id+1),bell:game.bellCooldown>0?'TIMBRE · '+Math.ceil(game.bellCooldown)+' s':'TOCAR EL TIMBRE',exit:game.count===5?'ABRIR SALIDA':'SALIDA · NECESITAS 5 CUADERNOS',secret:game.mistakes<2?'AULA CERO · SELLO CERRADO':'ENTRAR AL AULA CERO'}[item.type];
 if(mapVisible)drawMap();
}
function frame(t){
 const dt=last?Math.min((t-last)/1000,.05):0;last=t;
 if(!document.hidden){
  if(mode==='playing'){
   game.player.angle+=lookX*.0025*options.sensitivity;lookX=0;
   const down=code=>!!keys[code]||Object.values(touches).includes(code);
   const input={forward:(down('KeyW')||down('ArrowUp')?1:0)-(down('KeyS')||down('ArrowDown')?1:0),strafe:(down('KeyD')?1:0)-(down('KeyA')?1:0),turn:(down('ArrowRight')?1:0)-(down('ArrowLeft')?1:0),sprint:down('ShiftLeft')||down('ShiftRight')};
   game.update(dt,input);step-=dt;slap-=dt;slapAge+=dt;
   if(game.isMoving&&step<=0){const running=!!game.isSprinting;tone(running?100:75,.06,'triangle',running?.22:.1);step=running?.27:.47;}
   if(game.grace<=0&&slap<=0){const dist=AulaEngine.distance(game.player,game.baldi);if(dist<24)playClip('BAL_Slap',ruleVolume(dist));slap=Math.max(.4,1.6-game.count*.15-game.mistakes*.1);slapAge=0;}
   toastTime-=dt;if(toastTime<=0)$('subtitle').hidden=true;
   if(t-lastHUD>80||forceRender){updateHUD();lastHUD=t;}
   if(game.status==='lost')beginJumpscare();else if(game.status!=='playing')finish();
   renderWorld(false,t);forceRender=false;
  }else{
   if(mode==='jumpscare'){scareRemaining-=dt;if(scareRemaining<=0)finish();}
   const menuBackdrop=['menu','helpScreen'].includes(mode)||(mode==='settingsScreen'&&settingsReturn==='menu');
   if(forceRender||(menuBackdrop&&!options.reducedMotion&&t-lastMenuDraw>66)){renderWorld(menuBackdrop,t);lastMenuDraw=t;forceRender=false;}
  }
  metrics.fps=dt>0?Math.round(1/dt):0;
 }
 requestAnimationFrame(frame);
}
// Inspection hook for deterministic tests; no network or debug shortcut in gameplay.
window.AulaCero={get game(){return game;},get mode(){return mode;},get session(){return session;},get assetsReady(){return real.ready;},get metrics(){return {...metrics,width:W,height:H};},get audioState(){return {context:audio?.state||'uninitialized',playing:Object.entries(clips).filter(([,c])=>!c.paused).map(([n])=>n),ambienceLoop:clips.Aula_Ambience.loop,ruleVolume:clips.BAL_Slap.volume,ambientVolume:clips.Aula_Ambience.volume};},get options(){return {...options};}};
applyOptions();updateBadges();loadAssets();setMode('menu');requestAnimationFrame(frame);
})();
