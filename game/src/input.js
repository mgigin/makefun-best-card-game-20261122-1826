// Keyboard and pointer input. One-shot presses are queued as bit flags and taken once
// by the loop; pointer clicks are reported in logical table coordinates (the renderer
// owns the scale, this layer converts through the view it is given).

export const ACTION_CONFIRM = 1;
export const ACTION_END_TURN = 2;

const CONFIRM = new Set(['Space', 'Enter']);
const END = new Set(['KeyE']);

export function createInput(target, view) {
  let actions = 0;
  let click = null;
  let digit = -1;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (END.has(event.code)) {
      if (!event.repeat) actions |= ACTION_END_TURN;
    } else if (/^Digit[1-8]$/.test(event.code)) {
      digit = Number(event.code.slice(5)) - 1;
    } else return;
    event.preventDefault();
  });

  target.addEventListener('pointerdown', (event) => {
    const rect = target.getBoundingClientRect();
    const px = (event.clientX - rect.left) * (target.width / rect.width);
    const py = (event.clientY - rect.top) * (target.height / rect.height);
    click = { x: (px - view.x) / view.scale, y: (py - view.y) / view.scale };
    actions |= ACTION_CONFIRM;
  });

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
    takeDigit() {
      const taken = digit;
      digit = -1;
      return taken;
    },
  };
}

export function hit(rect, point) {
  return point && rect && point.x >= rect.x && point.x <= rect.x + rect.w && point.y >= rect.y && point.y <= rect.y + rect.h;
}
