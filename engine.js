/* Aula Cero — deterministic, dependency-free game simulation. */
(function (root) {
'use strict';
const finite=(n,fallback=0)=>{try{const value=Number(n);return Number.isFinite(value)?value:fallback;}catch{return fallback;}};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,finite(n)));
const TAU=Math.PI*2;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
class Game {
 constructor(){
  this.map=Array.from({length:23},()=>Array(25).fill(1));
  const carve=(x1,y1,x2,y2)=>{for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)this.map[y][x]=0;};
  carve(2,3,22,3);carve(2,19,22,19);carve(2,3,2,19);carve(22,3,22,19);
  carve(12,3,12,19);carve(2,11,22,11);
  carve(4,5,9,9);carve(15,5,20,9);carve(4,13,9,17);carve(15,13,20,17);
  carve(6,3,6,5);carve(18,3,18,5);carve(6,17,6,19);carve(18,17,18,19);
  carve(9,7,12,7);carve(12,15,15,15);
  this.player={x:2.5,y:3.5,angle:0,stamina:1};
  this.baldi={x:22.5,y:19.5};this.exit={x:2.5,y:3.5};this.secret={x:12.5,y:3.5};this.bell={x:12.5,y:11.5};
  this.notebooks=[[7.5,7.5],[18.5,7.5],[7.5,15.5],[18.5,15.5],[12.5,17.5]].map((p,id)=>({x:p[0],y:p[1],id,collected:false}));
  this.count=0;this.mistakes=0;this.time=0;this.status='playing';this.noise=0;this.target=null;
  this.message='Busca los cinco cuadernos. Baldi todavía no te ha oído.';this.lastEvent='';this.grace=12;
  this.secretsOpened=0;this.distraction=0;this.bellCooldown=0;this.exhausted=false;this.isSprinting=false;this.isMoving=false;this._patrol=0;this._path=[];this._repath=0;
  this._patrolPoints=[{x:22.5,y:19.5},{x:22.5,y:3.5},{x:12.5,y:11.5},{x:2.5,y:19.5}];
 }
 solid(x,y){const row=this.map[Math.floor(y)];return !row||row[Math.floor(x)]!==0;}
 canStand(x,y){const r=.19;return !this.solid(x-r,y-r)&&!this.solid(x+r,y-r)&&!this.solid(x-r,y+r)&&!this.solid(x+r,y+r);}
 move(actor,dx,dy){
  if(!actor||!Number.isFinite(actor.x)||!Number.isFinite(actor.y))return false;
  dx=finite(dx);dy=finite(dy);
  // Sweep in small increments: even a large frame/input never jumps a wall.
  const limit=Math.max(this.map.length,this.map[0].length)*2,length=Math.hypot(dx,dy);
  if(length>limit){dx=dx/length*limit;dy=dy/length*limit;}
  const steps=Math.max(1,Math.ceil(Math.max(Math.abs(dx),Math.abs(dy))/.09));
  const ox=actor.x,oy=actor.y;
  for(let i=0;i<steps;i++){
   if(this.canStand(actor.x+dx/steps,actor.y))actor.x+=dx/steps;
   if(this.canStand(actor.x,actor.y+dy/steps))actor.y+=dy/steps;
  }
  return Math.hypot(actor.x-ox,actor.y-oy)>.00001;
 }
 lineOfSight(a,b){
  if(!a||!b||![a.x,a.y,b.x,b.y].every(Number.isFinite)||this.solid(a.x,a.y)||this.solid(b.x,b.y))return false;
  const d=distance(a,b),steps=Math.ceil(d/.05);
  for(let i=1;i<steps;i++)if(this.solid(a.x+(b.x-a.x)*i/steps,a.y+(b.y-a.y)*i/steps))return false;
  return true;
 }
 pathTo(a,b){
  if(!a||!b||this.solid(a.x,a.y)||this.solid(b.x,b.y))return [];
  const sx=Math.floor(a.x),sy=Math.floor(a.y),tx=Math.floor(b.x),ty=Math.floor(b.y);
  const key=(x,y)=>y*this.map[0].length+x;const queue=[[sx,sy]],prev=new Map([[key(sx,sy),null]]);let found=false;
  for(let i=0;i<queue.length;i++){const [x,y]=queue[i];if(x===tx&&y===ty){found=true;break;}
   for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,k=key(nx,ny);if(!this.solid(nx+.5,ny+.5)&&!prev.has(k)){prev.set(k,[x,y]);queue.push([nx,ny]);}}
  }
  if(!found)return [];let p=[tx,ty],out=[];while(p&&(p[0]!==sx||p[1]!==sy)){out.push({x:p[0]+.5,y:p[1]+.5});p=prev.get(key(p[0],p[1]));}return out.reverse();
 }
 update(dt,input={}){
  if(this.status!=='playing')return;
  dt=clamp(dt,0,.05);if(!dt)return;input=input||{};
  this.time+=dt;this.grace=Math.max(0,Math.min(this.grace-dt,12-this.time));
  this.bellCooldown=Math.max(0,this.bellCooldown-dt);this.distraction=Math.max(0,this.distraction-dt);
  const p=this.player;p.angle=((finite(p.angle)+clamp(input.turn||0,-1,1)*dt*2.3)%TAU+TAU)%TAU;
  const f=clamp(input.forward||0,-1,1),s=clamp(input.strafe||0,-1,1),moving=!!(f||s);
  if(p.stamina<=.025)this.exhausted=true;
  if(p.stamina>=.28)this.exhausted=false;
  const sprint=!!input.sprint&&moving&&!this.exhausted&&p.stamina>.025;
  this.isSprinting=sprint;p.stamina=clamp(p.stamina+(sprint?-.24:.14)*dt,0,1);
  const speed=sprint?3.35:1.85,norm=Math.max(1,Math.hypot(f,s));
  this.isMoving=this.move(p,(Math.cos(p.angle)*f-Math.sin(p.angle)*s)/norm*speed*dt,(Math.sin(p.angle)*f+Math.cos(p.angle)*s)/norm*speed*dt);
  this.noise=clamp(this.noise-dt*.38,0,1);if(this.isMoving)this.noise=Math.max(this.noise,sprint?.95:.2);
  if(this.grace>0)return;
  const d=distance(p,this.baldi);
  if(this.distraction>0)this.target={...this.bell};
  else if((this.noise>.7&&d<18)||(d<5.5&&this.isMoving)||(d<12&&this.lineOfSight(this.baldi,p)))this.target={x:p.x,y:p.y};
  if(!this.target){
   const point=this._patrolPoints[this._patrol];if(distance(this.baldi,point)<.25)this._patrol=(this._patrol+1)%this._patrolPoints.length;
   this.target={...this._patrolPoints[this._patrol]};
  }
  // Complete a committed cell-center waypoint before accepting a new turn.
  // Replanning from a fractional cell had caused corner cutting and stuck AI.
  while(this._path.length&&distance(this.baldi,this._path[0])<.035)this._path.shift();
  this._repath-=dt;
  if(this._repath<=0){
   const committed=this._path[0];
   this._path=committed?[committed,...this.pathTo(committed,this.target)]:this.pathTo(this.baldi,this.target);
   this._repath=.35;
  }
  const next=this._path[0];const speedBaldi=.85+this.count*.105+this.mistakes*.075+Math.min(this.time/600,.2);
  if(next){
   const nd=distance(this.baldi,next),step=Math.min(speedBaldi*dt,nd);
   if(nd>0)this.move(this.baldi,(next.x-this.baldi.x)/nd*step,(next.y-this.baldi.y)/nd*step);
  }else{
   const td=distance(this.baldi,this.target);
   if(td>.04&&this.lineOfSight(this.baldi,this.target))this.move(this.baldi,(this.target.x-this.baldi.x)/td*Math.min(speedBaldi*dt,td),(this.target.y-this.baldi.y)/td*Math.min(speedBaldi*dt,td));
   else if(td<.4)this.target=null;
  }
  if(distance(p,this.baldi)<.48&&this.lineOfSight(p,this.baldi)){this.status='lost';this.message='TU NOMBRE HA SIDO BORRADO.';this.lastEvent='caught';}
 }
 nearestInteractable(){
  const items=[...this.notebooks.filter(n=>!n.collected).map(n=>({...n,type:'notebook'})),{...this.bell,type:'bell'},{...this.exit,type:'exit'},{...this.secret,type:'secret'}];
  const list=items.map(i=>({...i,distance:distance(this.player,i)})).filter(i=>i.distance<=1.65&&this.lineOfSight(this.player,i)).sort((a,b)=>a.distance-b.distance);
  return list[0]||null;
 }
 interact(){
  if(this.status!=='playing')return null;const item=this.nearestInteractable();if(!item)return null;
  if(item.type==='bell'){
   if(this.bellCooldown>0){this.message='El timbre necesita '+Math.ceil(this.bellCooldown)+' segundos.';return {type:'cooldown'};}
   this.distraction=16;this.bellCooldown=25;this.target={...this.bell};this._repath=0;this.noise=1;this.message='El timbre llama a Baldi durante 16 segundos. Aléjate.';this.lastEvent='bell';
  }
  if(item.type==='exit'){
   if(this.count>=5){this.status='won';this.message='SALISTE. PERO LA CLASE CONTINÚA.';this.lastEvent='escape';}
   else this.message='La salida necesita los cinco cuadernos. Faltan '+(5-this.count)+'.';
  }
  if(item.type==='secret'){
   if(this.count>=5&&this.mistakes>=2){this.status='secret';this.message='NADIE VOLVERÁ A SER BORRADO.';this.lastEvent='secret';}
   else this.message=this.mistakes<2?'AULA 0: la perfección mantiene la puerta cerrada. Dos errores rompen el sello.':'AULA 0: reúne los cinco recuerdos primero.';
  }
  return item;
 }
 answer(id,correct){
  const note=this.notebooks.find(n=>n.id===id);if(this.status!=='playing'||!note||note.collected)return false;
  note.collected=true;this.count++;this.noise=1;this.grace=0;
  if(!correct){this.mistakes++;const shortcuts=[[10,9],[13,13],[10,15],[13,7],[10,17]];const [x,y]=shortcuts[(this.mistakes-1)%shortcuts.length];for(let dx=0;dx<3;dx++)this.map[y][x+dx]=0;this.secretsOpened++;this.message='ERROR. La escuela ha cambiado. El Aula Cero recuerda.';this.lastEvent='mistake';}
  else {this.message=this.count===5?(this.mistakes>=2?'Cinco recuerdos. La salida y el Aula Cero están abiertas.':'Cinco recuerdos. La salida está abierta. Dos errores abren el Aula Cero.'):'CORRECTO. Otro nombre vuelve a la lista.';this.lastEvent='correct';}
  return true;
 }
}
root.AulaEngine={Game,clamp,distance};if(typeof module!=='undefined'&&module.exports)module.exports=root.AulaEngine;
})(typeof globalThis!=='undefined'?globalThis:this);
