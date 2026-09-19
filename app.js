'use strict';
const E = BrickEngine, $ = id => document.getElementById(id);
const icons = ['🌽','🥕','🍅','🥦','🍆','🫑','🍋','🍒','🌻','🌷','🍄','🌿','🪵','🧤','🪣','🧅','🍀','🍉',
  '🍇','🍌','🍍','🥝','🥥','🌵','🐱','🐶','🐼','🐸','🦊','🐷','🐙','🦋','🐝','🐢',
  '🐳','🦀','⭐','🌙','🔥','❄️','🌈','⚽','🏀','🎲','🎸','🎁','🔑','💎'];
const saveKey = 'brick-garden-v1';
let state, history = [], selected = null, pending = null, drag = null, hinted = null, combo = 0, lastPair = 0, busy = false;
let mode = 'classic', dead = false, requestedMode = null, suppressClickUntil = 0;
let dragFrame = 0;
function message(text) { $('status').textContent = text; }
function save() { try { localStorage.setItem(saveKey, JSON.stringify({ state, mode })); } catch (_) {} }
function newGame(m = mode) {
  mode = m; $('mode').value = m;
  state = m === 'tutorial' ? E.tutorial() : m === 'small' ? E.generate(6,8,16) : E.generate(10,14,icons.length);
  history = []; selected = pending = drag = hinted = null; combo = 0; $('combo').textContent = '';
  render(); settle(); save();
}
function render() {
  const board = $('board');
  board.style.setProperty('--cols', state.cols); board.style.setProperty('--rows', state.rows);
  board.style.aspectRatio = `${state.cols}/${state.rows}`;
  board.classList.toggle('choosing', !!pending);
  const ids = new Set(state.tiles.map(t => String(t.id)));
  board.querySelectorAll('.tile').forEach(el => { if (!ids.has(el.dataset.id)) el.remove(); });
  for (const t of state.tiles) {
    let el = board.querySelector(`[data-id="${t.id}"]`);
    if (!el) { el = document.createElement('button'); el.className = 'tile'; el.dataset.id = t.id; el.innerHTML = '<span></span>'; board.append(el); }
    el.firstChild.textContent = icons[t.type]; el.setAttribute('aria-label', `${icons[t.type]} 第${t.y+1}行第${t.x+1}列`);
    el.style.setProperty('--x', t.x); el.style.setProperty('--y', t.y);
    el.classList.toggle('selected', selected === t.id);
    el.classList.toggle('target', !!pending?.targets.includes(t.id));
    el.classList.toggle('hinted', !!hinted && (hinted.id === t.id || hinted.targets.includes(t.id)));
  }
  board.querySelectorAll('.landing').forEach(el => el.remove());
  if (hinted?.steps) {
    const t = hinted.state.tiles.find(t => t.id === hinted.id), el = document.createElement('div');
    el.className = 'landing'; el.style.setProperty('--x', t.x); el.style.setProperty('--y', t.y); board.append(el);
  }
  $('remaining').textContent = state.tiles.length;
  $('undo').disabled = !history.length || busy || !!pending;
  $('hint').disabled = !state.tiles.length || busy || !!pending;
  $('shuffle').disabled = !dead || busy || !!pending;
  $('win').hidden = !!state.tiles.length;
}
function settle() {
  dead = !!state.tiles.length && !E.findMove(state);
  message(!state.tiles.length ? '全部清空！' : dead ? '没有可以消除的一步了，点「打乱」继续。' : '相邻同类点一下就消除；拖动对齐后，松手消除。');
  render();
}
function shake(type) {
  for (const t of state.tiles.filter(t => t.type === type)) {
    const el = $('board').querySelector(`[data-id="${t.id}"]`); el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 450);
  }
}
function pair(id, target, before) {
  history.push(E.copy(before)); if (history.length > 50) history.shift();
  const next = E.remove(state, id, target);
  selected = pending = hinted = null; busy = true;
  render();
  // Keep both tiles in the DOM and the board state until their shared animation ends.
  for (const key of [id,target]) {
    const tile = state.tiles.find(t => t.id === key);
    const el = $('board').querySelector(`[data-id="${key}"]`);
    el.classList.remove('shake'); el.classList.add('bursting');
    const burst = document.createElement('div'); burst.className = 'burst';
    burst.style.left = `${(tile.x+.5)*100/state.cols}%`;
    burst.style.top = `${(tile.y+.5)*100/state.rows}%`;
    for(let i=0;i<12;i++) {
      const chip=document.createElement('i'), a=i*Math.PI/6, distance=22+(i%3)*10;
      chip.style.setProperty('--dx',`${Math.cos(a)*distance}px`);
      chip.style.setProperty('--dy',`${Math.sin(a)*distance}px`);
      chip.style.setProperty('--spin',`${(i%2?1:-1)*(120+i*25)}deg`);
      burst.append(chip);
    }
    $('board').append(burst);
  }
  const now = Date.now(); combo = now - lastPair < 5000 ? combo + 1 : 1; lastPair = now;
  $('combo').textContent = combo > 1 ? `${combo} 连击 ✦` : '✦';
  setTimeout(() => {
    state=next; busy=false;
    $('board').querySelectorAll('.burst').forEach(el=>el.remove());
    settle(); save();
  }, 620);
  setTimeout(() => { if (lastPair === now) $('combo').textContent = ''; }, 1400);
}
function offer(id, targets, before) {
  if (targets.length === 1) pair(id, targets[0], before);
  else { selected = id; pending = { id, targets, before }; render(); message('有多个同类可消除：点选一块发亮的目标。按 Esc 可取消。'); }
}
function tap(id) {
  if (busy) return;
  if (pending) { if (pending.targets.includes(id)) pair(pending.id, id, pending.before); return; }
  const tile = state.tiles.find(t => t.id === id); if (!tile) return;
  hinted = null; selected = id; render(); shake(tile.type);
  const targets=E.matches(state,id);
  if(targets.length) { offer(id,targets,E.copy(state)); return; }
  message('同类砖块已抖动：沿直线拖动，对齐同类后松手。');
}
function dragPath(d, sign) {
  if(d.paths[sign]) return d.paths[sign];
  const path=[d.before], dx=d.axis==='x'?sign:0, dy=d.axis==='y'?sign:0;
  const group=E.pushGroup(d.before,d.id,dx,dy);
  for(let i=0;i<Math.max(state.cols,state.rows);i++) {
    const next=E.step(path[path.length-1],d.id,dx,dy,group); if(!next)break;
    path.push(next);
  }
  return d.paths[sign]={path};
}
function paintDrag() {
  dragFrame=0; if(!drag || !drag.moved)return;
  const d=drag, v=d.axis==='x'?d.vx:d.vy, unit=d.axis==='x'?d.cw:d.ch;
  const {path}=dragPath(d,Math.sign(v)||1), max=path.length-1;
  let progress=Math.min(Math.abs(v)/unit,max);
  const aligned=Math.round(progress), targets=E.matches(path[aligned],d.id);
  // A match previews only the current alignment; it never truncates the path.
  d.ready=!!targets.length && Math.abs(progress-aligned)<=.13;
  if(d.ready)progress=aligned;
  const lo=Math.floor(progress), hi=Math.min(lo+1,max), fraction=progress-lo;
  const a=path[lo], b=path[hi];
  state=path[Math.round(progress)]; d.targets=d.ready?targets:[];
  for(let i=0;i<a.tiles.length;i++) {
    const t=a.tiles[i], to=b.tiles[i], original=d.before.tiles[i], el=d.elements.get(t.id);
    el.style.transform=`translate3d(${(t.x+(to.x-t.x)*fraction-original.x)*d.cw}px,${(t.y+(to.y-t.y)*fraction-original.y)*d.ch}px,0)`;
    el.classList.toggle('match-preview',d.ready&&(t.id===d.id||targets.includes(t.id)));
  }
  const t=state.tiles.find(t=>t.id===d.id);
  d.row.style.top=`${t.y*100/state.rows}%`;d.col.style.left=`${t.x*100/state.cols}%`;
  if(d.lastReady!==d.ready){message(d.ready?'已对齐，松手消除 ✦':'沿直线拖动；亮色行、列跟随砖块位置。');d.lastReady=d.ready;}
}
function endDragVisual(d) {
  cancelAnimationFrame(dragFrame);dragFrame=0;
  // Commit the fractional transform to pixels, then animate from that position to grid.
  for(const el of d.elements.values()) {
    const box=el.getBoundingClientRect(), boardBox=$('board').getBoundingClientRect();
    el.style.left=`${box.left-boardBox.left}px`;el.style.top=`${box.top-boardBox.top}px`;
    el.style.transform='';
  }
  d.row.remove();d.col.remove();
  void $('board').offsetWidth;
  $('board').classList.remove('dragging');
  for(const el of d.elements.values()){el.style.left='';el.style.top='';el.classList.remove('match-preview');}
}
$('board').addEventListener('pointerdown', e => {
  if (busy || drag || e.button !== 0 || e.isPrimary === false) return;
  const el = e.target.closest('.tile'); if (!el) return;
  const id = Number(el.dataset.id);
  if (pending) return;
  const rect = $('board').getBoundingClientRect();
  drag = { id, before: E.copy(state), px:e.clientX, py:e.clientY, cw:rect.width/state.cols, ch:rect.height/state.rows, axis:null, moved:false, pointer:e.pointerId, paths:{}, vx:0,vy:0,ready:false,targets:[] };
  $('board').setPointerCapture(e.pointerId);
});
$('board').addEventListener('pointermove', e => {
  if (!drag || drag.pointer !== e.pointerId || busy || pending) return;
  drag.vx=e.clientX-drag.px;drag.vy=e.clientY-drag.py;
  if (!drag.axis) {
    if(Math.hypot(drag.vx,drag.vy)<8)return;
    drag.axis=Math.abs(drag.vx)>Math.abs(drag.vy)?'x':'y';drag.moved=true;
    hinted=null;selected=drag.id;render();
    drag.elements=new Map([...$('board').querySelectorAll('.tile')].map(el=>[Number(el.dataset.id),el]));
    drag.row=document.createElement('div');drag.row.className='axis-highlight row-highlight';
    drag.col=document.createElement('div');drag.col.className='axis-highlight col-highlight';
    $('board').append(drag.row,drag.col);$('board').classList.add('dragging');
  }
  if(!dragFrame)dragFrame=requestAnimationFrame(paintDrag);
});
$('board').addEventListener('pointerup', e => {
  if (!drag || drag.pointer !== e.pointerId) return;
  if(drag.moved){drag.vx=e.clientX-drag.px;drag.vy=e.clientY-drag.py;paintDrag();}
  const old=drag; drag=null;
  if(old.moved){
    endDragVisual(old);suppressClickUntil=Date.now()+450;
    if(old.ready){render();offer(old.id,old.targets,old.before);}
    else {state=old.before;selected=null;render();message('这次没有形成消除，砖块回到原位。');}
  }
  else { tap(old.id); suppressClickUntil=Date.now()+450; }
});
function cancelDrag(){if(drag){const old=drag;drag=null;if(old.moved)endDragVisual(old);state=old.before;selected=null;render();}}
$('board').addEventListener('pointercancel',cancelDrag);
$('board').addEventListener('lostpointercapture',cancelDrag);
$('board').addEventListener('click', e => {
  if(Date.now()<suppressClickUntil) return;
  const el=e.target.closest('.tile'); if(el) tap(Number(el.dataset.id));
});
$('hint').onclick=()=>{
  if(busy||pending||drag) return;
  hinted=E.findMove(state); selected=null;
  if(!hinted){settle();return;}
  render();const t=state.tiles.find(t=>t.id===hinted.id);
  const direction=hinted.dx>0?'右':hinted.dx<0?'左':hinted.dy>0?'下':'上';
  message(hinted.steps?`将第 ${t.y+1} 行第 ${t.x+1} 列的 ${icons[t.type]} 向${direction}拖 ${hinted.steps} 格，到虚线框处松手。`:`点一下绿色标出的 ${icons[t.type]} 即可消除，中间空格不影响配对。`);
};
$('shuffle').onclick=()=>{if(!dead||busy||pending||drag)return;history.push(E.copy(state));state=E.shuffle(state);selected=hinted=null;settle();save();message('已打乱，图案数量和空位保留，现在有一步可消除。');};
$('undo').onclick=()=>{if(busy||pending||drag||!history.length)return;state=history.pop();selected=hinted=null;combo=0;$('combo').textContent='';settle();save();};
$('help').onclick=()=>$('rules').showModal();
document.querySelectorAll('.close,.close-rules').forEach(el=>el.onclick=()=>$('rules').close());
function requestNew(m){if(busy||pending||drag){$('mode').value=mode;return;}requestedMode=m;$('confirm').showModal();}
$('restart').onclick=()=>requestNew(mode);
$('mode').onchange=()=>requestNew($('mode').value);
$('cancel').onclick=()=>{$('mode').value=mode;$('confirm').close();};
$('confirm').addEventListener('cancel',()=>$('mode').value=mode);
$('confirm-new').onclick=()=>{$('confirm').close();newGame(requestedMode);};
$('again').onclick=()=>newGame();
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pending){state=pending.before;pending=selected=null;settle();}});
try {
  const saved=JSON.parse(localStorage.getItem(saveKey));
  if(!saved || !['classic','small','tutorial'].includes(saved.mode) || !Array.isArray(saved.state?.tiles)) throw new Error();
  const s=saved.state;
  if(!Number.isInteger(s.cols)||!Number.isInteger(s.rows)||s.cols<1||s.cols>10||s.rows<1||s.rows>14||s.tiles.length>s.cols*s.rows)throw new Error();
  if(s.tiles.some(t=>!Number.isInteger(t.id)||!Number.isInteger(t.type)||t.type<0||t.type>=icons.length||!Number.isInteger(t.x)||!Number.isInteger(t.y)||!E.inside(s,t.x,t.y)))throw new Error();
  if(new Set(s.tiles.map(t=>t.id)).size!==s.tiles.length||new Set(s.tiles.map(t=>`${t.x},${t.y}`)).size!==s.tiles.length)throw new Error();
  state=s;mode=saved.mode;$('mode').value=mode;settle();
} catch(_){newGame();}
