// Gobble Run renderer: every sprite is drawn with canvas shapes, no image files. Parallax hills,
// fences and (in the kitchen zone) hanging pans scroll at three speeds; the turkey runs with a
// two-frame leg cycle, a bobbing tail fan and a dash streak; Farmer Hank runs at the left edge,
// his on-screen position set by the chase GAP, waving his net. The HUD shows score, distance with
// a progress bar to the forest gate, hearts, the gap meter, combo, shield and dash cooldown.

import { ESCAPE_DISTANCE, GROUND_Y, MAX_GAP, OBSTACLES, TURKEY, VIEW, zoneAt } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function text(ctx, value, x, y, size, colour, align = 'left', weight = 800) {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px 'Trebuchet MS', Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

export function drawScene(ctx, world, screen, elapsed) {
  const s = world.state;
  const zone = zoneAt(s.distance);
  drawSky(ctx, zone, world.worldX);
  if (screen === SCREEN_PLAY || screen === SCREEN_OVER) {
    drawWorldItems(ctx, world, elapsed);
    drawFarmer(ctx, world, elapsed);
    drawTurkey(ctx, world, elapsed);
    drawParticles(ctx, world);
    drawGateIfNear(ctx, world);
    drawHud(ctx, world);
    if (s.hitFlashLeft > 0) {
      ctx.fillStyle = `rgba(230,57,70,${(s.hitFlashLeft * 0.35).toFixed(3)})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    if (s.bannerLeft > 0 && s.bannerText) drawBanner(ctx, s.bannerText);
  }
  if (screen === SCREEN_TITLE) drawTitle(ctx, world, elapsed);
  if (screen === SCREEN_OVER) drawEnd(ctx, world);
}

function drawSky(ctx, zone, worldX) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  grad.addColorStop(0, zone.sky);
  grad.addColorStop(0.62, zone.skyLow);
  grad.addColorStop(0.63, zone.ground);
  grad.addColorStop(1, zone.dirt);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Sun / kitchen lamp disc.
  ctx.fillStyle = 'rgba(255,244,200,0.9)';
  ctx.beginPath(); ctx.arc(1130, 96, 44, 0, Math.PI * 2); ctx.fill();
  // Far hills (slow parallax).
  ctx.fillStyle = 'rgba(90,60,30,0.35)';
  for (let i = -1; i < 6; i += 1) {
    const hx = i * 300 - (worldX * 0.15 % 300);
    ctx.beginPath(); ctx.arc(hx + 150, GROUND_Y, 170, Math.PI, 0); ctx.fill();
  }
  // Fence posts (mid parallax) and ground stripes (fast).
  ctx.fillStyle = 'rgba(70,42,16,0.55)';
  for (let i = -1; i < 14; i += 1) {
    const fx = i * 110 - (worldX * 0.5 % 110);
    ctx.fillRect(fx, GROUND_Y - 64, 12, 64);
  }
  ctx.fillRect(0, GROUND_Y - 52, VIEW.width, 7);
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  for (let i = -1; i < 10; i += 1) {
    const gx = i * 170 - (worldX % 170);
    ctx.fillRect(gx, GROUND_Y + 42 + (i % 3) * 34, 84, 9);
  }
  // Falling autumn leaves.
  ctx.fillStyle = 'rgba(214,90,30,0.8)';
  for (let i = 0; i < 9; i += 1) {
    const lx = ((i * 173 + 60 - worldX * 0.8) % (VIEW.width + 60) + VIEW.width + 60) % (VIEW.width + 60) - 30;
    const ly = 90 + ((i * 97) % 420);
    ctx.beginPath(); ctx.ellipse(lx, ly, 10, 5, i, 0, Math.PI * 2); ctx.fill();
  }
}

function drawWorldItems(ctx, world, elapsed) {
  for (const p of world.pickups) drawPickup(ctx, world.obstacleScreenX(p), p, elapsed);
  for (const ob of world.obstacles) drawObstacle(ctx, world.obstacleScreenX(ob), ob, elapsed);
}

function drawObstacle(ctx, x, ob, elapsed) {
  const ground = GROUND_Y;
  ctx.save();
  if (ob.kind === 'oven') {
    ctx.fillStyle = '#3b3f4a'; rr(ctx, x, ob.y, ob.width, ob.height, 8); ctx.fill();
    ctx.fillStyle = '#ff7b00';
    rr(ctx, x + 12, ob.y + 26, ob.width - 24, 40, 6); ctx.fill();
    ctx.fillStyle = '#ffd60a';
    for (let f = 0; f < 3; f += 1) {
      const fh = 16 + Math.sin(elapsed * 9 + f * 2) * 5;
      ctx.beginPath(); ctx.moveTo(x + 24 + f * 20, ob.y + 66);
      ctx.lineTo(x + 32 + f * 20, ob.y + 66 - fh); ctx.lineTo(x + 40 + f * 20, ob.y + 66); ctx.fill();
    }
    ctx.fillStyle = '#e9ecef'; ctx.fillRect(x + 8, ob.y + 8, ob.width - 16, 8);
    text(ctx, 'HOT!', x + ob.width / 2, ob.y + ob.height + 14, 15, '#7a1f1f', 'center');
  } else if (ob.kind === 'knife') {
    const sway = Math.sin(elapsed * 2.4 + x * 0.01) * 4;
    ctx.translate(x + ob.width / 2 + sway, 0);
    ctx.fillStyle = '#adb5bd'; ctx.fillRect(-3, 430, 6, 50); // hanging string
    ctx.fillStyle = '#dee2e6';
    ctx.beginPath(); ctx.moveTo(-13, 480); ctx.lineTo(13, 480); ctx.lineTo(9, 560); ctx.lineTo(0, 598); ctx.lineTo(-9, 560); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6c757d'; ctx.fillRect(-15, 470, 30, 12);
    text(ctx, 'DUCK!', 0, 622, 15, '#7a1f1f', 'center');
  } else if (ob.kind === 'banner') {
    ctx.fillStyle = '#7a1f1f'; ctx.fillRect(x, 452, ob.width, 10);
    ctx.fillStyle = '#b23a48'; rr(ctx, x - 12, 462, ob.width + 24, 92, 6); ctx.fill();
    text(ctx, 'DINNER', x + ob.width / 2, 492, 14, '#ffe8d6', 'center');
    text(ctx, 'TIME!', x + ob.width / 2, 516, 14, '#ffe8d6', 'center');
    text(ctx, 'DUCK!', x + ob.width / 2, 622, 15, '#7a1f1f', 'center');
  } else if (ob.kind === 'fence') {
    ctx.fillStyle = '#8d6e63';
    for (let p = 0; p < 4; p += 1) ctx.fillRect(x + 6 + p * 26, ob.y, 10, ob.height);
    ctx.fillRect(x, ob.y + 10, ob.width, 9); ctx.fillRect(x, ob.y + 36, ob.width, 9);
  } else if (ob.kind === 'hay') {
    ctx.fillStyle = '#e9c46a'; ctx.beginPath(); ctx.arc(x + ob.width / 2, ground - ob.height / 2, ob.width / 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b08900'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x + ob.width / 2, ground - ob.height / 2, ob.width / 3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + ob.width / 2, ground - ob.height / 2, ob.width / 5, 0, Math.PI * 2); ctx.stroke();
  } else if (ob.kind === 'gravy') {
    ctx.fillStyle = '#5f370e';
    ctx.beginPath(); ctx.ellipse(x + ob.width / 2, ground - 4, ob.width / 2, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.ellipse(x + ob.width / 3, ground - 8, 18, 4, 0, 0, Math.PI * 2); ctx.fill();
    text(ctx, 'SLIPPERY!', x + ob.width / 2, ground + 22, 14, '#3d2405', 'center');
  } else if (ob.kind === 'pumpkin') {
    for (const [px, py, r] of [[22, 26, 24], [48, 32, 20], [34, 12, 17]]) {
      ctx.fillStyle = '#e76f51';
      ctx.beginPath(); ctx.ellipse(x + px, ground - py, r, r * 0.82, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a9d8f'; ctx.fillRect(x + px - 3, ground - py - r * 0.82 - 7, 6, 8);
    }
  } else if (ob.kind === 'pot') {
    ctx.fillStyle = '#495057'; rr(ctx, x, ob.y + 14, ob.width, ob.height - 14, 10); ctx.fill();
    ctx.fillStyle = '#ced4da'; ctx.fillRect(x - 4, ob.y + 6, ob.width + 8, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let b = 0; b < 3; b += 1) {
      const by = ob.y - 6 - ((elapsed * 30 + b * 16) % 30);
      ctx.beginPath(); ctx.arc(x + 16 + b * 22, by, 5, 0, Math.PI * 2); ctx.fill();
    }
    text(ctx, 'STEW!', x + ob.width / 2, ob.y + ob.height + 14, 15, '#3d2405', 'center');
  }
  ctx.restore();
  void OBSTACLES;
}

function drawPickup(ctx, x, p, elapsed) {
  const y = p.y + Math.sin(elapsed * 3 + p.bob) * 5;
  ctx.save();
  ctx.translate(x, y);
  if (p.kind === 'corn') {
    ctx.rotate(0.5);
    ctx.fillStyle = '#ffd60a'; rr(ctx, -9, -17, 18, 34, 8); ctx.fill();
    ctx.strokeStyle = '#e0a800'; ctx.lineWidth = 2;
    for (let rI = -10; rI <= 10; rI += 7) { ctx.beginPath(); ctx.moveTo(-9, rI); ctx.lineTo(9, rI); ctx.stroke(); }
    ctx.fillStyle = '#7fb069'; ctx.beginPath(); ctx.ellipse(0, 20, 13, 6, 0, 0, Math.PI * 2); ctx.fill();
  } else if (p.kind === 'pie') {
    ctx.fillStyle = '#ced4da'; ctx.beginPath(); ctx.ellipse(0, 6, 22, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4a259'; ctx.beginPath(); ctx.ellipse(0, 0, 20, 11, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#bc6c25'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-14, -3); ctx.lineTo(14, 3); ctx.moveTo(-14, 3); ctx.lineTo(14, -3); ctx.stroke();
  } else if (p.kind === 'coffee') {
    ctx.fillStyle = '#fff'; rr(ctx, -13, -12, 26, 24, 4); ctx.fill();
    ctx.strokeStyle = '#6f4e37'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(16, 0, 8, -1.2, 1.2); ctx.stroke();
    ctx.fillStyle = '#6f4e37'; ctx.fillRect(-13, -12, 26, 8);
    text(ctx, 'GO', 0, 4, 11, '#6f4e37', 'center');
  } else if (p.kind === 'feather') {
    const glow = 0.5 + Math.sin(elapsed * 5) * 0.2;
    ctx.fillStyle = `rgba(255,230,109,${glow})`;
    ctx.beginPath(); ctx.arc(0, 0, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath(); ctx.ellipse(0, -2, 8, 19, 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b08900'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-6, 16); ctx.lineTo(8, -14); ctx.stroke();
  }
  ctx.restore();
}

export function drawTurkey(ctx, world, elapsed) {
  const s = world.state;
  const box = world.turkeyBox;
  const cx = box.x + box.width / 2;
  const ground = s.turkeyY;
  const running = s.grounded;
  const legSwing = running ? Math.sin(elapsed * 18) * 14 : 6;
  ctx.save();
  if (s.invulnerableLeft > 0 && Math.floor(elapsed * 14) % 2 === 0) ctx.globalAlpha = 0.45;
  // Dash streak.
  if (s.dashLeft > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 3; i += 1) ctx.fillRect(box.x - 60 - i * 26, box.y + 14 + i * 16, 52, 6);
  }
  // Legs.
  ctx.strokeStyle = '#e07b39'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(cx - 8, ground - 16); ctx.lineTo(cx - 8 + legSwing, ground); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + 12, ground - 16); ctx.lineTo(cx + 12 - legSwing, ground); ctx.stroke();
  // Tail fan.
  const fan = ['#b23a48', '#e76f51', '#f4a259', '#e9c46a', '#bc6c25'];
  for (let i = 0; i < 5; i += 1) {
    const a = -0.5 + i * 0.26 + Math.sin(elapsed * 6) * 0.04;
    ctx.fillStyle = fan[i];
    ctx.beginPath();
    ctx.ellipse(cx - 40 + Math.cos(a) * 6, box.y + 22 + Math.sin(a) * 16, 10, 24, a + 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Body.
  const bodyGrad = ctx.createLinearGradient(0, box.y, 0, ground);
  bodyGrad.addColorStop(0, '#a9713f');
  bodyGrad.addColorStop(1, '#7c4a21');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath(); ctx.ellipse(cx, box.y + box.height / 2 + 6, 44, box.height / 2, 0, 0, Math.PI * 2); ctx.fill();
  // Wing.
  ctx.fillStyle = '#8d5a2b';
  ctx.beginPath(); ctx.ellipse(cx - 2, box.y + box.height / 2 + 8, 24, 13, -0.4 + Math.sin(elapsed * 10) * 0.15, 0, Math.PI * 2); ctx.fill();
  // Neck and head.
  ctx.fillStyle = '#c08552';
  ctx.beginPath(); ctx.ellipse(cx + 36, box.y + 12, 13, 20, 0.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#d9a05b';
  ctx.beginPath(); ctx.arc(cx + 46, box.y + 2, 15, 0, Math.PI * 2); ctx.fill();
  // Wattle + beak + eye.
  ctx.fillStyle = '#e63946';
  ctx.beginPath(); ctx.ellipse(cx + 50, box.y + 14, 6, 11, 0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffb703';
  ctx.beginPath(); ctx.moveTo(cx + 58, box.y - 2); ctx.lineTo(cx + 76, box.y + 3); ctx.lineTo(cx + 58, box.y + 8); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#14213d';
  ctx.beginPath(); ctx.arc(cx + 50, box.y - 3, 3.4, 0, Math.PI * 2); ctx.fill();
  // Shield bubble.
  if (s.shield) {
    ctx.strokeStyle = 'rgba(244,162,89,0.95)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, box.y + box.height / 2, 62, 0, Math.PI * 2); ctx.stroke();
    text(ctx, 'PIE SHIELD', cx, box.y - 26, 14, '#7a3b06', 'center');
  }
  ctx.restore();
}

function drawFarmer(ctx, world, elapsed) {
  const s = world.state;
  // Hank's screen x follows the gap: a wide gap pushes him off the left edge; a closing gap looms.
  const x = -70 + (1 - s.gap / MAX_GAP) * 300;
  const bob = Math.abs(Math.sin(elapsed * 9)) * 7;
  const y = GROUND_Y - bob;
  ctx.save();
  ctx.translate(x, y);
  // Legs, boots.
  ctx.strokeStyle = '#3a506b'; ctx.lineWidth = 11; ctx.lineCap = 'round';
  const swing = Math.sin(elapsed * 9) * 20;
  ctx.beginPath(); ctx.moveTo(30, -58); ctx.lineTo(30 + swing, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(52, -58); ctx.lineTo(52 - swing, 0); ctx.stroke();
  // Overalls + shirt.
  ctx.fillStyle = '#3a506b'; rr(ctx, 12, -118, 58, 66, 8); ctx.fill();
  ctx.fillStyle = '#c1121f'; rr(ctx, 8, -142, 66, 34, 8); ctx.fill();
  // Arm swinging a net toward the turkey.
  ctx.strokeStyle = '#d9a05b'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(66, -128); ctx.lineTo(104, -104 + Math.sin(elapsed * 9) * 8); ctx.stroke();
  ctx.strokeStyle = '#6c757d'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(104, -104 + Math.sin(elapsed * 9) * 8); ctx.lineTo(138, -92 + Math.sin(elapsed * 9) * 8); ctx.stroke();
  ctx.strokeStyle = 'rgba(233,236,239,0.9)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(152, -84 + Math.sin(elapsed * 9) * 8, 24, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(152, -84 + Math.sin(elapsed * 9) * 8, 15, 0, Math.PI * 2); ctx.stroke();
  // Head + hat.
  ctx.fillStyle = '#e8b08a'; ctx.beginPath(); ctx.arc(41, -160, 21, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#e9c46a'; ctx.fillRect(8, -176, 66, 9);
  ctx.fillStyle = '#f4a259'; rr(ctx, 22, -192, 38, 18, 5); ctx.fill();
  ctx.fillStyle = '#14213d';
  ctx.beginPath(); ctx.arc(48, -162, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (s.gap < 16) text(ctx, 'HANK IS CLOSE!', x + 60, GROUND_Y - 226, 20, '#c1121f', 'center');
}

function drawGateIfNear(ctx, world) {
  const s = world.state;
  const remainingPx = (ESCAPE_DISTANCE - s.distance) * 10;
  if (remainingPx > VIEW.width) return;
  const x = TURKEY.x + remainingPx;
  ctx.fillStyle = '#2c422a';
  ctx.fillRect(x, GROUND_Y - 240, 16, 240);
  ctx.fillRect(x + 150, GROUND_Y - 240, 16, 240);
  ctx.fillStyle = '#7fb069'; rr(ctx, x - 8, GROUND_Y - 268, 182, 36, 8); ctx.fill();
  text(ctx, 'FOREST GATE', x + 83, GROUND_Y - 250, 19, '#10240f', 'center');
  // Trees behind the gate.
  for (let i = 0; i < 4; i += 1) {
    const tx = x + 190 + i * 60;
    ctx.fillStyle = '#1d3b1d';
    ctx.beginPath(); ctx.moveTo(tx, GROUND_Y - 190); ctx.lineTo(tx + 26, GROUND_Y - 90); ctx.lineTo(tx - 26, GROUND_Y - 90); ctx.closePath(); ctx.fill();
    ctx.fillRect(tx - 5, GROUND_Y - 92, 10, 92);
  }
}

function drawParticles(ctx, world) {
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life * 1.6);
    ctx.fillStyle = pt.colour;
    ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

function drawBanner(ctx, value) {
  ctx.fillStyle = 'rgba(20,20,30,0.82)';
  rr(ctx, VIEW.width / 2 - 300, 92, 600, 52, 12); ctx.fill();
  text(ctx, value, VIEW.width / 2, 119, 25, '#ffd60a', 'center');
}

export function drawHud(ctx, world) {
  const s = world.state;
  ctx.fillStyle = 'rgba(16,18,28,0.86)';
  rr(ctx, 14, 12, VIEW.width - 28, 66, 14); ctx.fill();
  text(ctx, `SCORE ${Math.floor(s.score)}`, 34, 46, 27, '#ffd60a');
  text(ctx, `${Math.min(1500, Math.floor(s.distance))}m / 1500m`, 330, 46, 24, '#fff');
  // Hearts.
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < s.lives ? '#e63946' : 'rgba(255,255,255,0.25)';
    const hx = 620 + i * 40;
    ctx.beginPath(); ctx.arc(hx - 8, 40, 9, 0, Math.PI * 2); ctx.arc(hx + 8, 40, 9, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(hx - 16, 44); ctx.lineTo(hx + 16, 44); ctx.lineTo(hx, 64); ctx.closePath(); ctx.fill();
  }
  text(ctx, `COMBO x${s.combo}`, 790, 46, 22, s.combo >= 5 ? '#7fb069' : '#e9ecef');
  text(ctx, zoneAt(s.distance).name, 1010, 46, 19, '#f4a259');
  // Progress bar to the gate.
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(ctx, 34, 758, 760, 20, 9); ctx.fill();
  ctx.fillStyle = '#7fb069'; rr(ctx, 34, 758, Math.max(20, 760 * (s.distance / ESCAPE_DISTANCE)), 20, 9); ctx.fill();
  text(ctx, 'ESCAPE PROGRESS', 414, 742, 15, '#fff', 'center');
  // Farmer gap meter.
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; rr(ctx, 830, 758, 300, 20, 9); ctx.fill();
  ctx.fillStyle = s.gap < 16 ? '#e63946' : '#f4a259';
  rr(ctx, 830, 758, Math.max(12, 300 * (s.gap / MAX_GAP)), 20, 9); ctx.fill();
  text(ctx, 'FARMER GAP', 980, 742, 15, '#fff', 'center');
  // Dash cooldown pip.
  text(ctx, s.dashCooldown <= 0 ? 'DASH READY (SPACE)' : 'dash charging…', 1170, 742, 14, s.dashCooldown <= 0 ? '#7fb069' : '#adb5bd', 'center');
  if (s.coffeeLeft > 0) text(ctx, 'COFFEE RUSH!', 1170, 110, 19, '#ffd60a', 'center');
}

function drawTitle(ctx, world, elapsed) {
  drawWorldItems(ctx, world, elapsed);
  drawTurkey(ctx, world, elapsed);
  ctx.fillStyle = 'rgba(24,12,4,0.55)';
  rr(ctx, 190, 96, 900, 470, 26); ctx.fill();
  text(ctx, 'GOBBLE RUN', VIEW.width / 2, 168, 84, '#ffd60a', 'center', 900);
  text(ctx, 'THE GREAT GOBBLE GETAWAY', VIEW.width / 2, 232, 30, '#f4a259', 'center');
  text(ctx, 'Dinner is at 6. You are NOT on the menu.', VIEW.width / 2, 282, 24, '#fff', 'center', 600);
  text(ctx, 'Run 1,500m from the BARN, through the FARMYARD and the KITCHEN', VIEW.width / 2, 330, 21, '#e9ecef', 'center', 600);
  text(ctx, 'GAUNTLET, to the FOREST GATE. Farmer Hank and his net are behind you!', VIEW.width / 2, 360, 21, '#e9ecef', 'center', 600);
  text(ctx, 'JUMP ovens, fences, hay, gravy and pots · DUCK knives and banners', VIEW.width / 2, 404, 20, '#ffd60a', 'center');
  text(ctx, 'Grab CORN, PIE SHIELDS, COFFEE and GOLDEN FEATHERS', VIEW.width / 2, 436, 20, '#ffd60a', 'center');
  text(ctx, '↑ / W / CLICK jump · ↓ / S duck · SPACE dash · P pause · M mute', VIEW.width / 2, 478, 20, '#fff', 'center');
  const pulse = 0.75 + Math.sin(elapsed * 4) * 0.25;
  ctx.globalAlpha = pulse;
  text(ctx, 'PRESS ENTER OR CLICK TO RUN FOR YOUR LIFE', VIEW.width / 2, 528, 26, '#7fb069', 'center', 900);
  ctx.globalAlpha = 1;
}

function drawEnd(ctx, world) {
  const s = world.state;
  ctx.fillStyle = s.escaped ? 'rgba(10,40,14,0.78)' : 'rgba(50,8,8,0.78)';
  rr(ctx, 240, 120, 800, 470, 26); ctx.fill();
  if (s.escaped) {
    text(ctx, 'YOU ESCAPED!', VIEW.width / 2, 196, 64, '#7fb069', 'center', 900);
    text(ctx, 'Free in the forest. Hank is having sandwiches.', VIEW.width / 2, 256, 24, '#fff', 'center', 600);
  } else {
    text(ctx, 'CAUGHT!', VIEW.width / 2, 196, 64, '#e63946', 'center', 900);
    text(ctx, `Hank's net got you at ${Math.floor(s.distance)}m of 1,500m.`, VIEW.width / 2, 256, 24, '#fff', 'center', 600);
  }
  text(ctx, `FINAL SCORE  ${Math.floor(s.score)}`, VIEW.width / 2, 322, 34, '#ffd60a', 'center');
  text(ctx, `Distance ${Math.floor(s.distance)}m · Corn ${s.cornEaten} · Golden feathers ${s.feathers}`, VIEW.width / 2, 372, 22, '#e9ecef', 'center', 600);
  text(ctx, `Near misses ${s.nearMisses} · Best combo x${s.bestCombo} · Time ${s.runSeconds.toFixed(1)}s`, VIEW.width / 2, 408, 22, '#e9ecef', 'center', 600);
  text(ctx, `Hearts left ${s.lives} · Farmer gap ${Math.round(s.gap)}m`, VIEW.width / 2, 444, 22, '#e9ecef', 'center', 600);
  text(ctx, 'PRESS ENTER OR CLICK TO RUN AGAIN', VIEW.width / 2, 522, 26, '#ffd60a', 'center', 900);
}
