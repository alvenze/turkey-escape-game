// Gobble Run entry point: wires the world, renderer, input and sound into the game loop.
// Screens: title, play, and the end screen (escaped or caught), with pause and restart.
// A ?shot=start|play|kitchen|end&seed=N address stages one deterministic scene and draws a
// single frame, which is how the entry's screenshots are taken; normal play uses the clock seed.

import { STEP, VIEW } from './config.js';
import { World, EVENT_CAUGHT, EVENT_ESCAPED, EVENT_HIT, EVENT_NEAR_MISS, EVENT_PICKUP, EVENT_ZONE } from './world.js';
import { drawScene, SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { Input } from './input.js';
import { GobbleAudio } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const status = document.getElementById('status');

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seed = Number(params.get('seed') ?? '1') || 1;

const audio = new GobbleAudio();
let world = new World(shotName ? seed : (Date.now() % 100000) + 1);
let screen = SCREEN_TITLE;
let paused = false;
let elapsed = 0;
let lastAnnouncement = '';

function announce(message) {
  if (message !== lastAnnouncement) {
    lastAnnouncement = message;
    if (status) status.textContent = message;
  }
}

function startRun() {
  world = new World((Date.now() % 100000) + 1);
  screen = SCREEN_PLAY;
  paused = false;
  audio.gobble();
  announce('The escape is on! Farmer Hank is behind you.');
}

const input = new Input(canvas, {
  onAnyInput: () => audio.unlock(),
  onConfirm: () => {
    if (screen !== SCREEN_PLAY) startRun();
  },
  onPause: () => { if (screen === SCREEN_PLAY) paused = !paused; },
  onMute: () => { audio.muted = !audio.muted; },
});

function reactTo(events, frame) {
  if (frame.jump) audio.jump();
  if (frame.dash) audio.dash();
  if (events & EVENT_PICKUP) audio.pickup();
  if (events & EVENT_HIT) audio.squawk();
  if (events & EVENT_NEAR_MISS) audio.nearMiss();
  if (events & EVENT_ZONE) audio.zoneFanfare();
  if (events & EVENT_ESCAPED) { audio.escaped(); screen = SCREEN_OVER; announce('You escaped to the forest!'); }
  if (events & EVENT_CAUGHT) { audio.caught(); screen = SCREEN_OVER; announce('Caught by Farmer Hank.'); }
}

if (shotName) {
  screen = stageShot(shotName, world);
  drawScene(ctx, world, screen, 1.25);
  document.title = `Gobble Run shot: ${shotName}`;
} else {
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    elapsed += dt;
    if (screen === SCREEN_PLAY && !paused) {
      accumulator += dt;
      const intent = input.read();
      let first = true;
      while (accumulator >= STEP) {
        const events = world.step(STEP, first ? intent : { jump: false, dash: false, duck: intent.duck });
        first = false;
        reactTo(events, intent);
        accumulator -= STEP;
        if (world.state.over) break;
      }
      const s = world.state;
      announce(`Score ${Math.floor(s.score)}, ${Math.floor(s.distance)} metres, ${s.lives} hearts, farmer gap ${Math.round(s.gap)} metres.`);
    } else {
      input.read();
      // The title and end screens idle the world gently behind their cards.
      world.step(0, { jump: false, dash: false, duck: false });
    }
    drawScene(ctx, world, screen, elapsed);
    if (paused && screen === SCREEN_PLAY) {
      ctx.fillStyle = 'rgba(10,10,16,0.6)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      ctx.fillStyle = '#fff';
      ctx.font = "900 54px 'Trebuchet MS', Verdana, sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED · P TO RUN', VIEW.width / 2, VIEW.height / 2);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
