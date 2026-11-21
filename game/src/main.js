// Bayang di Galeri — boot + fixed-step loop + screen flow.
// Screens: title -> play -> paused -> caught / win. ?shot=<name>&seed=N
// stages a deterministic scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { BEST_KEY, GUARDS, STEP, TILE } from './config.js';
import { findExitTile, parseLevelMap } from './level.js';
import {
  GUARD_CHASE, GUARD_SEARCH, applyAlarmEscalation, createGuard, guardCatchDistance,
  guardSeesPlayer, updateGuard, updateGuardVisionCone,
} from './guard.js';
import { createPlayer, movePlayer, playerNoiseRadius, throwPebble } from './player.js';
import { AlarmManager, DetectionMeter } from './detection.js';
import { createAudioEngine } from './audio.js';
import {
  SCREEN_CAUGHT, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, createRenderer,
} from './render.js';
import {
  ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_RESTART, createInput,
} from './input.js';
import { createRandom } from './random.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');

export function createGameState() {
  const level = parseLevelMap();
  const player = createPlayer(level.playerStart);
  const guards = GUARDS.map((def, i) => createGuard(def, i));
  const detectors = guards.map(() => new DetectionMeter());
  const lantern = level.loot.find((item) => item.kind === 'lantern');
  return {
    level,
    player,
    guards,
    detectors,
    meters: guards.map(() => 0),
    alarm: new AlarmManager(),
    pebbles: [],
    time: 0,
    maxMeter: 0,
    flashText: '',
    flashTimer: 0,
    lastSeen: null,
    alarmCount: 0,
    winTime: 0,
    score: 0,
    tip: '',
    lostSightTimer: 0,
    stepTimer: 0,
    lanternPos: lantern ? { x: lantern.x, y: lantern.y } : null,
  };
}

function refreshCones(state) {
  for (const guard of state.guards) {
    guard.conePoints = updateGuardVisionCone(guard, state.level);
  }
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off: the best score then lasts this visit only.
  }
}

function rankFor(alarms) {
  if (alarms === 0) return 'S';
  if (alarms === 1) return 'A';
  if (alarms === 2) return 'B';
  return 'C';
}

export function startGame() {
  return createGameState();
}

// One fixed step of play. Returns 'caught', 'win', or null.
export function stepGame(state, dt, input, audio) {
  state.time += dt;
  const player = state.player;
  const level = state.level;

  // Movement + sneaking.
  const dir = input.direction();
  player.sneaking = input.isSneaking();
  movePlayer(player, dir.x, dir.y, dt, level);

  // Pebble throws: a click during play lobs a pebble at that point.
  const click = input.takePebbleTarget();
  if (click) {
    const pebble = throwPebble(player, click.x, click.y);
    if (pebble) {
      state.pebbles.push(pebble);
      audio.playPebbleTing();
      for (const guard of state.guards) {
        const dist = Math.hypot(guard.x - click.x, guard.y - click.y);
        if (dist <= 160 && guard.state !== GUARD_CHASE) {
          guard.state = 'investigate';
          guard.target = { x: click.x, y: click.y };
          guard.lastSeen = { x: click.x, y: click.y };
        }
      }
    }
  }
  for (const pebble of state.pebbles) pebble.timer -= dt;
  state.pebbles = state.pebbles.filter((pebble) => pebble.timer > 0);

  // Running is loud: nearby patrolling guards come to look.
  const noise = playerNoiseRadius(player);
  if (noise > 0) {
    for (const guard of state.guards) {
      if (guard.state !== 'patrol') continue;
      if (Math.hypot(guard.x - player.x, guard.y - player.y) <= noise) {
        guard.state = 'suspicious';
        guard.lastSeen = { x: player.x, y: player.y };
        state.lastSeen = { x: player.x, y: player.y };
      }
    }
  }

  // Guards: vision, detection, state changes.
  let anySeen = false;
  let maxMeter = 0;
  for (let i = 0; i < state.guards.length; i += 1) {
    const guard = state.guards[i];
    const detector = state.detectors[i];
    const { seen, dist } = guardSeesPlayer(guard, player, level);
    if (seen) {
      anySeen = true;
      guard.lastSeen = { x: player.x, y: player.y };
      state.lastSeen = { x: player.x, y: player.y };
      state.lostSightTimer = 0;
    }
    detector.addDetection(guard, player, level, dt, seen, dist);
    state.meters[i] = detector.value;
    if (detector.value > maxMeter) maxMeter = detector.value;

    if (detector.value >= 100 && guard.state !== GUARD_CHASE) {
      guard.state = GUARD_CHASE;
      if (!state.alarm.active) {
        state.alarm.raiseAlarm();
        state.alarmCount += 1;
        state.flashText = 'TERLIHAT!';
        state.flashTimer = 1.5;
        audio.playAlertSting();
        for (const other of state.guards) applyAlarmEscalation(other, state.alarm.level);
      }
    } else if (detector.value >= 35 && detector.value < 100 && guard.state === 'patrol') {
      guard.state = 'suspicious';
    }
    updateGuard(guard, dt, level, player, state.alarm.active);
  }
  state.maxMeter = maxMeter;
  refreshCones(state);

  // Losing the guards: 4 s unseen -> they search, then give up.
  if (state.alarm.active) {
    if (!anySeen) {
      state.lostSightTimer += dt;
      if (state.lostSightTimer >= 4) {
        for (const guard of state.guards) {
          if (guard.state === GUARD_CHASE) {
            guard.state = GUARD_SEARCH;
            guard.searchTimer = 6;
          }
        }
        state.lostSightTimer = 0;
      }
    } else {
      state.lostSightTimer = 0;
    }
    state.alarm.alarmCooldown(dt, anySeen);
  }

  if (state.flashTimer > 0) {
    state.flashTimer -= dt;
    if (state.flashTimer <= 0) state.flashText = '';
  }

  // Guard footsteps: the nearest patrol tells the player where it is.
  state.stepTimer += dt;
  if (state.stepTimer >= 0.45) {
    state.stepTimer = 0;
    let nearest = null;
    let nearestDist = Infinity;
    for (const guard of state.guards) {
      const dist = Math.hypot(guard.x - player.x, guard.y - player.y);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = guard;
      }
    }
    if (nearest) audio.playFootstep(player, nearest);
  }

  // Loot pickup by touch.
  for (const item of level.loot) {
    if (item.taken) continue;
    if (Math.hypot(item.x - player.x, item.y - player.y) < 26) {
      item.taken = true;
      audio.playPickupChime();
      if (item.kind === 'lantern') {
        player.hasLantern = true;
        state.flashText = 'Lentera Senja didapat — keluar!';
        state.flashTimer = 2;
      } else {
        player.coins += 1;
      }
    }
  }

  // Caught: a guard touches Rara.
  for (const guard of state.guards) {
    if (Math.hypot(guard.x - player.x, guard.y - player.y) < guardCatchDistance()) {
      return 'caught';
    }
  }

  // Escape: lantern in hand, touch the green exit.
  if (player.hasLantern) {
    const exit = findExitTile(level);
    if (Math.hypot(exit.x - player.x, exit.y - player.y) < 28) return 'win';
  }
  return null;
}

function runShot(name) {
  const state = createGameState();
  const scene = stageShot(name, state);
  refreshCones(state);
  const renderer = createRenderer(canvas);
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  const audio = createAudioEngine();
  const renderer = createRenderer(canvas);
  const random = createRandom(seed);
  void random;
  let state = createGameState();
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function beginPlay() {
    state = createGameState();
    screen = SCREEN_PLAY;
    audio.resume();
    audio.startAmbient();
    announce('Bermain. Ambil Lentera Senja tanpa terlihat.');
  }

  function endCaught() {
    screen = SCREEN_CAUGHT;
    audio.playCaughtSting();
    const inHall = state.player.x > 13 * TILE && state.player.x < 25 * TILE;
    state.tip = inHall
      ? 'Guard melihatmu dari aula tengah — coba lewat koridor selatan yang gelap.'
      : 'Guard melihatmu di koridor selatan — tunggu ia lewat, lalu menyelinap di balik peti.';
    announce('Tertangkap. Tekan R untuk main lagi.');
  }

  function endWin() {
    screen = SCREEN_WIN;
    state.winTime = Math.floor(state.time);
    state.score = Math.max(
      0,
      5000 - state.winTime * 10 + state.player.coins * 500 - state.alarmCount * 400,
    );
    if (state.score > best) {
      best = state.score;
      saveBest(best);
    }
    audio.playWinJingle();
    announce(`Lolos! Peringkat ${rankFor(state.alarmCount)}. Skor ${state.score}.`);
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Suara mati.' : 'Suara hidup.');
    }
    if (actions & ACTION_RESTART && screen !== SCREEN_TITLE) {
      beginPlay();
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_CAUGHT || screen === SCREEN_WIN)) {
      beginPlay();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Bermain.');
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) return;
    const result = stepGame(state, STEP, input, audio);
    if (result === 'caught') endCaught();
    else if (result === 'win') endWin();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen, best);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });

  // Keep the guards' cones fresh on the title screen backdrop.
  refreshCones(state);
  announce('Bayang di Galeri. Tekan Spasi atau klik untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
