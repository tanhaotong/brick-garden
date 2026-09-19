const assert = require('node:assert/strict'), E=require('./engine.js');
const board=(cols,rows,tiles)=>({cols,rows,tiles:tiles.map(([type,x,y],id)=>({id,type,x,y}))});
let s=board(5,4,[[0,0,0],[0,4,0],[1,2,1],[0,0,3]]);
assert.deepEqual(E.matches(s,0).sort(),[1,3]);
s.tiles.push({id:4,type:2,x:2,y:0}); assert.deepEqual(E.matches(s,0),[3]);
assert.equal(E.matches(board(3,3,[[0,0,0],[0,1,1]]),0).length,0);
s=board(5,3,[[0,0,0],[1,1,0],[2,2,0],[0,1,2]]);
const n=E.step(s,0,1,0);assert.deepEqual(n.tiles.slice(0,3).map(t=>t.x),[1,2,3]);assert.equal(s.tiles[0].x,0);
assert.deepEqual(E.matches(n,0),[3]);const r=E.remove(n,0,3);assert.equal(r.tiles.length,2);assert.equal(r.tiles[0].x,2);
assert.equal(E.step(board(3,1,[[0,0,0],[1,1,0],[0,2,0]]),0,1,0),null);
assert.equal(E.findMove(board(2,2,[[0,0,0],[1,1,0],[1,0,1],[0,1,1]])),null);
const dead=board(2,2,[[0,0,0],[1,1,0],[1,0,1],[0,1,1]]);assert.ok(E.findMove(E.shuffle(dead)));
assert.ok(E.findMove(s)); assert.equal(E.remove(board(2,1,[[0,0,0],[0,1,0]]),0,1).tiles.length,0);
for(let i=0;i<30;i++){let b=E.generate();assert.equal(b.tiles.length,140);assert.ok(E.findMove(b));const counts={};b.tiles.forEach(t=>counts[t.type]=(counts[t.type]||0)+1);assert.ok(Object.values(counts).every(c=>c%2===0));}
console.log('Passed: line of sight, blockers, diagonals, chain pushing, retained positions, edges, deadlock, shuffle, moves, victory, 30 generated boards.');
