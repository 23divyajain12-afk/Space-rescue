// Space Rescue — Fun, readable, fair procedural game engine.
// Same public API as the existing engine.
// Goal: create clear choices, not a wall of countdowns.

export const GAME_DURATION = 40;
export const DOCK_DURATION = 2.4;
export const MIN_SHIPS = 3;
export const MAX_SHIPS = 4;

const SCENARIOS = {
  opening: [
    { kind: 'safe', reward: [160, 230], life: [14, 18] },
    { kind: 'balanced', reward: [220, 320], life: [13, 17] },
    { kind: 'value', reward: [320, 430], life: [12, 16] },
  ],

  normal: [
    { kind: 'safe', reward: [150, 230], life: [13, 18] },
    { kind: 'balanced', reward: [220, 340], life: [12, 17] },
    { kind: 'value', reward: [320, 470], life: [11, 16] },
    { kind: 'urgent', reward: [180, 280], life: [8, 10] },
  ],

  tension: [
    { kind: 'safe', reward: [170, 250], life: [12, 17] },
    { kind: 'balanced', reward: [240, 360], life: [11, 16] },
    { kind: 'value', reward: [360, 520], life: [10.5, 15] },
    { kind: 'urgent', reward: [200, 300], life: [8, 10] },
  ],

  finale: [
    { kind: 'safe', reward: [160, 240], life: [11, 16] },
    { kind: 'balanced', reward: [230, 350], life: [10.5, 15] },
    { kind: 'value', reward: [350, 520], life: [10, 14] },
    { kind: 'urgent', reward: [190, 290], life: [8, 10] },
  ],
};

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

const int = (rng, min, max) =>
  Math.floor(rng() * (max - min + 1)) + min;

const float = (rng, min, max) =>
  min + rng() * (max - min);

const pick = (rng, arr) =>
  arr[Math.floor(rng() * arr.length)];

function phaseAt(elapsed) {
  if (elapsed < 8) return 'opening';
  if (elapsed < 21) return 'normal';
  if (elapsed < 33) return 'tension';
  return 'finale';
}

function waitingShips(ships) {
  return ships.filter(
    ship => ship.status === 'waiting'
  );
}

function secondsLeft(ship, now) {
  return Math.max(
    0,
    (ship.expiresAt - now) / 1000
  );
}

function urgentShips(ships, now) {
  return waitingShips(ships).filter(
    ship => secondsLeft(ship, now) <= 5
  );
}

function hasComfortableOption(ships, now) {
  return waitingShips(ships).some(
    ship => secondsLeft(ship, now) >= 9
  );
}

function hasValue(ships) {
  return waitingShips(ships).some(
    ship => ship.reward >= 350
  );
}

function createShip(
  rng,
  id,
  now,
  elapsed,
  forcedKind = null
) {
  const phase = phaseAt(elapsed);

  const pool = SCENARIOS[phase];

  let template;

  if (forcedKind) {
    template =
      pool.find(
        item => item.kind === forcedKind
      ) ||
      pool.find(
        item => item.kind === 'balanced'
      ) ||
      pick(rng, pool);
  } else {
    const roll = rng();

    // Opening is deliberately calm and understandable.
    if (phase === 'opening') {
      if (roll < 0.45) {
        template = pool.find(
          x => x.kind === 'safe'
        );
      } else if (roll < 0.78) {
        template = pool.find(
          x => x.kind === 'balanced'
        );
      } else {
        template = pool.find(
          x => x.kind === 'value'
        );
      }
    } else {
      // Favor easy/medium ships over urgent ones.
      if (roll < 0.32) {
        template = pool.find(
          x => x.kind === 'safe'
        );
      } else if (roll < 0.67) {
        template = pool.find(
          x => x.kind === 'balanced'
        );
      } else if (roll < 0.92) {
        template = pool.find(
          x => x.kind === 'value'
        );
      } else {
        template = pool.find(
          x => x.kind === 'urgent'
        );
      }
    }
  }

  const reward =
    Math.round(
      int(
        rng,
        template.reward[0],
        template.reward[1]
      ) / 10
    ) * 10;

  // Small penalty instead of losing the entire reward.
  const penalty = 20;

  const life = float(
    rng,
    template.life[0],
    template.life[1]
  );

  return {
    id,
    reward,
    penalty,
    expiresAt:
      now + life * 1000,
    arrivalAt: now,
    status: 'waiting',
    kind: template.kind,
    phase,
    repaired: false,
  };
}

function fairnessRepair(
  rng,
  ships,
  now,
  elapsed
) {
  const waiting =
    waitingShips(ships);

  if (!waiting.length) {
    return ships;
  }

  // Only one genuinely critical waiting ship.
  const urgent =
    urgentShips(
      waiting,
      now
    );

  if (urgent.length > 1) {
    const critical =
      urgent.reduce(
        (best, ship) =>
          secondsLeft(
            ship,
            now
          ) <
          secondsLeft(
            best,
            now
          )
            ? ship
            : best,
        urgent[0]
      );

    for (const ship of urgent) {
      if (
        ship.id === critical.id ||
        ship.repaired
      ) {
        continue;
      }

      ship.expiresAt =
        now +
        float(
          rng,
          9.5,
          13
        ) *
        1000;

      ship.kind =
        'balanced';

      ship.repaired =
        true;
    }
  }

  // Keep at least one comfortable option.
  if (
    elapsed <
      GAME_DURATION - 5 &&
    !hasComfortableOption(
      waiting,
      now
    )
  ) {
    const latest =
      waiting.reduce(
        (best, ship) =>
          ship.expiresAt >
          best.expiresAt
            ? ship
            : best,
        waiting[0]
      );

    latest.expiresAt =
      now +
      float(
        rng,
        11,
        15
      ) *
      1000;

    latest.kind =
      latest.reward >= 350
        ? 'value'
        : 'balanced';

    latest.repaired =
      true;
  }

  // Usually have one attractive reward.
  if (
    elapsed <
      GAME_DURATION - 5 &&
    !hasValue(waiting)
  ) {
    const candidate =
      waiting.reduce(
        (best, ship) =>
          ship.reward <
          best.reward
            ? ship
            : best,
        waiting[0]
      );

    candidate.reward =
      Math.round(
        int(
          rng,
          340,
          450
        ) / 10
      ) * 10;

    candidate.penalty = 20;

    if (
      candidate.kind ===
      'safe'
    ) {
      candidate.kind =
        'value';
    }
  }

  return ships;
}

export function createGameEngine(
  seed = createRoundSeed()
) {
  const rng =
    mulberry32(seed);

  let nextId = 1;

  let spawnedCount = 0;

  let lastSpawnAt =
    -Infinity;

  let decisionMoments = 0;

  let lastDecisionAt =
    -Infinity;

  const engine = {

    seed,

    getHardDecisions:
      () => decisionMoments,

    initialShips(now) {
      // Calm opening:
      // 3 clear choices and no urgency.

      const kinds = [
        'value',
        'balanced',
        'safe',
      ];

      const ships =
        kinds.map(
          kind =>
            createShip(
              rng,
              nextId++,
              now,
              0,
              kind
            )
        );

      spawnedCount +=
        ships.length;

      lastSpawnAt =
        now;

      return ships;
    },

    shouldSpawn(
      now,
      elapsed,
      ships,
      dockingId
    ) {
      if (
        elapsed >=
        GAME_DURATION
      ) {
        return false;
      }

      const waiting =
        waitingShips(
          ships
        );

      // Don't add ships while one is docking.
      if (dockingId) {
        return false;
      }

      // Hard cap.
      if (
        waiting.length >=
        MAX_SHIPS
      ) {
        return false;
      }

      // Give player time to read/react.
      const gap =
        elapsed < 10
          ? 2800
          : elapsed < 30
            ? 2400
            : 2000;

      if (
        now - lastSpawnAt <
        gap
      ) {
        return false;
      }

      // Refill only when board becomes thin.
      if (
        waiting.length <
        MIN_SHIPS
      ) {
        return true;
      }

      // Rare fourth ship only on calm board.
      if (
        waiting.length === 3 &&
        hasComfortableOption(
          ships,
          now
        ) &&
        urgentShips(
          ships,
          now
        ).length === 0
      ) {
        return rng() < 0.28;
      }

      return false;
    },

    spawn(
      now,
      elapsed,
      ships
    ) {
      const waiting =
        waitingShips(
          ships
        );

      const phase =
        phaseAt(elapsed);

      // If one critical ship exists,
      // next ship must be comfortable.
      if (
        urgentShips(
          ships,
          now
        ).length >= 1
      ) {
        const ship =
          createShip(
            rng,
            nextId++,
            now,
            elapsed,
            rng() < 0.65
              ? 'safe'
              : 'balanced'
          );

        spawnedCount++;

        lastSpawnAt =
          now;

        return ship;
      }

      // First meaningful decision.
      const firstWindow =
        elapsed >= 15 &&
        elapsed < 20;

      // Second meaningful decision.
      const secondWindow =
        elapsed >= 28 &&
        elapsed < 32;

      const scheduledDecision =
        (
          firstWindow &&
          decisionMoments === 0
        ) ||
        (
          secondWindow &&
          decisionMoments === 1
        );

      if (
        scheduledDecision &&
        elapsed -
          lastDecisionAt >= 8 &&
        waiting.length <
          MAX_SHIPS
      ) {
        const reward =
          Math.round(
            int(
              rng,
              phase === 'tension' ||
              phase === 'finale'
                ? 500
                : 440,
              phase === 'tension' ||
              phase === 'finale'
                ? 620
                : 560
            ) / 10
          ) * 10;

        // Valuable, but not nearly impossible.
        const life =
          float(
            rng,
            10,
            12.5
          );

        const ship = {
          id: nextId++,

          reward,

          penalty: 20,

          expiresAt:
            now +
            life * 1000,

          arrivalAt: now,

          status: 'waiting',

          kind: 'value',

          phase,

          repaired: false,
        };

        decisionMoments++;

        lastDecisionAt =
          elapsed;

        spawnedCount++;

        lastSpawnAt =
          now;

        return ship;
      }

      // Normal controlled generation.
      let forcedKind =
        null;

      if (
        phase !==
        'opening'
      ) {
        const roll =
          rng();

        if (
          roll < 0.10 &&
          urgentShips(
            ships,
            now
          ).length === 0
        ) {
          forcedKind =
            'urgent';
        } else if (
          roll < 0.42
        ) {
          forcedKind =
            'balanced';
        } else if (
          roll < 0.72
        ) {
          forcedKind =
            'value';
        } else {
          forcedKind =
            'safe';
        }
      }

      const ship =
        createShip(
          rng,
          nextId++,
          now,
          elapsed,
          forcedKind
        );

      spawnedCount++;

      lastSpawnAt =
        now;

      return ship;
    },

    repair(
      now,
      elapsed,
      ships
    ) {
      return fairnessRepair(
        rng,
        ships,
        now,
        elapsed
      );
    },

    evaluateChoice(
      ship,
      visibleShips,
      now
    ) {
      const seconds =
        secondsLeft(
          ship,
          now
        );

      const urgency =
        Math.max(
          0,
          1 -
            seconds /
            18
        );

      const value =
        Math.min(
          1,
          ship.reward /
            650
        );

      const pressure =
        Math.min(
          1,
          urgency * 0.35 +
          value * 0.65
        );

      const opportunity =
        visibleShips.reduce(
          (sum, item) =>
            sum +
            item.reward,
          0
        ) /
        Math.max(
          1,
          visibleShips.length *
          500
        );

      return {
        pressure,
        valueRatio:
          value,
        opportunity,
      };
    },

    getStats() {
      return {
        spawnedCount,
        hardDecisions:
          decisionMoments,
      };
    },
  };

  return engine;
}