const assert = require('node:assert/strict'), E=require('./engine.js');
const board=(cols,rows,tiles)=>({cols,rows,tiles:tiles.map(([type,x,y],id)=>({id,type,x,y}))});
for (const [cols,rows,kinds,expectedKinds] of [[10,14,48,48],[6,8,16,16],[10,14,18,35]]) {
  for (let i=0;i<10;i++) {
    const generated=E.generate(cols,rows,kinds), counts=new Map();
    generated.tiles.forEach(t=>counts.set(t.type,(counts.get(t.type)||0)+1));
    assert.equal(generated.tiles.length,cols*rows);
    assert.equal(counts.size,expectedKinds);
    assert.ok([...counts.values()].every(n=>n===2||n===4));
    assert.ok(E.findMove(generated));
    const shuffled=E.shuffle(generated);
    assert.deepEqual(shuffled.tiles.map(t=>t.type),generated.tiles.map(t=>t.type));
  }
}
// Freeze the initial group in all four directions, including crossing multiple empty cells.
for (const [dx,dy] of E.dirs) {
  const origin={x:dx<0?6:0,y:dy<0?6:0};
  const tiles=[0,1,4].map((distance,id)=>[id,origin.x+dx*distance,origin.y+dy*distance]);
  const initial=board(7,7,tiles), group=E.pushGroup(initial,0,dx,dy);
  assert.deepEqual(group,[0,1]);
  let current=E.step(initial,0,dx,dy,group);
  current=E.step(current,0,dx,dy,group);
  assert.equal(E.step(current,0,dx,dy,group),null);
  assert.deepEqual(current.tiles[2],initial.tiles[2]);
  assert.equal(current.tiles[0].x,origin.x+2*dx);
  assert.equal(current.tiles[0].y,origin.y+2*dy);
  // A genuinely new gesture may capture the newly adjacent tile.
  assert.deepEqual(E.pushGroup(current,0,dx,dy),[0,1,2]);
}
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
