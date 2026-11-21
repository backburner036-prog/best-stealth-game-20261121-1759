// Bayang di Galeri — the player: Rara, the shadow thief.
import { PEBBLE, PEBBLE_MAX, PLAYER } from './config.js';
import { isSolidAt } from './level.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    radius: PLAYER.RADIUS,
    facing: 0,
    sneaking: false,
    moving: false,
    pebbles: PEBBLE_MAX,
    coins: 0,
    hasLantern: false,
  };
}

export function movePlayer(player, dx, dy, dt, level) {
  const speed = PLAYER.WALK_SPEED * (player.sneaking ? PLAYER.SNEAK_FACTOR : 1);
  player.moving = dx !== 0 || dy !== 0;
  if (!player.moving) return;
  const len = Math.hypot(dx, dy);
  const nx = (dx / len) * speed * dt;
  const ny = (dy / len) * speed * dt;
  player.facing = Math.atan2(dy, dx);
  // Axis-separated movement so Rara slides along walls instead of sticking.
  if (!hitsSolid(player, player.x + nx, player.y, level)) player.x += nx;
  if (!hitsSolid(player, player.x, player.y + ny, level)) player.y += ny;
}

function hitsSolid(player, x, y, level) {
  const r = player.radius - 2;
  return (
    isSolidAt(level, x - r, y - r)
    || isSolidAt(level, x + r, y - r)
    || isSolidAt(level, x - r, y + r)
    || isSolidAt(level, x + r, y + r)
  );
}

// How far away a guard can hear Rara's steps: silent while sneaking.
export function playerNoiseRadius(player) {
  if (!player.moving) return 0;
  return player.sneaking ? PLAYER.NOISE_SNEAK : PLAYER.NOISE_WALK;
}

// Throw a pebble toward a clicked point. Returns the pebble or null when out.
export function throwPebble(player, targetX, targetY) {
  if (player.pebbles <= 0) return null;
  player.pebbles -= 1;
  return { x: targetX, y: targetY, timer: PEBBLE.RING_SECONDS, max: PEBBLE.RING_SECONDS };
}
