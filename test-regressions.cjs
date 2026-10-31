'use strict';
const path=require('node:path');
const {Game}=require(path.resolve(process.argv[2]||path.join(__dirname,'engine.js')));
let failed=0;
function check(name,fn){let ok=false;try{ok=Boolean(fn());}catch(e){}console.log((ok?'PASS: ':'FAIL: ')+name);if(!ok)failed++;}
check('answer preserves elapsed time',()=>{const g=new Game();for(let i=0;i<20;i++)g.update(.05,{});const before=g.time;g.answer(0,true);return Math.abs(g.time-before)<1e-9;});
check('movement cannot tunnel through a wall',()=>{const g=new Game(),p={x:2.5,y:7.5};g.move(p,4,0);return p.x<3;});
check('non-finite controls do not corrupt player angle',()=>{const g=new Game();g.update(.05,{turn:Infinity,forward:NaN,strafe:NaN});return Number.isFinite(g.player.angle)&&Number.isFinite(g.player.x)&&Number.isFinite(g.player.y);});
console.log('REGRESSIONS: '+(3-failed)+'/3 PASS');
process.exitCode=failed?1:0;
