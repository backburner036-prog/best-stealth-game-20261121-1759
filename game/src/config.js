// Bayang di Galeri — all tuning numbers and the palette in one place.
// One screen, no scrolling: a 32 x 18 grid of 40 px tiles = 1280 x 720.
export const FIELD = { WIDTH: 1280, HEIGHT: 720 };
export const TILE = 40;
export const COLS = 32;
export const ROWS = 18;
export const STEP = 1 / 60;
export const BEST_KEY = 'bayang-di-galeri-best';
export const PEBBLE_MAX = 5;

export const PLAYER = {
  RADIUS: 13,
  WALK_SPEED: 150,
  SNEAK_FACTOR: 0.55,
  NOISE_WALK: 90,
  NOISE_SNEAK: 0,
};

export const GUARD_PATROL = {
  WAIT_SECONDS: 1.2,
  SCAN_SWEEP_DEGREES: 60,
  CHASE_SPEED: 135,
  INVESTIGATE_SPEED: 105,
  RETURN_SPEED: 95,
  CATCH_DISTANCE: 26,
  BUSH_SPOT_DISTANCE: 60,
};

// Four patrol routes, looped. Waypoints are (column, row) tile centres.
// Adjusted from the design after map validation: (12,5) was a wall -> (11,5),
// (16,3) was a crate -> (15,3), (3,14) was a bush -> (4,14). All other
// waypoints already fell on open floor.
export const GUARDS = [
  { name: 'Sinta', speed: 70, waypoints: [[4, 2], [12, 2], [11, 5], [4, 5]] },
  { name: 'Bimo', speed: 80, waypoints: [[15, 3], [16, 9], [22, 9], [22, 3]] },
  { name: 'Rani', speed: 80, waypoints: [[26, 4], [26, 12], [29, 12], [29, 4]] },
  { name: 'Dedi', speed: 60, waypoints: [[4, 14], [14, 14], [14, 16], [3, 16]] },
];

export const VISION_CONE = {
  RANGE: 220,
  HALF_ANGLE_DEGREES: 32,
  RAYS: 26,
};

// Detection fills 0..100 per guard; the HUD shows the highest one.
// Close (<90 px) fills in ~0.6 s, far (cone edge) in ~2.5 s.
export const DETECTION_RATES = {
  CLOSE_DISTANCE: 90,
  CLOSE_SECONDS: 0.6,
  FAR_SECONDS: 2.5,
  DECAY_PER_SECOND: 25,
  SUSPICIOUS_AT: 35,
  ALARM_AT: 100,
  SNEAK_FACTOR: 0.5,
  SHADOW_FACTOR: 0.5,
};

export const ALARM_LEVELS = {
  MAX: 3,
  SPEED_BONUS_PER_ALARM: 0.15,
  RANGE_BONUS_PER_ALARM: 0.1,
  LOST_SIGHT_SECONDS: 4,
  SEARCH_SECONDS: 6,
  CALM_SECONDS_TO_LOWER: 10,
};

export const PEBBLE = { RADIUS: 160, RING_SECONDS: 1.2 };

export const PALETTE = {
  FLOOR_DARK: '#2b2620',
  FLOOR_LIGHT: '#332d25',
  FLOOR_LIT: '#4a3f30',
  WALL: '#1a1d2e',
  WALL_TOP: '#2e3350',
  CRATE: '#6b4a2b',
  CRATE_EDGE: '#8a6238',
  BUSH: '#1e4d2a',
  BUSH_LEAF: '#2f7a3e',
  EXIT: '#2ee66b',
  LANTERN: '#ffd94a',
  COIN: '#f5c542',
  PLAYER: '#5a4370',
  PLAYER_CLOAK: '#453362',
  GUARD: '#22355e',
  GUARD_HELMET: '#e8e8e8',
  CONE_CALM: 'rgba(255, 214, 90, 0.20)',
  CONE_SUSPICIOUS: 'rgba(255, 150, 40, 0.30)',
  CONE_ALARM: 'rgba(255, 50, 40, 0.34)',
  NIGHT: 'rgba(8, 10, 26, 0.30)',
  HUD_BG: 'rgba(10, 12, 24, 0.72)',
  HUD_TEXT: '#f2ead8',
  HUD_WARN: '#ffb347',
  HUD_DANGER: '#ff5a4a',
};
