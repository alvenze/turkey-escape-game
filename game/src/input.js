// Gobble Run input: keyboard and mouse. Jump on ArrowUp / W / mouse click, duck while ArrowDown / S
// is held, dash on Space / Shift / double-click side button, pause on P, mute on M, start and
// restart on Enter or click. Held keys are tracked so ducking lasts exactly as long as the press.

export class Input {
  constructor(canvas, hooks) {
    this.hooks = hooks;
    this.duckHeld = false;
    this.jumpQueued = false;
    this.dashQueued = false;
    const down = (event) => {
      hooks.onAnyInput();
      if (event.code === 'ArrowUp' || event.code === 'KeyW') { this.jumpQueued = true; event.preventDefault(); }
      if (event.code === 'ArrowDown' || event.code === 'KeyS') { this.duckHeld = true; event.preventDefault(); }
      if (event.code === 'Space' || event.code === 'ShiftLeft') { this.dashQueued = true; event.preventDefault(); }
      if (event.code === 'Enter') hooks.onConfirm();
      if (event.code === 'KeyP') hooks.onPause();
      if (event.code === 'KeyM') hooks.onMute();
    };
    const up = (event) => {
      if (event.code === 'ArrowDown' || event.code === 'KeyS') this.duckHeld = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    canvas.addEventListener('pointerdown', (event) => {
      hooks.onAnyInput();
      if (event.button === 2) this.dashQueued = true;
      else { this.jumpQueued = true; hooks.onConfirm(); }
    });
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  /** Consume one frame of intent for the world step. */
  read() {
    const frame = { jump: this.jumpQueued, dash: this.dashQueued, duck: this.duckHeld };
    this.jumpQueued = false;
    this.dashQueued = false;
    return frame;
  }
}
