/**
 * Tunnel Rush — pure game logic. No React, no DOM.
 *
 * Discrete single-lane objects float on the tunnel's inner circumference and
 * scroll toward the patient; everything except an object's own lane is open
 * passage. An object is a hit only when the lane facing the patient on
 * arrival IS the object's lane. Input rolls the tunnel the opposite way
 * (tap right → the tunnel rolls left), and `direction` adds an ambient spin
 * the patient must compensate for. Speed adapts inside the difficulty band:
 * clean dodges creep it toward the band ceiling, a hit eases it back down.
 */

import { DIFFICULTY_PRESETS, LEVEL_BONUS, MAX_LEVEL, OBSTACLES_PER_LEVEL, VIEW_DEPTH } from './config';

export const laneArcOf = (lanes) => (Math.PI * 2) / lanes;

const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

export class TunnelEngine {
  constructor({ lanes, difficulty, level, direction, spinSpeed, progressive, objectPool }) {
    this.lanes = lanes;
    this.arc = laneArcOf(lanes);
    this.band = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.medium;
    this.level = level;
    this.direction = direction;
    this.spinSpeed = (spinSpeed * Math.PI) / 180; // rad/s
    this.progressive = progressive;
    this.objectPool = objectPool || [];
    this.reset();
  }

  // Difficulty band, with the per-level ceiling bonus applied to the max.
  bandMin() { return this.band.speedMin; }
  bandMax() { return this.band.speedMax * (1 + LEVEL_BONUS.speed * (this.level - 1)); }
  spacing() { return Math.max(2.2, this.band.obstacleSpacing - (this.level - 1) * 0.06); }
  speedStep() { return (this.bandMax() - this.bandMin()) / 10; }

  reset() {
    this.scroll = 0;          // depth travelled (world units)
    this.angle = 0;           // logical tunnel rotation (radians)
    this.spinSign = this.direction === 'ccw' ? -1 : 1;
    this.altTimer = 0;
    this.obstacles = [];
    this.nextObstacleZ = 4;   // grace gap before the first object arrives
    this.lastLane = randInt(0, this.lanes - 1);
    this.obstaclesSpawned = 0;
    this.obstaclesPassed = 0;
    this.rotations = 0;
    this.streak = 0;          // consecutive clean dodges → speed creeps up
    this.speed = this.bandMin();
    // Pre-spawn the first visible objects so the ready screen shows the
    // tunnel ahead (they stay frozen until the first rotation).
    while (this.nextObstacleZ < VIEW_DEPTH) {
      this.obstacles.push(this.makeObstacle(this.nextObstacleZ));
      this.nextObstacleZ += this.spacing();
    }
  }

  // The tunnel lane currently in front of the patient (bottom of the screen).
  facing() {
    const f = Math.round(-this.angle / this.arc);
    return ((f % this.lanes) + this.lanes) % this.lanes;
  }

  // dir: -1 = input left, +1 = input right. The tunnel rolls the OPPOSITE
  // way, so the patient's view shifts in the tapped direction.
  rotate(dir) {
    this.angle += dir * this.arc;
    this.rotations += 1;
    // reaction time: last rotation before the nearest unresolved object
    const next = this.obstacles.find((o) => !o.resolved);
    if (next) next.lastRotateAt = performance.now();
  }

  makeObstacle(z) {
    // The object's lane always differs from the previous object's (a jump of
    // 1..maxJump lanes), so consecutive objects are never stacked and every
    // object demands a decision.
    const jump = randInt(1, this.band.maxJump);
    const side = Math.random() < 0.5 ? 1 : -1;
    let lane = (((this.lastLane + side * jump) % this.lanes) + this.lanes) % this.lanes;
    // Grace: the very first object never spawns on the patient's starting lane.
    if (this.obstaclesSpawned === 0 && lane === this.facing()) {
      lane = (lane + 1) % this.lanes;
    }
    this.lastLane = lane;

    const glyph = this.objectPool.length
      ? this.objectPool[randInt(0, this.objectPool.length - 1)]
      : null;
    this.obstaclesSpawned += 1;
    return {
      id: this.obstaclesSpawned, z, lane,
      type: glyph ? glyph.type : 'shapes',
      label: glyph ? glyph.label : 'square',
      resolved: false, spawnedAt: performance.now(), lastRotateAt: null,
    };
  }

  update(dt) {
    this.scroll += this.speed * dt;

    // Ambient spin the patient must compensate for.
    if (this.direction !== 'none') {
      if (this.direction === 'alternate') {
        this.altTimer += dt;
        if (this.altTimer >= 6) { this.spinSign *= -1; this.altTimer = 0; }
      }
      this.angle += this.spinSpeed * dt * this.spinSign;
    }

    // Spawn objects ahead of the visible depth, spaced by the current cadence.
    while (this.nextObstacleZ < this.scroll + VIEW_DEPTH) {
      this.obstacles.push(this.makeObstacle(this.nextObstacleZ));
      this.nextObstacleZ += this.spacing();
    }

    // Resolve objects crossing the patient plane: a hit only when the
    // object's lane is the lane facing the patient — every other lane is a
    // free pass.
    const passed = [];
    for (const o of this.obstacles) {
      if (!o.resolved && o.z - this.scroll <= 0) {
        o.resolved = true;
        const lane = this.facing();
        const hit = lane === o.lane;
        const reactionMs = o.lastRotateAt != null ? Math.max(0, o.lastRotateAt - o.spawnedAt) : null;

        // Adaptive pacing: clean dodges creep the speed toward the band
        // ceiling; a hit eases it back toward the floor.
        if (hit) {
          this.streak = 0;
          this.speed = Math.max(this.bandMin(), this.speed - this.speedStep() * 2.5);
        } else {
          this.streak += 1;
          this.speed = Math.min(this.bandMax(), this.speed + this.speedStep());
        }

        passed.push({ obstacle: o, lane, hit, reactionMs, speed: this.speed });
        this.obstaclesPassed += 1;
      }
    }
    this.obstacles = this.obstacles.filter((o) => o.z - this.scroll > -0.5);

    // Progressive levelling: one level every OBSTACLES_PER_LEVEL objects.
    let levelUp = null;
    if (this.progressive && this.obstaclesPassed > 0 && this.obstaclesPassed % OBSTACLES_PER_LEVEL === 0 && this.level < MAX_LEVEL) {
      this.level += 1;
      levelUp = this.level;
    }

    return { passed, levelUp };
  }
}