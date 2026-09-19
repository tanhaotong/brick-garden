// Exercise the actual UI handlers with a minimal DOM and controlled animation clock.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
class El {
  constructor(){this.children=[];this.dataset={};this.events={};this.props={};this.style={setProperty:(k,v)=>this.props[k]=v};this.classes=new Set();this.classList={add:(...xs)=>xs.forEach(x=>this.classes.add(x)),remove:(...xs)=>xs.forEach(x=>this.classes.delete(x)),toggle:(x,on)=>on?this.classes.add(x):this.classes.delete(x)};}
  set className(s){this.classes=new Set(s.split(' '));} get className(){return [...this.classes].join(' ');}
  set innerHTML(s){this.children=[new El()];}get firstChild(){return this.children[0];}
  append(...els){els.forEach(el=>{el.parent=this;this.children.push(el);});}appendChild(el){this.append(el);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(el=>el!==this);}
  querySelectorAll(sel){return this.children.filter(el=>sel.startsWith('.')?el.classes.has(sel.slice(1)):String(el.dataset.id)===sel.match(/"(.*?)"/)[1]);}
  querySelector(sel){return this.querySelectorAll(sel)[0]||null;}
  setAttribute(){} addEventListener(name,fn){this.events[name]=fn;}setPointerCapture(){}getBoundingClientRect(){return {left:0,top:0,width:300,height:400};}
  closest(){return this;}showModal(){}close(){}
}
const els=new Map(),get=id=>{if(!els.has(id))els.set(id,new El());return els.get(id);};
let timers=[],frames=[];
const ctx=vm.createContext({BrickEngine:require('./engine.js'),document:{getElementById:get,createElement:()=>new El(),querySelectorAll:()=>[],addEventListener:()=>{}},localStorage:{getItem:()=>null,setItem:()=>{}},setTimeout:(fn,ms)=>timers.push({fn,ms}),requestAnimationFrame:fn=>(frames.push(fn),frames.length),cancelAnimationFrame:()=>{},Date,console});
vm.runInContext(fs.readFileSync('app.js','utf8'),ctx);
const run=s=>vm.runInContext(s,ctx), b=get('board');
run("newGame('classic')");
assert.equal(run('new Set(icons).size'),48);
assert.equal(run('new Set(state.tiles.map(t=>t.type)).size'),48);
assert.equal(run('state.tiles.every(t=>!!icons[t.type])'),true);
run("newGame('small')");
assert.equal(run('new Set(state.tiles.map(t=>t.type)).size'),16);
function setup(tiles){timers=[];frames=[];b.children=[];run(`state={cols:6,rows:8,tiles:${JSON.stringify(tiles.map(([type,x,y],id)=>({type,x,y,id})))}};history=[];busy=false;pending=drag=selected=null;render();`);}
function down(id=0){b.events.pointerdown({button:0,pointerId:1,clientX:0,clientY:0,target:b.querySelector(`[data-id="${id}"]`)});}
function move(x,y=0){b.events.pointermove({pointerId:1,clientX:x,clientY:y});while(frames.length)frames.shift()();}
function up(x,y=0){b.events.pointerup({pointerId:1,clientX:x,clientY:y});}
setup([[0,0,0],[0,1,2],[1,1,0],[1,4,4]]);down();move(25);
assert.equal(run('state.tiles.length'),4);assert.match(b.querySelector('[data-id="0"]').style.transform,/25px/);assert.equal(b.querySelectorAll('.axis-highlight').length,2);
move(50);assert.equal(run('drag.ready'),true);assert.equal(run('busy'),false);assert.equal(run('state.tiles.length'),4);
up(50);assert.equal(run('busy'),true);assert.equal(b.querySelectorAll('.bursting').length,2);assert.equal(b.querySelectorAll('.burst').length,2);assert.equal(run('state.tiles.length'),4);
timers.filter(t=>t.ms===620).forEach(t=>t.fn());assert.equal(run('state.tiles.length'),2);assert.equal(run('state.tiles.find(t=>t.id===2).x'),2);
setup([[0,0,0],[0,1,2]]);down();move(50);move(10);up(10);assert.equal(run('state.tiles[0].x'),0);assert.equal(run('busy'),false);
setup([[0,0,0],[0,1,2]]);down();move(50);b.events.pointercancel();assert.equal(run('state.tiles[0].x'),0);assert.equal(b.querySelectorAll('.axis-highlight').length,0);
setup([[0,0,0],[0,4,0]]);down();up(0);assert.equal(run('busy'),true);assert.equal(b.querySelectorAll('.bursting').length,2);
setup([[0,0,1],[0,1,0],[0,1,3],[0,4,4]]);down();move(50);assert.equal(run('pending'),null);up(50);assert.equal(run('pending.targets.length'),2);assert.equal(run('busy'),false);run('tap(pending.targets[0])');assert.equal(run('busy'),true);
// Passing an earlier match must neither clamp the pointer nor retain its target.
setup([[0,0,0],[0,1,2],[0,3,2],[0,5,4]]);down();move(50);
assert.equal(run('drag.ready'),true);assert.equal(run('drag.targets[0]'),1);
move(100);assert.equal(run('state.tiles[0].x'),2);assert.equal(run('drag.ready'),false);
assert.equal(b.querySelectorAll('.match-preview').length,0);
move(150);assert.equal(run('state.tiles[0].x'),3);assert.equal(run('drag.targets[0]'),2);
assert.equal(run('busy'),false);up(150);
timers.filter(t=>t.ms===620).forEach(t=>t.fn());
assert.equal(run('state.tiles.some(t=>t.id===1)'),true);
assert.equal(run('state.tiles.some(t=>t.id===2)'),false);
// Overshooting to an unmatched position rolls back instead of consuming a crossed pair.
setup([[0,0,0],[0,1,2]]);down();move(50);move(100);up(100);
assert.equal(run('busy'),false);assert.equal(run('state.tiles[0].x'),0);
// The same pass-through behavior applies to vertical drags.
setup([[0,0,0],[0,2,1],[0,2,3],[0,4,5]]);down();move(0,50);move(0,150);
assert.equal(run('state.tiles[0].y'),3);assert.equal(run('drag.targets[0]'),2);up(0,150);
assert.equal(run('busy'),true);
// The initial push group stops at a new obstacle even with a large pointer jump.
setup([[0,0,0],[1,1,0],[2,3,0],[0,1,2]]);down();move(250);
assert.equal(run('state.tiles[0].x'),1);assert.equal(run('state.tiles[1].x'),2);
assert.equal(run('state.tiles[2].x'),3);
move(25);move(250);assert.equal(run('state.tiles[2].x'),3);
up(250);timers.filter(t=>t.ms===620).forEach(t=>t.fn());
assert.equal(run('state.tiles.length'),2);assert.equal(run('state.tiles.find(t=>t.id===1).x'),2);
assert.equal(run('state.tiles.find(t=>t.id===2).x'),3);
// With no initial neighbor, contact cannot recruit one; reversal uses the original board.
setup([[0,2,0],[1,4,0],[2,0,0]]);down();move(250);
assert.equal(run('state.tiles[0].x'),3);assert.equal(run('state.tiles[1].x'),4);
move(-250);assert.equal(run('state.tiles[0].x'),1);assert.equal(run('state.tiles[2].x'),0);
up(-250);assert.equal(run('state.tiles[0].x'),2);
setup([[0,0,0],[1,0,1],[2,0,4]]);down();move(0,350);
assert.equal(run('state.tiles[0].y'),2);assert.equal(run('state.tiles[1].y'),3);
assert.equal(run('state.tiles[2].y'),4);b.events.pointercancel();
assert.equal(run('state.tiles[0].y'),0);
console.log('PASS: motion, release, matching, frozen push groups, obstacle collision, reversal and cancellation.');
