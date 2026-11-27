// Gobble Run: config for the great turkey escape. All balance, layout and zone data lives here.
// The turkey (player) must cover ESCAPE_DISTANCE metres, from the barn to the forest gate, before
// Farmer Hank closes the gap or three hits end the run.

export const VIEW = { width: 1280, height: 800 };
export const GROUND_Y = 648;
export const STEP = 1 / 60;

export const ESCAPE_DISTANCE = 1500; // metres to the forest gate: reaching it wins the game
export const START_LIVES = 3;
export const START_GAP = 46; // farmer gap in metres; 0 means caught
export const MAX_GAP = 60;

export const TURKEY = {
  x: 300, // fixed screen x; the world scrolls past
  width: 92,
  height: 74,
  jumpVelocity: -1090,
  gravity: 2500,
  dashSpeed: 260, // extra px/s while dashing
  dashSeconds: 0.45,
  dashCooldown: 1.6,
  duckHeight: 46,
};

// The four zones of the escape, by distance. Each zone re-skins the world and adds its own hazards.
export const ZONES = [
  { name: '1 · THE BARN', from: 0, sky: '#f7b733', skyLow: '#fde3a7', ground: '#b5651d', dirt: '#8d4e12' },
  { name: '2 · FARMYARD DASH', from: 380, sky: '#fc4a1a', skyLow: '#f7b733', ground: '#a0522d', dirt: '#7c3f16' },
  { name: '3 · KITCHEN GAUNTLET', from: 800, sky: '#5b2a86', skyLow: '#c94b6d', ground: '#6e3b2e', dirt: '#4e281c' },
  { name: '4 · FOREST GATE RUN', from: 1180, sky: '#274156', skyLow: '#7fb069', ground: '#3d5a3a', dirt: '#2c422a' },
];

export function zoneAt(distance) {
  let zone = ZONES[0];
  for (const z of ZONES) if (distance >= z.from) zone = z;
  return zone;
}

// Obstacle kinds: jump them, duck under them, or slide through. Each names how it is beaten.
export const OBSTACLES = {
  oven: { width: 86, height: 92, beat: 'JUMP', label: 'OVEN' },
  knife: { width: 30, height: 118, beat: 'DUCK', label: 'CARVING KNIFE' },
  fence: { width: 104, height: 58, beat: 'JUMP', label: 'FENCE' },
  hay: { width: 78, height: 62, beat: 'JUMP', label: 'HAY BALE' },
  gravy: { width: 118, height: 16, beat: 'JUMP', label: 'GRAVY PUDDLE' },
  pumpkin: { width: 64, height: 52, beat: 'JUMP', label: 'PUMPKIN STACK' },
  pot: { width: 74, height: 66, beat: 'JUMP', label: 'STOCK POT' },
  banner: { width: 34, height: 104, beat: 'DUCK', label: 'DINNER BANNER' },
};

// Pickups: corn scores, pie shields one hit, coffee speeds the legs, the golden feather is rare gold.
export const PICKUPS = {
  corn: { radius: 17, score: 25, label: 'CORN +25' },
  pie: { radius: 20, score: 40, label: 'PIE SHIELD' },
  coffee: { radius: 18, score: 30, label: 'COFFEE DASH' },
  feather: { radius: 19, score: 150, label: 'GOLDEN FEATHER +150' },
};

export const SCORE_PER_METRE = 2;
export const NEAR_MISS_BONUS = 15;
