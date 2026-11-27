# Gobble Run: The Great Gobble Getaway

![make.fun bounty](https://make.fun/badge/turkey-run-game-01.svg)
![rank](https://make.fun/badge/turkey-run-game-01/alvenze/turkey-escape-game/rank.svg)
![reward](https://make.fun/badge/turkey-run-game-01/alvenze/turkey-escape-game/reward.svg)

Bounty: [Make the best turkey escape game](https://make.fun/bounty/turkey-run-game-01)

**Gobble Run: The Great Gobble Getaway** is a complete, original turkey escape
game that runs offline in a desktop browser from static files. Dinner is at
six and you are NOT on the menu: you are the turkey, and Farmer Hank is right
behind you with a net. Run 1,500 metres through four zones, from the barn,
across the farmyard, through the kitchen gauntlet, to the forest gate and
freedom.

## How to play

- **Jump** (ArrowUp, W, or click): ovens, fences, hay bales, gravy puddles,
  pumpkin stacks and stock pots.
- **Duck** (hold ArrowDown or S): hanging carving knives and DINNER TIME
  banners sweep low over the track.
- **Dash** (Space or Shift): a burst of speed that reopens the farmer gap;
  watch the DASH READY pip in the HUD.
- **Pause** P, **mute** M, **start and restart** Enter or click.
- The **farmer gap meter** always closes in; hits slam it down by 9 metres and
  cost a heart. Three hearts, and a pie shield that eats one hit for you.
- Pickups: **corn** (+25), **pumpkin pie shield**, **coffee** (speed rush),
  and the rare **golden feather** (+150). Clean passes pay near-miss bonuses
  and build your combo.
- Reach the forest gate at 1,500m to escape and bank a win bonus; get caught
  (gap 0) or lose all hearts and the end screen shows your full run tally
  with a one-key restart.

## Running it

- Play: `node serve.ts`, then open http://localhost:8080 in desktop Chrome.
- Hand in: `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` copies
  `game/` and `screenshots/` to the output and writes `dossier.json` with
  the vendored make.fun library in `vendor/makefun-game.ts`.

## Structure

- `game/src/config.js`: balance, zones, obstacle and pickup tables.
- `game/src/world.js`: the escape rules: physics, spawning, collisions,
  the farmer chase gap, pickups, win and caught conditions.
- `game/src/render.js`: every sprite drawn in canvas shapes, parallax
  scenery, the HUD (score, distance, hearts, combo, escape progress,
  farmer gap, dash state), title and end screens.
- `game/src/input.js`: keyboard and mouse controls.
- `game/src/audio.js`: synthesised WebAudio gobbles, squawks and bells,
  no audio files.
- `game/src/random.js`: seeded random so screenshot scenes reproduce.
- `game/src/shots.js`: the deterministic `?shot=` scenes behind the
  screenshots in `screenshots/`.
- `game/src/main.js`: the game loop and screen wiring.

All art, names, sounds and code are original to this entry; everything is
drawn with canvas shapes and synthesised in the browser, with no network
requests and no external assets.
