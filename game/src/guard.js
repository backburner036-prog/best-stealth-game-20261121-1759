// Bayang di Galeri — guard AI: patrol waypoints, vision cones, suspicion.
// States: patrol -> suspicious -> investigate -> chase (alarm) -> search -> return.
import {
  ALARM_LEVELS, DETECTION_RATES, GUARD_PATROL, VISION_CONE,
} from './config.js';
import { blocksVisionAt, tileCenter } from './level.js';

export const GUARD_PATROL_STATE = 'patrol';
export const GUARD_SUSPICIOUS = 'suspicious';
export const GUARD_INVESTIGATE = 'investigate';
export const GUARD_CHASE = 'chase';
export const GUARD_SEARCH = 'search';
export const GUARD_RETURN = 'return';

export function createGuard(def, index) {
  const first = tileCenter(def.waypoints[0][0], def.waypoints[0][1]);
  return {
    name: def.name,
    index,
    baseSpeed: def.speed,
    waypoints: def.waypoints.map(([col, row]) => tileCenter(col, row)),
    waypointIndex: 1,
    x: first.x,
    y: first.y,
    facing: 0,
    state: GUARD_PATROL_STATE,
    waitTimer: 0,
    scanPhase: 0,
    target: null,
    lastSeen: null,
    lostTimer: 0,
    searchTimer: 0,
    meter: 0,
    speed: def.speed,
    coneRange: VISION_CONE.RANGE,
  };
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function moveToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  guard.x += (dx / dist) * step;
  guard.y += (dy / dist) * step;
  guard.facing = angleTo(guard.x, guard.y, tx, ty);
  return dist - step < 1.5;
}

// Line of sight: sample the segment every 6 px; a wall or crate blocks it.
export function hasLineOfSight(level, ax, ay, bx, by) {
  const dist = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    if (blocksVisionAt(level, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}

export function guardSeesPlayer(guard, player, level) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > guard.coneRange) return { seen: false, dist };
  const half = (VISION_CONE.HALF_ANGLE_DEGREES * Math.PI) / 180;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), guard.facing)) > half && dist > 30) {
    return { seen: false, dist };
  }
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) {
    return { seen: false, dist };
  }
  return { seen: true, dist };
}

// The cone polygon: cast rays across the cone; each ray stops at a wall or
// at the cone range, so the drawn cone is cut by walls and crates.
export function updateGuardVisionCone(guard, level) {
  const half = (VISION_CONE.HALF_ANGLE_DEGREES * Math.PI) / 180;
  const points = [{ x: guard.x, y: guard.y }];
  const rays = VISION_CONE.RAYS;
  for (let i = 0; i <= rays; i += 1) {
    const a = guard.facing - half + ((2 * half * i) / rays);
    let reach = guard.coneRange;
    for (let d = 8; d <= guard.coneRange; d += 8) {
      const px = guard.x + Math.cos(a) * d;
      const py = guard.y + Math.sin(a) * d;
      if (blocksVisionAt(level, px, py)) {
        reach = d - 8;
        break;
      }
    }
    points.push({ x: guard.x + Math.cos(a) * reach, y: guard.y + Math.sin(a) * reach });
  }
  return points;
}

export function applyAlarmEscalation(guard, alarmLevel) {
  const speedBonus = 1 + ALARM_LEVELS.SPEED_BONUS_PER_ALARM * alarmLevel;
  const rangeBonus = 1 + ALARM_LEVELS.RANGE_BONUS_PER_ALARM * alarmLevel;
  guard.speed = guard.baseSpeed * speedBonus;
  guard.coneRange = VISION_CONE.RANGE * rangeBonus;
}

export function updateGuard(guard, dt, level, player, alarmActive) {
  const speed = guard.speed;
  if (guard.state === GUARD_PATROL_STATE) {
    const target = guard.waypoints[guard.waypointIndex];
    if (guard.waitTimer > 0) {
      guard.waitTimer -= dt;
      // Sweep the view +/-60 degrees while waiting at a waypoint.
      guard.scanPhase += dt;
      const sweep = (GUARD_PATROL.SCAN_SWEEP_DEGREES * Math.PI) / 180;
      guard.facing += Math.sin(guard.scanPhase * 2.2) * sweep * dt * 0.9;
      if (guard.waitTimer <= 0) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
      }
      return;
    }
    if (moveToward(guard, target.x, target.y, speed, dt)) {
      guard.waitTimer = GUARD_PATROL.WAIT_SECONDS;
      guard.scanPhase = 0;
    }
    return;
  }
  if (guard.state === GUARD_SUSPICIOUS) {
    // Stop, turn toward the player, then walk to the last seen spot.
    guard.facing = angleTo(guard.x, guard.y, player.x, player.y);
    guard.state = GUARD_INVESTIGATE;
    guard.target = guard.lastSeen ? { ...guard.lastSeen } : { x: player.x, y: player.y };
    return;
  }
  if (guard.state === GUARD_INVESTIGATE) {
    const target = guard.target ?? { x: player.x, y: player.y };
    if (moveToward(guard, target.x, target.y, GUARD_PATROL.INVESTIGATE_SPEED, dt)) {
      guard.state = GUARD_SEARCH;
      guard.searchTimer = ALARM_LEVELS.SEARCH_SECONDS;
    }
    return;
  }
  if (guard.state === GUARD_CHASE) {
    moveToward(guard, player.x, player.y, GUARD_PATROL.CHASE_SPEED, dt);
    return;
  }
  if (guard.state === GUARD_SEARCH) {
    guard.searchTimer -= dt;
    guard.scanPhase += dt;
    const sweep = (GUARD_PATROL.SCAN_SWEEP_DEGREES * Math.PI) / 180;
    guard.facing += Math.sin(guard.scanPhase * 2.0) * sweep * dt * 0.9;
    if (guard.searchTimer <= 0) {
      guard.state = GUARD_RETURN;
    }
    return;
  }
  if (guard.state === GUARD_RETURN) {
    // Walk back to the nearest waypoint, then resume the patrol loop.
    let best = guard.waypoints[0];
    let bestDist = Infinity;
    for (const point of guard.waypoints) {
      const d = Math.hypot(point.x - guard.x, point.y - guard.y);
      if (d < bestDist) {
        bestDist = d;
        best = point;
      }
    }
    if (moveToward(guard, best.x, best.y, GUARD_PATROL.RETURN_SPEED, dt)) {
      guard.waypointIndex = guard.waypoints.indexOf(best);
      guard.state = GUARD_PATROL_STATE;
      guard.waitTimer = 0.2;
    }
  }
}

export function guardCatchDistance() {
  return GUARD_PATROL.CATCH_DISTANCE;
}
