'use strict';
const assert=require('node:assert/strict');
const {Game}=require('./engine.js');
let checks=0;function test(name,fn){fn();checks++;console.log('PASS '+name);}
test('all five notebooks, bell, both exits are reachable',()=>{const g=new Game();for(const item of [...g.notebooks,g.bell,g.exit,g.secret])assert(g.pathTo(g.player,item).length||Math.hypot(g.player.x-item.x,g.player.y-item.y)<1);});
test('boundaries and collision prevent wall traversal',()=>{const g=new Game();assert(g.solid(-1,0));const p={x:2.5,y:3.5};g.move(p,-1,0);assert(p.x>=2.19);assert(g.canStand(p.x,p.y));});
test('diagonal speed normalized and sprint spends stamina',()=>{const g=new Game();g.update(.05,{forward:1,sprint:true});assert(g.player.x>2.5);assert(g.player.stamina<1);});
test('starting exit stays locked',()=>{const g=new Game();assert.equal(g.interact().type,'exit');assert.equal(g.status,'playing');});
test('notebook interaction and duplicate collection guard',()=>{const g=new Game();Object.assign(g.player,g.notebooks[0]);assert.equal(g.interact().type,'notebook');assert(g.answer(0,true));assert(!g.answer(0,true));assert.equal(g.count,1);});
test('five correct answers unlock normal ending',()=>{const g=new Game();for(let i=0;i<5;i++)g.answer(i,true);Object.assign(g.player,g.exit);g.interact();assert.equal(g.status,'won');});
test('two deliberate errors reveal secret ending',()=>{const g=new Game();for(let i=0;i<5;i++)g.answer(i,i>1);assert.equal(g.mistakes,2);assert.equal(g.secretsOpened,2);Object.assign(g.player,g.secret);g.interact();assert.equal(g.status,'secret');});
test('perfect answers keep secret locked',()=>{const g=new Game();for(let i=0;i<5;i++)g.answer(i,true);Object.assign(g.player,g.secret);g.interact();assert.equal(g.status,'playing');});
test('bell distracts and cooldown prevents repeated activation',()=>{const g=new Game();Object.assign(g.player,g.bell);g.interact();assert.equal(g.distraction,16);assert.equal(g.interact().type,'cooldown');});
test('contact ends the run after grace',()=>{const g=new Game();g.time=13;Object.assign(g.baldi,g.player);g.update(.01,{});assert.equal(g.status,'lost');});
test('grace protects opening',()=>{const g=new Game();Object.assign(g.baldi,g.player);g.update(.01,{});assert.equal(g.status,'playing');});
test('stationary distant player does not become an omniscient target',()=>{const g=new Game();g.time=13;g.update(.01,{});assert.notEqual(g.target.x,g.player.x);});
test('simulation remains finite through 30 seconds',()=>{const g=new Game();for(let i=0;i<1800;i++)g.update(1/60,{forward:i%120<60?1:-1,turn:.2});assert(Number.isFinite(g.baldi.x));assert(Number.isFinite(g.player.x));});

// Regression tests for the v1.1 debug pass.
test('answer preserves actual elapsed time and ends grace without a time jump',()=>{const g=new Game();g.update(.05,{});const t=g.time;g.answer(0,true);assert.equal(g.time,t);assert.equal(g.grace,0);g.update(.05,{});assert.equal(g.grace,0);});
test('large moves sweep walls instead of tunneling',()=>{const g=new Game(),p={x:2.5,y:7.5};g.move(p,4,0);assert(p.x<3);assert(g.canStand(p.x,p.y));});
test('non-finite inputs cannot corrupt position, rotation, or time',()=>{const g=new Game();g.update(.05,{forward:NaN,strafe:Infinity,turn:Infinity});assert([g.player.x,g.player.y,g.player.angle,g.time].every(Number.isFinite));g.update(Infinity,{forward:1});assert(Number.isFinite(g.time));});
test('zero and negative dt leave the simulation unchanged',()=>{const g=new Game(),before=JSON.stringify(g);g.update(0,{forward:1});g.update(-1,{forward:1});assert.equal(JSON.stringify(g),before);});
test('diagonal movement has the same total speed as straight movement',()=>{const a=new Game(),b=new Game();Object.assign(a.player,{x:7.5,y:7.5});Object.assign(b.player,{x:7.5,y:7.5});a.update(.05,{forward:1});b.update(.05,{forward:1,strafe:1});assert(Math.abs(Math.hypot(a.player.x-7.5,a.player.y-7.5)-Math.hypot(b.player.x-7.5,b.player.y-7.5))<1e-9);});
test('sprint exhaustion uses hysteresis instead of alternating every frame',()=>{const g=new Game();g.player.stamina=.02;for(let i=0;i<30;i++){g.update(1/60,{forward:1,sprint:true});assert.equal(g.isSprinting,false);}assert(g.player.stamina>.02);assert.equal(g.exhausted,true);});
test('rest restores stamina and unlocks sprint',()=>{const g=new Game();g.player.stamina=.02;for(let i=0;i<150;i++)g.update(1/60,{});assert(g.player.stamina>.28);g.update(1/60,{forward:1,sprint:true});assert(g.isSprinting);assert(!g.exhausted);});
test('running against a wall does not emit continuous footstep noise',()=>{const g=new Game();g.player.x=2.2;g.player.angle=Math.PI;g.noise=0;g.update(.05,{forward:1,sprint:true});assert.equal(g.isMoving,false);assert.equal(g.noise,0);});
test('line of sight rejects walls, invalid endpoints, and void cells',()=>{const g=new Game();assert.equal(g.lineOfSight({x:2.5,y:7.5},{x:6.5,y:7.5}),false);assert.equal(g.lineOfSight({x:NaN,y:2},g.player),false);assert.equal(g.lineOfSight({x:0,y:0},g.player),false);});
test('pathfinding handles invalid targets without throwing',()=>{const g=new Game();assert.deepEqual(g.pathTo(g.player,{x:-3,y:5}),[]);assert.deepEqual(g.pathTo(g.player,null),[]);});
test('all five mistakes preserve objective reachability',()=>{const g=new Game();for(let i=0;i<5;i++)g.answer(i,false);for(const t of [...g.notebooks,g.exit,g.secret,g.bell])assert(g.pathTo(g.player,t).length||Math.hypot(g.player.x-t.x,g.player.y-t.y)<1);assert.equal(g.mistakes,5);});
test('finished games ignore movement, answers and interactions',()=>{const g=new Game();g.status='won';const before=JSON.stringify(g);g.update(.05,{forward:1});assert.equal(g.answer(0,true),false);assert.equal(g.interact(),null);assert.equal(JSON.stringify(g),before);});
test('bell cooldown and distraction count down during opening grace',()=>{const g=new Game();Object.assign(g.player,g.bell);g.interact();g.update(.05,{});assert(g.bellCooldown<25);assert(g.distraction<16);});
test('Baldi completes a multi-corner chase without entering walls',()=>{const g=new Game();g.time=13;g.grace=0;g.target={...g.exit};for(let i=0;i<6000&&g.status==='playing';i++){g.update(1/60,{});assert(g.canStand(g.baldi.x,g.baldi.y));}assert.equal(g.status,'lost');assert(g.time<90);});
function traverse(g,target,dt){
 const waypoints=g.pathTo(g.player,target);if(!waypoints.length)waypoints.push(target);
 for(const w of waypoints){let frames=0;while(Math.hypot(g.player.x-w.x,g.player.y-w.y)>.07){assert.equal(g.status,'playing');assert(++frames<1000,'route gets stuck');g.player.angle=Math.atan2(w.y-g.player.y,w.x-g.player.x);g.update(dt,{forward:1,sprint:true});assert(g.canStand(g.player.x,g.player.y));}}
}
for(const fps of [30,60,120])test('complete physical route to normal ending at '+fps+' fps',()=>{const g=new Game();for(const id of [0,1,3,4,2]){traverse(g,g.notebooks[id],1/fps);assert.equal(g.interact().type,'notebook');g.answer(id,true);}traverse(g,g.exit,1/fps);g.interact();assert.equal(g.status,'won');assert(g.time<90);});
test('complete physical route to secret ending with two mistakes',()=>{const g=new Game();for(const id of [0,1,3,4,2]){traverse(g,g.notebooks[id],1/60);g.answer(id,id!==0&&id!==1);}traverse(g,g.exit,1/60);traverse(g,g.secret,1/60);g.interact();assert.equal(g.status,'secret');});
console.log('ENGINE: '+checks+'/'+checks+' PASS');
