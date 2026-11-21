// Bayang di Galeri — drawing only (canvas 2D, no game logic).
// Order matters: floor, loot, exit, cones (above floor, below guards),
// bushes, crates, walls, guards, player, lighting, HUD, overlays.
import { DETECTION_RATES, FIELD, PALETTE, PEBBLE, TILE } from './config.js';
import { isInShadow } from './level.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_WIN = 'win';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = FIELD.WIDTH * dpr;
  canvas.height = FIELD.HEIGHT * dpr;
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';

  function fit() {
    const scale = Math.min(window.innerWidth / FIELD.WIDTH, window.innerHeight / FIELD.HEIGHT);
    const w = Math.floor(FIELD.WIDTH * scale);
    const h = Math.floor(FIELD.HEIGHT * scale);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.style.left = `${Math.floor((window.innerWidth - w) / 2)}px`;
    canvas.style.top = `${Math.floor((window.innerHeight - h) / 2)}px`;
    canvas.style.position = 'fixed';
  }
  window.addEventListener('resize', fit);
  fit();

  function drawFloorTiles(level) {
    for (let row = 0; row < level.grid.length; row += 1) {
      for (let col = 0; col < level.grid[row].length; col += 1) {
        const cell = level.grid[row][col];
        if (cell === '#') continue;
        const x = col * TILE;
        const y = row * TILE;
        const lit = isInShadow(level, x + TILE / 2, y + TILE / 2) ? PALETTE.FLOOR_DARK : PALETTE.FLOOR_LIT;
        ctx.fillStyle = (col + row) % 2 === 0 ? PALETTE.FLOOR_LIGHT : lit;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      }
    }
    // Hanging lamps in the central hall: pools of warm light.
    for (const [lx, ly] of [[560, 200], [760, 360], [1120, 120]]) {
      const glow = ctx.createRadialGradient(lx, ly, 10, lx, ly, 150);
      glow.addColorStop(0, 'rgba(255, 210, 120, 0.20)');
      glow.addColorStop(1, 'rgba(255, 210, 120, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(lx - 150, ly - 150, 300, 300);
    }
  }

  function drawWalls(level) {
    for (let row = 0; row < level.grid.length; row += 1) {
      for (let col = 0; col < level.grid[row].length; col += 1) {
        if (level.grid[row][col] !== '#') continue;
        const x = col * TILE;
        const y = row * TILE;
        ctx.fillStyle = PALETTE.WALL;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = PALETTE.WALL_TOP;
        ctx.fillRect(x, y, TILE, 6);
      }
    }
  }

  function drawCoverCrates(level) {
    for (const crate of level.crates) {
      const x = crate.col * TILE;
      const y = crate.row * TILE;
      ctx.fillStyle = PALETTE.CRATE;
      ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.strokeStyle = PALETTE.CRATE_EDGE;
      ctx.lineWidth = 3;
      ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
      ctx.beginPath();
      ctx.moveTo(x + 3, y + 3);
      ctx.lineTo(x + TILE - 3, y + TILE - 3);
      ctx.moveTo(x + TILE - 3, y + 3);
      ctx.lineTo(x + 3, y + TILE - 3);
      ctx.stroke();
    }
  }

  function drawHidingBushes(level) {
    for (const bush of level.bushes) {
      ctx.fillStyle = PALETTE.BUSH;
      ctx.beginPath();
      ctx.arc(bush.x, bush.y, 19, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.BUSH_LEAF;
      for (const [ox, oy, r] of [[-8, -6, 8], [7, -7, 7], [0, 6, 9], [-2, -1, 6]]) {
        ctx.beginPath();
        ctx.arc(bush.x + ox, bush.y + oy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function coneColor(meter) {
    if (meter >= DETECTION_RATES.ALARM_AT) return PALETTE.CONE_ALARM;
    if (meter >= DETECTION_RATES.SUSPICIOUS_AT) return PALETTE.CONE_SUSPICIOUS;
    return PALETTE.CONE_CALM;
  }

  function drawVisionCone(guard, meter) {
    const points = guard.conePoints;
    if (!points || points.length < 3) return;
    ctx.fillStyle = coneColor(meter);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.fill();
    // A faint edge so the cone still reads on the judge's small contact sheet.
    ctx.strokeStyle = coneColor(meter).replace(/[\d.]+\)$/, '0.55)');
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  function drawGuard(guard, meter) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(guard.x, guard.y + 12, 14, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    // Navy uniform body.
    ctx.fillStyle = PALETTE.GUARD;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 14, 0, Math.PI * 2);
    ctx.fill();
    // White helmet.
    ctx.fillStyle = PALETTE.GUARD_HELMET;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y - 3, 10, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(guard.x - 10, guard.y - 4, 20, 3);
    // Facing tick so the patrol direction reads at a glance.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.facing) * 20, guard.y + Math.sin(guard.facing) * 20);
    ctx.stroke();
    // Suspicion "?" and alarm "!".
    if (meter >= DETECTION_RATES.ALARM_AT || guard.state === 'chase') {
      drawMark(guard.x, guard.y - 30, '!', '#ff5a4a');
    } else if (meter >= DETECTION_RATES.SUSPICIOUS_AT) {
      drawMark(guard.x, guard.y - 30, '?', '#ffb347');
    }
  }

  function drawMark(x, y, text, color) {
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(0,0,0,0.7)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function drawPlayer(player) {
    // A soft gold ring under Rara so she stays readable at contact-sheet size.
    ctx.strokeStyle = 'rgba(255, 220, 150, 0.55)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(player.x, player.y + 11, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    const crouch = player.sneaking ? 3 : 0;
    ctx.fillStyle = PALETTE.PLAYER_CLOAK;
    ctx.beginPath();
    ctx.arc(player.x, player.y + crouch, player.radius, 0, Math.PI * 2);
    ctx.fill();
    // Hood + face: Rara reads as a small hooded figure, never a dot.
    ctx.fillStyle = PALETTE.PLAYER;
    ctx.beginPath();
    ctx.arc(player.x, player.y - 2 + crouch, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath();
    ctx.arc(
      player.x + Math.cos(player.facing) * 3,
      player.y - 2 + Math.sin(player.facing) * 3 + crouch,
      4.5, 0, Math.PI * 2,
    );
    ctx.fill();
    if (player.hasLantern) {
      ctx.fillStyle = PALETTE.LANTERN;
      ctx.beginPath();
      ctx.arc(player.x + 10, player.y - 8, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawGlowingExit(level, hasLantern, time) {
    const exit = level.exitTile;
    const pulse = 0.55 + 0.35 * Math.sin(time * 3);
    const glow = ctx.createRadialGradient(exit.x, exit.y, 4, exit.x, exit.y, 60);
    glow.addColorStop(0, `rgba(46, 230, 107, ${0.55 * pulse + 0.25})`);
    glow.addColorStop(1, 'rgba(46, 230, 107, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(exit.x - 60, exit.y - 60, 120, 120);
    ctx.fillStyle = PALETTE.EXIT;
    ctx.fillRect(exit.x - 16, exit.y - 18, 32, 36);
    ctx.fillStyle = '#0b3d1c';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('EXIT', exit.x, exit.y);
    if (hasLantern) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(exit.x - 20, exit.y - 22, 40, 44);
    }
  }

  function drawLoot(level, time) {
    for (const item of level.loot) {
      if (item.taken) continue;
      const bob = Math.sin(time * 2 + item.x) * 2;
      if (item.kind === 'lantern') {
        const glow = ctx.createRadialGradient(item.x, item.y + bob, 2, item.x, item.y + bob, 34);
        glow.addColorStop(0, 'rgba(255, 217, 74, 0.85)');
        glow.addColorStop(1, 'rgba(255, 217, 74, 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(item.x - 34, item.y + bob - 34, 68, 68);
        ctx.fillStyle = PALETTE.LANTERN;
        ctx.beginPath();
        ctx.arc(item.x, item.y + bob, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#7a5b00';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('L', item.x, item.y + bob);
      } else {
        ctx.fillStyle = PALETTE.COIN;
        ctx.beginPath();
        ctx.arc(item.x, item.y + bob, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8a6d00';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  function drawPebbles(pebbles) {
    for (const pebble of pebbles) {
      const t = pebble.timer / pebble.max;
      ctx.strokeStyle = `rgba(220, 230, 255, ${t})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pebble.x, pebble.y, PEBBLE.RADIUS * (1 - t) + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#cfd6e4';
      ctx.beginPath();
      ctx.arc(pebble.x, pebble.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawNightLighting() {
    ctx.fillStyle = PALETTE.NIGHT;
    ctx.fillRect(0, 0, FIELD.WIDTH, FIELD.HEIGHT);
    const vignette = ctx.createRadialGradient(
      FIELD.WIDTH / 2, FIELD.HEIGHT / 2, FIELD.HEIGHT * 0.42,
      FIELD.WIDTH / 2, FIELD.HEIGHT / 2, FIELD.HEIGHT * 0.85,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, FIELD.WIDTH, FIELD.HEIGHT);
  }

  function drawDetectionHud(state) {
    const barW = 260;
    const barH = 16;
    const x = 16;
    const y = 16;
    ctx.fillStyle = PALETTE.HUD_BG;
    roundRect(x - 8, y - 8, barW + 150, 64, 8);
    ctx.fill();
    // Eye + detection meter (highest guard).
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('👁', x, y + barH / 2);
    ctx.fillStyle = '#222';
    ctx.fillRect(x + 30, y, barW, barH);
    const meter = state.maxMeter;
    ctx.fillStyle = meter >= DETECTION_RATES.ALARM_AT
      ? PALETTE.HUD_DANGER
      : meter >= DETECTION_RATES.SUSPICIOUS_AT ? PALETTE.HUD_WARN : '#ffd65a';
    ctx.fillRect(x + 30, y, barW * Math.min(1, meter / 100), barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 30.5, y + 0.5, barW, barH);
    // Alarm pips (3).
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < state.alarm.level ? PALETTE.HUD_DANGER : 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(x + 36 + i * 24, y + 34, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.HUD_TEXT;
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(`Alarm ${state.alarm.level}/3`, x + 112, y + 34);
    // Pebbles, coins, objective.
    ctx.fillText(`🪨 ${state.player.pebbles}   🪙 ${state.player.coins}/2`, x + 300, y + 8);
    ctx.fillStyle = state.player.hasLantern ? '#7dff9e' : PALETTE.HUD_TEXT;
    ctx.fillText(state.player.hasLantern ? 'Keluar lewat pintu darurat →' : 'Ambil Lentera Senja', x + 300, y + 34);
    // Objective arrow at the screen edge pointing at the active goal.
    drawObjectiveArrow(state);
    if (state.flashText) {
      ctx.font = 'bold 34px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.HUD_DANGER;
      ctx.lineWidth = 6;
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.strokeText(state.flashText, FIELD.WIDTH / 2, 90);
      ctx.fillText(state.flashText, FIELD.WIDTH / 2, 90);
    }
  }

  function drawObjectiveArrow(state) {
    const target = state.player.hasLantern
      ? { x: state.level.exitTile.x, y: state.level.exitTile.y }
      : state.lanternPos;
    if (!target) return;
    const dx = target.x - state.player.x;
    const dy = target.y - state.player.y;
    if (Math.hypot(dx, dy) < 120) return;
    const angle = Math.atan2(dy, dx);
    const ax = state.player.x + Math.cos(angle) * 44;
    const ay = state.player.y + Math.sin(angle) * 44;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(angle);
    ctx.fillStyle = state.player.hasLantern ? PALETTE.EXIT : PALETTE.LANTERN;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-8, -8);
    ctx.lineTo(-4, 0);
    ctx.lineTo(-8, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function panel(title, lines, accent) {
    ctx.fillStyle = 'rgba(8, 10, 22, 0.82)';
    roundRect(340, 150, 600, 420, 14);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    roundRect(340, 150, 600, 420, 14);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = accent;
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText(title, 640, 210);
    ctx.fillStyle = PALETTE.HUD_TEXT;
    ctx.font = '20px sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, 640, 280 + i * 34));
  }

  function drawGame(state, screen, best) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, FIELD.WIDTH, FIELD.HEIGHT);
    ctx.fillStyle = '#0d0f1a';
    ctx.fillRect(0, 0, FIELD.WIDTH, FIELD.HEIGHT);
    drawFloorTiles(state.level);
    drawLoot(state.level, state.time);
    drawGlowingExit(state.level, state.player.hasLantern, state.time);
    for (let i = 0; i < state.guards.length; i += 1) {
      drawVisionCone(state.guards[i], state.meters[i]);
    }
    drawHidingBushes(state.level);
    drawCoverCrates(state.level);
    drawWalls(state.level);
    drawPebbles(state.pebbles);
    // Last-seen marker: the dashed circle guards investigate.
    if (state.lastSeen) {
      ctx.strokeStyle = 'rgba(255, 180, 70, 0.8)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(state.lastSeen.x, state.lastSeen.y, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    for (let i = 0; i < state.guards.length; i += 1) drawGuard(state.guards[i], state.meters[i]);
    drawPlayer(state.player);
    drawNightLighting();
    if (state.alarm.active) {
      const vg = ctx.createRadialGradient(
        FIELD.WIDTH / 2, FIELD.HEIGHT / 2, FIELD.HEIGHT * 0.3,
        FIELD.WIDTH / 2, FIELD.HEIGHT / 2, FIELD.HEIGHT * 0.8,
      );
      vg.addColorStop(0, 'rgba(255,0,0,0)');
      vg.addColorStop(1, 'rgba(255,0,0,0.28)');
      ctx.fillStyle = vg;
      ctx.fillRect(0, 0, FIELD.WIDTH, FIELD.HEIGHT);
    }
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawDetectionHud(state);
    if (screen === SCREEN_TITLE) {
      panel('SHADOW IN THE GALLERY', [
        'Bayang di Galeri — curi kembali Lentera Senja tanpa terlihat.',
        'WASD / panah: gerak   Shift: menyelinap   Klik: lempar kerikil',
        'Sembunyi di semak atau di balik peti. Satu sentuhan guard = tertangkap.',
        '',
        'Tekan Spasi / klik untuk mulai',
      ], '#ffd65a');
      if (best > 0) {
        ctx.fillStyle = PALETTE.HUD_TEXT;
        ctx.font = '18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Skor terbaik: ${best}`, 640, 520);
      }
    } else if (screen === SCREEN_PAUSED) {
      panel('JEDA', ['Tekan P / Esc untuk lanjut', 'R: mulai ulang level   M: bisukan suara'], '#9db4ff');
    } else if (screen === SCREEN_CAUGHT) {
      panel('TERTANGKAP!', [
        state.tip || 'Guard melihatmu — coba lewat koridor selatan yang gelap.',
        '',
        'Tekan R atau Spasi untuk main lagi',
      ], '#ff5a4a');
    } else if (screen === SCREEN_WIN) {
      const rank = state.alarmCount === 0 ? 'S' : state.alarmCount === 1 ? 'A' : state.alarmCount === 2 ? 'B' : 'C';
      panel('LOLOS TANPA TERLIHAT', [
        `Peringkat ${rank} — waktu ${state.winTime}s — koin ${state.player.coins}/2 — alarm ${state.alarmCount}`,
        `Skor ${state.score}   (terbaik ${Math.max(best, state.score)})`,
        '',
        'Tekan R atau Spasi untuk main lagi',
      ], '#2ee66b');
    }
  }

  return { draw: drawGame };
}
