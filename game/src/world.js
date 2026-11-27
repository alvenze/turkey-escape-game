// Gobble Run world: the rules of the escape. The turkey auto-runs; the player jumps, ducks and
// dashes. Farmer Hank chases from the left: his GAP closes when the turkey stumbles or dawdles and
// opens when it dashes and grabs pickups. Hits cost a heart (a pie shield eats one hit instead);
// at 0 hearts, or gap 0, Hank catches the turkey. Reaching the forest gate at ESCAPE_DISTANCE wins.

import {
  ESCAPE_DISTANCE, GROUND_Y, MAX_GAP, NEAR_MISS_BONUS, OBSTACLES, PICKUPS,
  SCORE_PER_METRE, START_GAP, START_LIVES, TURKEY, VIEW, zoneAt,
} from './config.js';
import { makeRandom, pickWeighted } from './random.js';

export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_ZONE = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_ESCAPED = 16;
export const EVENT_NEAR_MISS = 32;

const OBSTACLE_TABLE = [
  { value: 'oven', weight: 16 }, { value: 'knife', weight: 15 }, { value: 'fence', weight: 16 },
  { value: 'hay', weight: 14 }, { value: 'gravy', weight: 12 }, { value: 'pumpkin', weight: 11 },
  { value: 'pot', weight: 9 }, { value: 'banner', weight: 7 },
];
const PICKUP_TABLE = [
  { value: 'corn', weight: 52 }, { value: 'pie', weight: 16 },
  { value: 'coffee', weight: 18 }, { value: 'feather', weight: 6 },
];

export class World {
  constructor(seed) {
    this.random = makeRandom(seed);
    this.reset();
  }

  reset() {
    this.state = {
      distance: 0, score: 0, lives: START_LIVES, gap: START_GAP,
      speed: 330, // px/s of world scroll; grows with distance
      turkeyY: GROUND_Y, velocityY: 0, ducking: false, grounded: true,
      dashLeft: 0, dashCooldown: 0, shield: false, coffeeLeft: 0,
      invulnerableLeft: 0, combo: 0, bestCombo: 0, nearMisses: 0,
      cornEaten: 0, feathers: 0, zoneIndex: 0, over: false, escaped: false,
      bannerText: '', bannerLeft: 0, hitFlashLeft: 0, runSeconds: 0,
    };
    this.obstacles = [];
    this.pickups = [];
    this.particles = [];
    this.nextSpawnX = VIEW.width + 500;
    this.worldX = 0; // total px scrolled
  }

  get turkeyBox() {
    const s = this.state;
    const h = s.ducking && s.grounded ? TURKEY.duckHeight : TURKEY.height;
    return { x: TURKEY.x, y: s.turkeyY - h, width: TURKEY.width, height: h };
  }

  speedNow() {
    const s = this.state;
    let v = s.speed + Math.min(190, s.distance * 0.14);
    if (s.coffeeLeft > 0) v += 90;
    if (s.dashLeft > 0) v += TURKEY.dashSpeed;
    return v;
  }

  tryJump() {
    const s = this.state;
    if (s.grounded && !s.over) {
      s.velocityY = TURKEY.jumpVelocity;
      s.grounded = false;
      s.ducking = false;
      return true;
    }
    return false;
  }

  tryDash() {
    const s = this.state;
    if (s.dashCooldown <= 0 && !s.over) {
      s.dashLeft = TURKEY.dashSeconds;
      s.dashCooldown = TURKEY.dashCooldown;
      s.gap = Math.min(MAX_GAP, s.gap + 2.5);
      return true;
    }
    return false;
  }

  setDucking(on) {
    const s = this.state;
    s.ducking = on;
    if (on && !s.grounded) s.velocityY = Math.max(s.velocityY, 900); // fast-fall into the slide
  }

  spawnAhead() {
    const s = this.state;
    while (this.nextSpawnX < this.worldX + VIEW.width + 700) {
      const roll = this.random();
      const x = this.nextSpawnX;
      if (roll < 0.62) {
        const kind = pickWeighted(this.random, OBSTACLE_TABLE);
        const spec = OBSTACLES[kind];
        const airborne = spec.beat === 'DUCK';
        this.obstacles.push({
          kind, x, width: spec.width, height: spec.height, passed: false,
          y: airborne ? GROUND_Y - 168 : GROUND_Y - spec.height,
        });
        this.nextSpawnX += 300 + this.random() * 260 - Math.min(90, s.distance * 0.05);
      } else {
        const kind = pickWeighted(this.random, PICKUP_TABLE);
        const high = this.random() < 0.45;
        this.pickups.push({ kind, x: x + 40, y: GROUND_Y - (high ? 150 : 56), taken: false, bob: this.random() * 6 });
        this.nextSpawnX += 240 + this.random() * 200;
      }
    }
  }

  burst(x, y, colour, count) {
    for (let i = 0; i < count; i += 1) {
      this.particles.push({
        x, y, vx: (this.random() - 0.5) * 320, vy: -this.random() * 260 - 40,
        life: 0.5 + this.random() * 0.4, colour, size: 3 + this.random() * 5,
      });
    }
  }

  step(dt, input) {
    const s = this.state;
    if (s.over) return 0;
    let events = 0;
    s.runSeconds += dt;
    if (input.jump) this.tryJump();
    if (input.dash) { if (this.tryDash()) events |= 0; }
    this.setDucking(!!input.duck);

    // Turkey vertical physics.
    if (!s.grounded) {
      s.velocityY += TURKEY.gravity * dt;
      s.turkeyY += s.velocityY * dt;
      if (s.turkeyY >= GROUND_Y) { s.turkeyY = GROUND_Y; s.velocityY = 0; s.grounded = true; }
    }
    s.dashLeft = Math.max(0, s.dashLeft - dt);
    s.dashCooldown = Math.max(0, s.dashCooldown - dt);
    s.coffeeLeft = Math.max(0, s.coffeeLeft - dt);
    s.invulnerableLeft = Math.max(0, s.invulnerableLeft - dt);
    s.bannerLeft = Math.max(0, s.bannerLeft - dt);
    s.hitFlashLeft = Math.max(0, s.hitFlashLeft - dt);

    // Scroll the world, bank distance and score.
    const v = this.speedNow();
    const dx = v * dt;
    this.worldX += dx;
    const before = s.distance;
    s.distance += dx / 10; // 10 px = 1 metre
    s.score += SCORE_PER_METRE * (dx / 10);

    // Zone changes announce themselves and pay a small bonus.
    const zone = zoneAt(s.distance);
    const zi = Math.max(0, [0, 380, 800, 1180].filter((f) => s.distance >= f).length - 1);
    if (zi !== s.zoneIndex) {
      s.zoneIndex = zi;
      s.bannerText = zone.name;
      s.bannerLeft = 2.2;
      s.score += 50;
      events |= EVENT_ZONE;
    }

    // Farmer pressure: the gap slowly closes; dashing and clean running reopen it.
    s.gap -= dt * (0.55 + s.distance / 2600);
    if (s.dashLeft > 0) s.gap += dt * 3.2;
    s.gap = Math.min(MAX_GAP, s.gap);
    if (s.gap <= 0) {
      s.gap = 0;
      s.over = true;
      s.escaped = false;
      events |= EVENT_CAUGHT;
      return events;
    }

    this.spawnAhead();
    const box = this.turkeyBox;

    // Obstacles: collide in screen space, or score a near miss once passed clean.
    for (const ob of this.obstacles) {
      const sx = this.obstacleScreenX(ob);
      if (!ob.passed && sx + ob.width < TURKEY.x - 6) {
        ob.passed = true;
        if (!ob.hit) {
          s.combo += 1;
          s.bestCombo = Math.max(s.bestCombo, s.combo);
          s.score += NEAR_MISS_BONUS;
          s.nearMisses += 1;
          s.gap = Math.min(MAX_GAP, s.gap + 0.8);
          events |= EVENT_NEAR_MISS;
        }
      }
      if (ob.hit || s.invulnerableLeft > 0) continue;
      const overlapX = sx < box.x + box.width - 14 && sx + ob.width > box.x + 12;
      const overlapY = ob.y < box.y + box.height - 6 && ob.y + ob.height > box.y + 8;
      if (overlapX && overlapY) {
        ob.hit = true;
        events |= this.applyHit(ob);
        if (s.over) return events;
      }
    }
    this.obstacles = this.obstacles.filter((ob) => this.obstacleScreenX(ob) + ob.width > -80);

    // Pickups.
    for (const p of this.pickups) {
      if (p.taken) continue;
      const sx = this.obstacleScreenX(p);
      const cy = p.y + Math.sin(s.runSeconds * 3 + p.bob) * 5;
      const dxp = sx - (box.x + box.width / 2);
      const dyp = cy - (box.y + box.height / 2);
      if (dxp * dxp + dyp * dyp < 62 * 62) {
        p.taken = true;
        events |= this.applyPickup(p, sx, cy);
      }
    }
    this.pickups = this.pickups.filter((p) => !p.taken && this.obstacleScreenX(p) > -60);

    // Particles drift and die.
    for (const pt of this.particles) {
      pt.x -= v * dt * 0.4;
      pt.y += pt.vy * dt;
      pt.vy += 700 * dt;
      pt.life -= dt;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);

    // The forest gate: reaching the distance wins the escape.
    if (s.distance >= ESCAPE_DISTANCE && before < ESCAPE_DISTANCE) {
      s.over = true;
      s.escaped = true;
      s.score += 500 + s.lives * 100 + Math.round(s.gap * 5);
      events |= EVENT_ESCAPED;
    }
    return events;
  }

  // World items are stored by their spawn world offset; screen x = TURKEY.x + (item.x - worldX).
  obstacleScreenX(item) {
    return TURKEY.x + (item.x - this.worldX);
  }

  applyHit(ob) {
    const s = this.state;
    if (s.shield) {
      s.shield = false;
      s.invulnerableLeft = 1.1;
      s.bannerText = 'PIE SHIELD ATE THE HIT!';
      s.bannerLeft = 1.4;
      this.burst(TURKEY.x + 40, s.turkeyY - 40, '#f4a259', 14);
      return EVENT_HIT;
    }
    s.lives -= 1;
    s.combo = 0;
    s.gap = Math.max(0, s.gap - 9);
    s.hitFlashLeft = 0.5;
    s.invulnerableLeft = 1.1;
    this.burst(TURKEY.x + 40, s.turkeyY - 40, '#e63946', 16);
    if (s.lives <= 0) {
      s.over = true;
      s.escaped = false;
      return EVENT_HIT | EVENT_CAUGHT;
    }
    s.bannerText = `HIT BY THE ${OBSTACLES[ob.kind].label}!`;
    s.bannerLeft = 1.4;
    return EVENT_HIT;
  }

  applyPickup(p, sx, cy) {
    const s = this.state;
    const spec = PICKUPS[p.kind];
    s.score += spec.score;
    s.gap = Math.min(MAX_GAP, s.gap + 1.2);
    if (p.kind === 'corn') { s.cornEaten += 1; this.burst(sx, cy, '#ffd60a', 8); }
    if (p.kind === 'pie') { s.shield = true; this.burst(sx, cy, '#f4a259', 12); }
    if (p.kind === 'coffee') { s.coffeeLeft = 3.2; this.burst(sx, cy, '#6f4e37', 10); }
    if (p.kind === 'feather') { s.feathers += 1; this.burst(sx, cy, '#ffe66d', 18); }
    s.bannerText = spec.label;
    s.bannerLeft = 1.1;
    return EVENT_PICKUP;
  }
}
