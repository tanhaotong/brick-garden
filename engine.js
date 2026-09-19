(function (root) {
  'use strict';
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const copy = s => ({ cols: s.cols, rows: s.rows, tiles: s.tiles.map(t => ({ ...t })) });
  const at = (s, x, y) => s.tiles.find(t => t.x === x && t.y === y);
  const inside = (s, x, y) => x >= 0 && y >= 0 && x < s.cols && y < s.rows;
  function matches(s, id) {
    const tile = s.tiles.find(t => t.id === id);
    if (!tile) return [];
    const result = [];
    for (const [dx, dy] of dirs) {
      for (let x = tile.x + dx, y = tile.y + dy; inside(s, x, y); x += dx, y += dy) {
        const other = at(s, x, y);
        if (other) { if (other.type === tile.type) result.push(other.id); break; }
      }
    }
    return result;
  }
  // Move one grid cell; a contiguous line can be pushed only if its far end has space.
  function step(s, id, dx, dy) {
    if (!dirs.some(d => d[0] === dx && d[1] === dy)) return null;
    const next = copy(s), tile = next.tiles.find(t => t.id === id);
    if (!tile) return null;
    const line = [tile];
    let x = tile.x + dx, y = tile.y + dy;
    while (inside(next, x, y) && at(next, x, y)) {
      line.push(at(next, x, y)); x += dx; y += dy;
    }
    if (!inside(next, x, y)) return null;
    line.forEach(t => { t.x += dx; t.y += dy; });
    return next;
  }
  function remove(s, id, target) {
    if (!matches(s, id).includes(target)) throw new Error('Invalid pair');
    const next = copy(s); next.tiles = next.tiles.filter(t => t.id !== id && t.id !== target); return next;
  }
  // Find one legal release position for the hint. Players can pass it and use later positions.
  function findMove(s) {
    for (const t of s.tiles) {
      const candidates = matches(s, t.id);
      if (candidates.length) return { id: t.id, targets: candidates, dx: 0, dy: 0, steps: 0, state: copy(s) };
    }
    for (const t of s.tiles) for (const [dx, dy] of dirs) {
      let next = s;
      for (let steps = 1; steps <= Math.max(s.cols, s.rows); steps++) {
        next = step(next, t.id, dx, dy);
        if (!next) break;
        const candidates = matches(next, t.id);
        if (candidates.length) return { id: t.id, targets: candidates, dx, dy, steps, state: next };
      }
    }
    return null;
  }
  function shuffle(s, rng = Math.random) {
    const next = copy(s);
    if (next.tiles.length < 2) return next;
    const positions = next.tiles.map(t => ({ x: t.x, y: t.y }));
    for (let attempt = 0; attempt < 120; attempt++) {
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1)); [positions[i], positions[j]] = [positions[j], positions[i]];
      }
      next.tiles.forEach((t, i) => Object.assign(t, positions[i]));
      if (findMove(next)) return next;
    }
    // Guarantee a visible pair while preserving the multiset and all occupied cells.
    // Choose an occupied pair that sees each other; putting two equal types there
    // guarantees a move even when the first occupied cell is isolated.
    let first = next.tiles[0];
    const visible = next.tiles.find(a => next.tiles.some(b => a.id !== b.id && (a.x === b.x || a.y === b.y)));
    if (visible) first = visible;
    const mate = next.tiles.find(t => t.id !== first.id && t.type === first.type);
    if (!mate) throw new Error('Board must contain pairs');
    for (const [dx, dy] of dirs) for (let x = first.x + dx, y = first.y + dy; inside(next, x, y); x += dx, y += dy) {
      const neighbor = at(next, x, y);
      if (neighbor) {
        const p = { x: neighbor.x, y: neighbor.y };
        Object.assign(neighbor, { x: mate.x, y: mate.y }); Object.assign(mate, p);
        return next;
      }
    }
    throw new Error('No legal shuffle found without changing occupied cells');
  }
  function generate(cols = 10, rows = 14, kinds = 18, rng = Math.random) {
    const types = [];
    for (let i = 0; i < cols * rows / 2; i++) types.push(i % kinds, i % kinds);
    const s = { cols, rows, tiles: types.map((type, id) => ({ id, type, x: id % cols, y: Math.floor(id / cols) })) };
    return shuffle(s, rng);
  }
  function tutorial() {
    return { cols: 6, rows: 8, tiles: [
      [0,0,0],[0,1,0], [1,3,0],[1,5,0],
      [2,1,2],[2,4,3], [3,3,2],[3,5,3],
      [4,0,5],[4,2,5], [5,0,6],[5,0,7],
      [6,3,6],[6,5,6], [7,3,7],[7,5,7]
    ].map(([type,x,y], id) => ({ id,type,x,y })) };
  }
  const api = { dirs, copy, at, inside, matches, step, remove, findMove, shuffle, generate, tutorial };
  if (typeof module !== 'undefined') module.exports = api;
  else root.BrickEngine = api;
})(globalThis);
