// Bayang di Galeri — the gallery floor plan and every spatial query.
// The map is 18 rows of exactly 32 characters. Legend:
//   # wall (blocks movement and sight)   . gallery floor
//   C display crate (blocks movement and sight, hide behind it)
//   B ornamental bush (walkable; hidden inside unless a guard is very close)
//   P player start   E emergency exit   * loot (lantern at (16,15), coins elsewhere)
import { COLS, ROWS, TILE } from './config.js';

export const LEVEL_MAP = [
  '################################',
  '#P...C......#.....B....#....E..#',
  '#.....C...#........#.....C.....#',
  '#.###....#......C.......#..C...#',
  '#.#......#..####....B...#......#',
  '#.#..B...#..#..#....#...#..*...#',
  '#.#......#..#..#....#...#......#',
  '#....C...#..#..#....#....C.....#',
  '#.####...#..#..#....####.......#',
  '#....#...#.....#....#....#.....#',
  '#.C..#...#..B..#....#..C.#..*..#',
  '#....#...#.....#....#....#.....#',
  '#.####...#..####....#....#.....#',
  '#....C......#...C..#..B....C...#',
  '#..B....C....#......#......#...#',
  '#....C......#...*..#.......#...#',
  '#......C.....#......#....C.....#',
  '################################',
];

export function parseLevelMap(rows = LEVEL_MAP) {
  const grid = rows.map((row) => row.split(''));
  const crates = [];
  const bushes = [];
  const loot = [];
  let playerStart = { x: TILE * 1.5, y: TILE * 1.5 };
  let exitTile = { col: 28, row: 1 };
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const cell = grid[row][col];
      const cx = col * TILE + TILE / 2;
      const cy = row * TILE + TILE / 2;
      if (cell === 'C') crates.push({ col, row, x: cx, y: cy });
      else if (cell === 'B') bushes.push({ col, row, x: cx, y: cy });
      else if (cell === 'P') playerStart = { x: cx, y: cy };
      else if (cell === 'E') exitTile = { col, row, x: cx, y: cy };
      else if (cell === '*') {
        // The lantern sits at (16,15); every other star is an ancient coin.
        const kind = col === 16 && row === 15 ? 'lantern' : 'coin';
        loot.push({ col, row, x: cx, y: cy, kind, taken: false });
      }
    }
  }
  return { grid, crates, bushes, loot, playerStart, exitTile };
}

export function tileAt(level, px, py) {
  const col = Math.floor(px / TILE);
  const row = Math.floor(py / TILE);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return '#';
  return level.grid[row][col];
}

export function isWallAt(level, px, py) {
  return tileAt(level, px, py) === '#';
}

export function isSolidAt(level, px, py) {
  const cell = tileAt(level, px, py);
  return cell === '#' || cell === 'C';
}

export function blocksVisionAt(level, px, py) {
  const cell = tileAt(level, px, py);
  return cell === '#' || cell === 'C';
}

export function isInBush(level, px, py) {
  return tileAt(level, px, py) === 'B';
}

// The southern corridor (rows 13-16) is unlit: detection fills half as fast there.
export function isInShadow(level, px, py) {
  const row = Math.floor(py / TILE);
  return row >= 13 && row <= 16;
}

export function findPlayerStart(level) {
  return { ...level.playerStart };
}

export function findExitTile(level) {
  return { ...level.exitTile };
}

export function findLootSpots(level) {
  return level.loot;
}

export function tileCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}
