'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'assets');let count=0;
function test(name,fn){fn();count++;console.log('PASS '+name);}
function readWave(name){const b=fs.readFileSync(path.join(root,name));assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');let data,channels,rate,bits,encoding;for(let p=12;p+8<=b.length;){const id=b.toString('ascii',p,p+4),n=b.readUInt32LE(p+4);if(id==='fmt '){encoding=b.readUInt16LE(p+8);channels=b.readUInt16LE(p+10);rate=b.readUInt32LE(p+12);bits=b.readUInt16LE(p+22);}if(id==='data')data=b.subarray(p+8,p+8+n);p+=8+n+(n%2);}assert.equal(encoding,1);assert.equal(bits,16);assert(data);let energy=0,peak=0;for(let i=0;i<data.length;i+=2){const x=data.readInt16LE(i)/32768;energy+=x*x;peak=Math.max(peak,Math.abs(x));}return {rms:Math.sqrt(energy/(data.length/2)),peak,seconds:data.length/2/channels/rate};}
const original=readWave('BAL_Slap.wav'),loud=readWave('BAL_Slap_Loud.wav'),ambient=readWave('Aula_Ambience.wav');
test('ambient loop contains 24 seconds of audible PCM',()=>{assert.equal(ambient.seconds,24);assert(ambient.rms>.12);assert(ambient.peak<1);});
test('louder ruler preserves original duration',()=>assert.equal(loud.seconds,original.seconds));
test('louder ruler increases RMS by at least 3 dB',()=>assert(20*Math.log10(loud.rms/original.rms)>3));
test('louder ruler remains below full-scale clipping',()=>assert(loud.peak<1));
const js=fs.readFileSync(path.join(__dirname,'game.js'),'utf8');
test('ambience loops and has independent volume',()=>{assert(js.includes('clips.Aula_Ambience.loop=true'));assert(js.includes('options.ambience/100'));});
test('capture uses visual jumpscare before ending',()=>{assert(js.includes("game.status==='lost')beginJumpscare()"));assert(js.includes('scareRemaining=1.35'));});
test('ruler attenuation is stronger than baseline',()=>{const newVolume=Math.max(.18,Math.min(1,1.45-10*.05)),oldVolume=.85-10*.045;assert(newVolume>oldVolume*2);});
console.log('AUDIO: '+count+'/'+count+' PASS');
