// Bayang di Galeri — detection meter per guard and the shared alarm.
// Detection is gradual: <35 unaware, 35-99 suspicious, 100 alarm. The meter
// drains when the player is unseen, so a careful player always recovers.
import { ALARM_LEVELS, DETECTION_RATES, GUARD_PATROL } from './config.js';
import { isInBush, isInShadow } from './level.js';

export class DetectionMeter {
  constructor() {
    this.value = 0;
  }

  addDetection(guard, player, level, dt, seen, dist) {
    if (!seen) {
      this.decayDetection(dt);
      return;
    }
    // Hidden in a bush: invisible unless the guard is right on top of Rara.
    if (isInBush(level, player.x, player.y) && dist > GUARD_PATROL.BUSH_SPOT_DISTANCE) {
      this.decayDetection(dt);
      return;
    }
    let rate;
    if (dist <= DETECTION_RATES.CLOSE_DISTANCE) {
      rate = 100 / DETECTION_RATES.CLOSE_SECONDS;
    } else {
      const t = (dist - DETECTION_RATES.CLOSE_DISTANCE)
        / (guard.coneRange - DETECTION_RATES.CLOSE_DISTANCE);
      const seconds = DETECTION_RATES.CLOSE_SECONDS
        + Math.min(1, Math.max(0, t)) * (DETECTION_RATES.FAR_SECONDS - DETECTION_RATES.CLOSE_SECONDS);
      rate = 100 / seconds;
    }
    if (player.sneaking) rate *= DETECTION_RATES.SNEAK_FACTOR;
    if (isInShadow(level, player.x, player.y)) rate *= DETECTION_RATES.SHADOW_FACTOR;
    this.value = Math.min(DETECTION_RATES.ALARM_AT, this.value + rate * dt);
  }

  decayDetection(dt) {
    this.value = Math.max(0, this.value - DETECTION_RATES.DECAY_PER_SECOND * dt);
  }
}

export class AlarmManager {
  constructor() {
    this.level = 0;
    this.active = false;
    this.calmTimer = 0;
    this.stingPlayed = false;
  }

  raiseAlarm() {
    if (this.level < ALARM_LEVELS.MAX) this.level += 1;
    this.active = true;
    this.calmTimer = 0;
    this.stingPlayed = false;
  }

  // Call every step with whether any guard currently sees the player.
  alarmCooldown(dt, anySeen) {
    if (!this.active) return;
    if (anySeen) {
      this.calmTimer = 0;
      return;
    }
    this.calmTimer += dt;
    if (this.calmTimer >= ALARM_LEVELS.CALM_SECONDS_TO_LOWER) {
      this.active = false;
      this.level = Math.max(0, this.level - 1);
      this.calmTimer = 0;
    }
  }

  alarmEscalation() {
    return this.level;
  }
}
