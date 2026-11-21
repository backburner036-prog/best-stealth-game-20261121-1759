// Bayang di Galeri — deterministic screenshot scenes.
// Each scene plays by the real rules from a fixed setup (no scripted
// movement): the same code that runs the game draws the screenshot.
//   cover — tense but controlled mid-play (file 1-cover.jpg)
//   play  — hiding in a bush while a guard searches (file 3-hide.jpg)
//   alarm — near-miss, full alarm (file 2-alarm.jpg)
//   win   — the escape screen (file 4-escape.jpg)
import { SCREEN_CAUGHT, SCREEN_PLAY, SCREEN_WIN } from './render.js';
import { tileCenter } from './level.js';

function placeGuard(state, index, col, row, facing, meter, guardState) {
  const guard = state.guards[index];
  const pos = tileCenter(col, row);
  guard.x = pos.x;
  guard.y = pos.y;
  guard.facing = facing;
  guard.state = guardState;
  guard.waitTimer = 0;
  guard.meter = meter;
  state.detectors[index].value = meter;
  state.meters[index] = meter;
  return guard;
}

function placePlayer(state, col, row, sneaking = false) {
  const pos = tileCenter(col, row);
  state.player.x = pos.x;
  state.player.y = pos.y;
  state.player.sneaking = sneaking;
  state.player.facing = -Math.PI / 2;
}

export function stageShot(name, state) {
  state.time = 42;
  if (name === 'cover') {
    // Rara crouched behind the crate at (16,3); Bimo's yellow cone sweeps
    // just past her toward the west wing; the green exit glows top-right
    // and the lantern glints far to the south.
    placeGuard(state, 1, 22, 3, Math.PI, 12, 'patrol');
    placeGuard(state, 0, 8, 2, 0, 0, 'patrol');
    placeGuard(state, 2, 27, 8, Math.PI / 2, 0, 'patrol');
    placeGuard(state, 3, 8, 15, 0, 0, 'patrol');
    placePlayer(state, 16, 4, true);
    state.player.facing = Math.PI;
    state.maxMeter = 12;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'play') {
    // Hiding: Rara inside the bush at (5,5), only her robe showing. Sinta
    // is suspicious (orange cone, "?"), sweeping the dashed last-seen
    // circle while the meter drains.
    placeGuard(state, 0, 3, 5, 0, 45, 'suspicious');
    placeGuard(state, 1, 18, 6, -Math.PI / 2, 0, 'patrol');
    placeGuard(state, 2, 27, 6, Math.PI / 2, 0, 'patrol');
    placeGuard(state, 3, 10, 15, 0, 0, 'patrol');
    placePlayer(state, 5, 5, true);
    state.player.facing = Math.PI / 2;
    state.lastSeen = tileCenter(8, 5);
    state.maxMeter = 45;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'alarm') {
    // Near-miss: Bimo spotted Rara (red cone, "!"), the alarm is up, the
    // vignette burns red and Rara runs for the bush at (20,4).
    placeGuard(state, 1, 19, 9, -Math.PI / 2, 100, 'chase');
    placeGuard(state, 2, 24, 8, Math.PI, 30, 'investigate');
    state.guards[2].target = tileCenter(19, 7);
    state.guards[2].lastSeen = tileCenter(19, 7);
    placeGuard(state, 0, 9, 6, 0, 0, 'patrol');
    placeGuard(state, 3, 12, 14, 0, 0, 'patrol');
    placePlayer(state, 19, 7, false);
    state.player.facing = -Math.PI / 2;
    state.alarm.level = 1;
    state.alarm.active = true;
    state.alarmCount = 1;
    state.flashText = 'TERLIHAT!';
    state.flashTimer = 1.5;
    state.lastSeen = tileCenter(19, 7);
    state.maxMeter = 100;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'win') {
    // Escape: lantern in hand, Rara on the threshold of the glowing exit.
    placeGuard(state, 1, 18, 9, Math.PI / 2, 0, 'patrol');
    placeGuard(state, 2, 26, 10, -Math.PI / 2, 0, 'patrol');
    placeGuard(state, 0, 6, 3, 0, 0, 'patrol');
    placeGuard(state, 3, 10, 15, 0, 0, 'patrol');
    placePlayer(state, 28, 1, false);
    state.player.facing = 0;
    state.player.hasLantern = true;
    state.player.coins = 1;
    const lantern = state.level.loot.find((item) => item.kind === 'lantern');
    if (lantern) lantern.taken = true;
    state.winTime = 142;
    state.alarmCount = 0;
    state.score = 5000 - 142 * 10 + 1 * 500;
    state.maxMeter = 0;
    return { screen: SCREEN_WIN, best: 4080 };
  }
  // Unknown scene name: fall back to the title screen.
  return { screen: SCREEN_CAUGHT, best: 0 };
}
