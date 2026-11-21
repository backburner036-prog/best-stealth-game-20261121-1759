// Bayang di Galeri — input: keyboard + mouse clicks for pebbles.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas) {
  const keys = new Set();
  const pebbleQueue = [];
  let confirmPressed = false;
  let pausePressed = false;
  let restartPressed = false;
  let mutePressed = false;

  function keyName(event) {
    return event.key.length === 1 ? event.key.toLowerCase() : event.key;
  }

  window.addEventListener('keydown', (event) => {
    const key = keyName(event);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
    }
    if (event.repeat) return;
    keys.add(key);
    if (key === ' ' || key === 'Enter') confirmPressed = true;
    if (key === 'p' || key === 'Escape') pausePressed = true;
    if (key === 'r') restartPressed = true;
    if (key === 'm') mutePressed = true;
  });
  window.addEventListener('keyup', (event) => keys.delete(keyName(event)));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    pebbleQueue.push({
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    });
    confirmPressed = true;
  });

  return {
    // Normalised 8-way movement vector from WASD / arrows.
    direction() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('d') || keys.has('ArrowRight')) x += 1;
      if (keys.has('w') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('s') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const len = Math.hypot(x, y);
        x /= len;
        y /= len;
      }
      return { x, y };
    },

    isSneaking() {
      return keys.has('Shift');
    },

    takeActions() {
      let actions = 0;
      if (confirmPressed) actions |= ACTION_CONFIRM;
      if (pausePressed) actions |= ACTION_PAUSE;
      if (restartPressed) actions |= ACTION_RESTART;
      if (mutePressed) actions |= ACTION_MUTE;
      confirmPressed = false;
      pausePressed = false;
      restartPressed = false;
      mutePressed = false;
      return actions;
    },

    // The oldest unhandled click target, or null. Clicks throw pebbles
    // during play and confirm on the title / end screens.
    takePebbleTarget() {
      return pebbleQueue.shift() ?? null;
    },

    hasClick() {
      return pebbleQueue.length > 0;
    },
  };
}
