/**
 * Tunnel Rush — pure game logic. No React, no DOM.
 *
 * The patient sits at the bottom of a polygonal tunnel; the tunnel's lanes
 * are fixed in tunnel-space and the whole tunnel rotates (patient input rolls
 * it one lane at a time; `direction` adds an ambient spin the patient must
 * compensate for). Gates spawn at the far end with a guaranteed opening; a
 * gate is a hit when the lane facing the patient at arrival is blocked.
 */

import { DIFFICULTY_PRESETS, LEVEL_BONUS, MAX_LEVEL, GATES_PER_LEVEL, VIEW_DEPTH } from './config';

export const laneArcOf = (lanes) => (Math.PI * 2) / lanes;

const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));

export class TunnelEngine {
  constructor({ lanes, difficulty, level, direction, spinSpeed, progressive, objectPool }) {
    this.lanes = lanes;
    this.arc = laneArcOf(lanes);
    this.preset = DIFFICULTY_PRESETS[difficulty] || DIFFICULTY_PRESETS.medium;
    this.level = level;
    this.direction = direction;
    this.spinSpeed = (spinSpeed * Math.PI) / 180; // rad/s
    this.progressive = progressive;
    this.objectPool = objectPool || [];
    this.reset();
  }

  reset() {
    this.scroll = 0;          // depth travelled (world units)
    this.angle = 0;           // logical tunnel rotation (radians)
    this.spinSign = this.direction === 'ccw' ? -1 : 1;
    this.altTimer = 0;
    this.gates = [];
    this.nextGateZ = 3.2;
    this.lastOpening = randInt(0, this.lanes - 1);
    this.gatesSpawned = 0;
    this.gatesPassed = 0;
    this.rotations = 0;
    // Pre-spawn the first visible gates so the ready screen shows the
    // tunnel ahead (they stay frozen until the first rotation).
    while (this.nextGateZ < VIEW_DEPTH) {
      this.gates.push(this.makeGate(this.nextGateZ));
      this.nextGateZ += this.params().gateSpacing;
    }
  }

  params() {
    const lv = this.level - 1;
    return {
      speed: this.preset.speed * (1 + LEVEL_BONUS.speed * lv),
      gateSpacing: Math.max(1.5, this.preset.gateSpacing - lv * 0.06),
      openWidth: this.preset.openWidth,
      blockedCount: Math.max(1, Math.round(this.lanes * (this.preset.blockedFrac + LEVEL_BONUS.blocked * lv))),
      maxJump: this.preset.maxJump,
    };
  }

  // The tunnel lane currently in front of the patient (bottom of the screen).
  facing() {
    const f = Math.round(-this.angle / this.arc);
    return ((f % this.lanes) + this.lanes) % this.lanes;
  }

  // dir: -1 rolls the tunnel one lane left, +1 one lane right.
  rotate(dir) {
    this.angle -= dir * this.arc;
    this.rotations += 1;
    // reaction time: last rotation before the next (nearest) unresolved gate
    const next = this.gates.find((g) => !g.resolved);
    if (next) next.lastRotateAt = performance.now();
  }

  makeGate(z) {
    const p = this.params();
    // Guaranteed opening, never jumping more than maxJump lanes from the
    // previous one, so every gate stays reachable at the current speed.
    const jump = randInt(1, p.maxJump);
    const side = Math.random() < 0.5 ? 1 : -1;
    const opening = (((this.lastOpening + side * jump) % this.lanes) + this.lanes) % this.lanes;
    this.lastOpening = opening;

    const blocked = [];
    for (let i = 0; i < this.lanes; i++) {
      const rel = (((i - opening) % this.lanes) + this.lanes) % this.lanes;
      if (rel >= p.openWidth) blocked.push(i);
    }

    // Procedural objects mark the dangerous lanes (1-2 per gate).
    const objLanes = [...blocked];
    const objects = [];
    const nObj = Math.min(objLanes.length, randInt(1, 2));
    for (let k = 0; k < nObj; k++) {
      const idx = randInt(0, objLanes.length - 1);
      const lane = objLanes.splice(idx, 1)[0];
      const glyph = this.objectPool.length ? this.objectPool[randInt(0, this.objectPool.length - 1)] : null;
      if (glyph) objects.push({ lane, type: glyph.type, label: glyph.label });
    }

    this.gatesSpawned += 1;
    return { id: this.gatesSpawned, z, blocked, objects, resolved: false, spawnedAt: performance.now(), lastRotateAt: null };
  }

  update(dt) {
    const p = this.params();
    this.scroll += p.speed * dt;

    // Ambient spin the patient must compensate for.
    if (this.direction !== 'none') {
      if (this.direction === 'alternate') {
        this.altTimer += dt;
        if (this.altTimer >= 6) { this.spinSign *= -1; this.altTimer = 0; }
      }
      this.angle += this.spinSpeed * dt * this.spinSign;
    }

    // Spawn gates ahead of the visible depth.
    while (this.nextGateZ < this.scroll + VIEW_DEPTH) {
      this.gates.push(this.makeGate(this.nextGateZ));
      this.nextGateZ += p.gateSpacing;
    }

    // Resolve gates crossing the patient plane.
    const passed = [];
    for (const g of this.gates) {
      if (!g.resolved && g.z - this.scroll <= 0) {
        g.resolved = true;
        const lane = this.facing();
        const hit = g.blocked.includes(lane);
        const reactionMs = g.lastRotateAt != null ? Math.max(0, g.lastRotateAt - g.spawnedAt) : null;
        passed.push({ gate: g, lane, hit, reactionMs });
        this.gatesPassed += 1;
      }
    }
    this.gates = this.gates.filter((g) => g.z - this.scroll > -0.5);

    // Progressive levelling: one level every GATES_PER_LEVEL gates.
    let levelUp = null;
    if (this.progressive && this.gatesPassed > 0 && this.gatesPassed % GATES_PER_LEVEL === 0 && this.level < MAX_LEVEL) {
      this.level += 1;
      levelUp = this.level;
    }

    return { passed, levelUp };
  }
}