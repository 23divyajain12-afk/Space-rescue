// Space Rescue procedural game engine.
// The engine is intentionally deterministic per round seed and uses scenario
// templates instead of unconstrained random numbers. This keeps the game
// varied while guaranteeing a playable/fair decision curve.

export const GAME_DURATION = 40;
export const DOCK_DURATION = 2.4;
export const MIN_SHIPS = 3;
export const MAX_SHIPS = 5;

const SCENARIOS = {
  opening: [
    { kind: 'safe', reward: [110, 190], life: [9.5, 14.5] },
    { kind: 'safe', reward: [180, 280], life: [11, 16] },
    { kind: 'urgent', reward: [120, 210], life: [4.8, 7.2] },
    { kind: 'value', reward: [300, 430], life: [10.5, 16] },
  ],
  normal: [
    { kind: 'safe', reward: [100, 210], life: [7.5, 13] },
    { kind: 'value', reward: [240, 390], life: [9.5, 16] },
    { kind: 'urgent', reward: [150, 280], life: [3.8, 6.2] },
    { kind: 'value', reward: [320, 500], life: [7.5, 12] },
    { kind: 'balanced', reward: [200, 330], life: [6.5, 10] },
  ],
  tension: [
    { kind: 'value', reward: [300, 470], life: [6.5, 10] },
    { kind: 'urgent', reward: [170, 300], life: [3.5, 5.5] },
    { kind: 'safe', reward: [100, 190], life: [8.5, 13] },
    { kind: 'value', reward: [350, 560], life: [7, 10.5] },
    { kind: 'balanced', reward: [230, 350], life: [5.5, 8.5] },
  ],
  hard: [
    { kind: 'value', reward: [430, 560], life: [6.2, 8.2] },
  ],
  finale: [
    { kind: 'value', reward: [320, 520], life: [6, 9] },
    { kind: 'urgent', reward: [180, 300], life: [3.2, 5] },
    { kind: 'safe', reward: [100, 180], life: [7, 11] },
    { kind: 'value', reward: [380, 600], life: [7, 10] },
  ],
};

// Small deterministic PRNG. Same seed = same scenario family and values.
function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRoundSeed() {
  const now = Date.now() >>> 0;
  const random = Math.floor(Math.random() * 0xffffffff) >>> 0;
  return (now ^ random) >>> 0;
}

const int = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;
const float = (rng, min, max) => min + rng() * (max - min);
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

function phaseAt(elapsed) {
  if (elapsed < 8) return 'opening';
  if (elapsed < 23) return 'normal';
  if (elapsed < 33) return 'tension';
  return 'finale';
}

function roundDifficulty(elapsed) {
  // Smooth 0→1 curve, never making the first half feel punishing.
  return Math.min(1, Math.max(0, (elapsed - 8) / 32));
}

function createShip(rng, id, now, elapsed, forcedKind = null) {
  const phase = phaseAt(elapsed);
  const template = forcedKind
    ? SCENARIOS[phase].find(s => s.kind === forcedKind) || pick(rng, SCENARIOS[phase])
    : pick(rng, SCENARIOS[phase]);

  const difficulty = roundDifficulty(elapsed);
  const reward = int(rng, template.reward[0], template.reward[1]);
  // Later ships can be slightly tighter, but never below the designed floor.
  const life = float(rng, template.life[0], template.life[1]) - difficulty * 0.35;

  return {
    id,
    reward: Math.round(reward / 10) * 10,
    expiresAt: now + life * 1000,
    arrivalAt: now,
    status: 'waiting',
    kind: template.kind,
    phase,
  };
}

function hasUrgent(ships, now) {
  return ships.some(s => s.status === 'waiting' && (s.expiresAt - now) / 1000 <= 5.5);
}

function hasValue(ships) {
  return ships.some(s => s.reward >= 300);
}

function fairnessRepair(rng, ships, now, elapsed) {
  const waiting = ships.filter(s => s.status === 'waiting');
  if (waiting.length < MIN_SHIPS) return ships;

  // Never present a board where every ship is simultaneously urgent.
  const urgent = waiting.filter(s => (s.expiresAt - now) / 1000 <= 5.5);
  if (urgent.length === waiting.length) {
    const relaxed = waiting.reduce((best, s) => s.expiresAt > best.expiresAt ? s : best);
    relaxed.expiresAt = now + float(rng, 7.5, 10.5) * 1000;
  }

  // At least one meaningful reward should normally be visible.
  if (!hasValue(waiting) && elapsed < GAME_DURATION - 4) {
    const candidate = waiting.reduce((best, s) => s.reward < best.reward ? s : best);
    candidate.reward = int(rng, 300, 390);
  }
  return ships;
}

export function createGameEngine(seed = createRoundSeed()) {
  const rng = mulberry32(seed);
  let nextId = 1;
  let spawnedCount = 0;
  let lastSpawnAt = -Infinity;
  let lastHardDecisionAt = -Infinity;
  let hardDecisions = 0;

  const engine = {
    seed,
    getHardDecisions: () => hardDecisions,

    initialShips(now) {
      const elapsed = 0;
      // Deliberately curated opening: one clear value ship, one urgent-but-small,
      // and two normal choices. This teaches the game without a tutorial.
      const kinds = ['value', 'urgent', 'safe', 'balanced'];
      const ships = kinds.map(kind => createShip(rng, nextId++, now, elapsed, kind));
      spawnedCount += ships.length;
      lastSpawnAt = now;
      return ships;
    },

    shouldSpawn(now, elapsed, ships, dockingId) {
      const waiting = ships.filter(s => s.status === 'waiting');
      if (waiting.length >= MAX_SHIPS) return false;
      if (dockingId) return false;
      if (now - lastSpawnAt < 900) return false;

      // Natural pacing: refill quickly when the board gets thin, otherwise
      // create breathing room so the player can actually read the board.
      const desired = elapsed < 9 ? 4 : elapsed < 28 ? 4 : 3;
      if (waiting.length >= desired) return false;
      return true;
    },

    spawn(now, elapsed, ships) {
      const waiting = ships.filter(s => s.status === 'waiting');
      const phase = phaseAt(elapsed);
      let forcedKind = null;

      // Exactly 1–2 deliberately difficult moments per round. They are spaced
      // apart and only appear after the player understands the basic loop.
      // Two soft gates create intentional decision peaks. The first happens
      // around the middle of the round and the second later; each introduces
      // a high-value ship with a tighter expiry while other choices remain.
      // They are deterministic within the round, so randomness changes the
      // exact values, not whether the game suddenly becomes unfair.
      const firstHardWindow = elapsed >= 15 && elapsed < 20;
      const secondHardWindow = elapsed >= 27 && elapsed < 32;
      const scheduledHard = (firstHardWindow && hardDecisions === 0) ||
        (secondHardWindow && hardDecisions === 1);
      const canCreateHard = scheduledHard && elapsed - lastHardDecisionAt > 7 && waiting.length < MAX_SHIPS;
      if (canCreateHard) {
        const hardTemplate = SCENARIOS.hard[0];
        const reward = int(rng, hardTemplate.reward[0], hardTemplate.reward[1]);
        const life = float(rng, hardTemplate.life[0], hardTemplate.life[1]);
        const hardShip = {
          id: nextId++,
          reward: Math.round(reward / 10) * 10,
          expiresAt: now + life * 1000,
          arrivalAt: now,
          status: 'waiting',
          kind: 'hard',
          phase,
        };
        lastHardDecisionAt = elapsed;
        hardDecisions += 1;
        spawnedCount += 1;
        lastSpawnAt = now;
        return hardShip;
      } else if (phase === 'normal' && rng() < 0.35) {
        forcedKind = pick(rng, ['safe', 'urgent', 'balanced']);
      }

      const ship = createShip(rng, nextId++, now, elapsed, forcedKind);
      spawnedCount += 1;
      lastSpawnAt = now;
      return ship;
    },

    repair(now, elapsed, ships) {
      return fairnessRepair(rng, ships, now, elapsed);
    },

    evaluateChoice(ship, visibleShips, now) {
      // A hidden metric used only for analytics/feedback if desired later.
      // It does not change scoring. It estimates reward-per-second pressure.
      const seconds = Math.max(0.5, (ship.expiresAt - now) / 1000);
      const urgency = Math.max(0, 1 - seconds / 14);
      const value = ship.reward / 600;
      const opportunity = visibleShips.reduce((sum, s) => sum + s.reward, 0) / Math.max(1, visibleShips.length * 500);
      return {
        pressure: Math.min(1, urgency * 0.65 + value * 0.35),
        valueRatio: value,
        opportunity,
      };
    },

    getStats() {
      return { spawnedCount, hardDecisions };
    },
  };

  return engine;
}
