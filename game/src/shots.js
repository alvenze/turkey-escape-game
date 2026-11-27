// Gobble Run screenshot scenes behind ?shot=start|play|kitchen|end. Each scene plays the real
// rules forward from a fresh seeded world, steered by an autopilot that jumps ground hazards,
// ducks the hanging ones and dashes when Hank closes in, so every frame is a real game frame and
// the same seed always renders the same frame.

import { OBSTACLES, STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function autopilot(world) {
  const s = world.state;
  const box = world.turkeyBox;
  // The nearest hazard of each kind decides: duck hazards own a wide window (duck early, stay
  // down until they pass), ground hazards are jumped late enough to clear them at run speed.
  let nearestDuck = Infinity;
  let nearestGround = Infinity;
  for (const ob of world.obstacles) {
    const sx = world.obstacleScreenX(ob);
    const ahead = sx - (box.x + box.width);
    if (OBSTACLES[ob.kind].beat === 'DUCK') {
      // A hanging hazard is only clear once its whole width is behind the turkey's tail.
      if (ahead > -170) nearestDuck = Math.min(nearestDuck, ahead);
    } else {
      if (ahead < -30) continue;
      nearestGround = Math.min(nearestGround, ahead);
    }
  }
  const duck = nearestDuck < 300;
  // Jump late: the arc lasts about 0.78s, and a wide hazard (gravy, fence) is only cleared when
  // the whole crossing window fits inside that arc.
  const jump = !duck && s.grounded && nearestGround < 100 && nearestGround > 8;
  return { jump, duck, dash: s.gap < 26 && s.dashCooldown <= 0 };
}

function run(world, seconds, pilot = autopilot) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    world.step(STEP, pilot(world));
    if (world.state.over) break;
  }
}

/** Stage the named scene in `world` and return the screen to draw. */
export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    run(world, 17);
    return SCREEN_PLAY;
  }
  if (name === 'kitchen') {
    // Fast-forward: bank distance into the kitchen zone, then play on for real frames there.
    run(world, 10);
    world.state.distance = 860;
    world.state.score += 700;
    world.worldX += 5200;
    run(world, 6);
    return SCREEN_PLAY;
  }
  if (name === 'end') {
    run(world, 12);
    // Stage the escape finish: at the gate, escaped, with a rich final tally.
    world.state.distance = 1500;
    world.state.score = Math.max(world.state.score, 3840);
    world.state.cornEaten = Math.max(world.state.cornEaten, 14);
    world.state.feathers = Math.max(world.state.feathers, 2);
    world.state.nearMisses = Math.max(world.state.nearMisses, 23);
    world.state.bestCombo = Math.max(world.state.bestCombo, 9);
    world.state.over = true;
    world.state.escaped = true;
    return SCREEN_OVER;
  }
  // start: idle world behind the title card.
  run(world, 2, () => ({ jump: false, duck: false, dash: false }));
  return SCREEN_TITLE;
}
