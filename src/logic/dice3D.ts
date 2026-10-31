/* dice3D.ts
 *
 * 3D Projective Physics & Rendering Engine for Tumbling Dice:
 * - Parabolic ballistic arc with altitude & perspective scale
 * - Realistic double bounce physics (impact, secondary bounce, settle)
 * - Dynamic 3D rotation (pitch, yaw, roll) with spin decay
 * - Smooth ground shadow that scales & blurs with altitude
 * - Cube faces with ambient + directional lighting
 * - High-contrast pips with exact geometric coordinates
 * - Settle on target values with clear face-up display
 * - Consumed die dimming / red cross for used moves
 */

import { CheckerColor, DiceRoll } from './models';

export class BoardDiceState {
  public id: string;
  public color: CheckerColor;
  public roll: DiceRoll;
  public is_rolling: boolean;
  public duration: number; // in seconds
  public jitter_x1: number;
  public jitter_y1: number;
  public jitter_yaw1: number;
  public jitter_x2: number;
  public jitter_y2: number;
  public jitter_yaw2: number;
  public spin_pitch1: number;
  public spin_roll1: number;
  public spin_yaw1: number;
  public spin_pitch2: number;
  public spin_roll2: number;
  public spin_yaw2: number;
  public start_time_us: number;

  constructor(color: CheckerColor, roll: DiceRoll, duration: number = 1.35) {
    this.id = Math.random().toString(36).substring(2, 9);
    this.color = color;
    this.roll = roll;
    this.is_rolling = true;
    this.duration = duration;

    const randRange = (min: number, max: number) => min + Math.random() * (max - min);

    this.jitter_x1 = randRange(-8.0, 8.0);
    this.jitter_y1 = randRange(-6.0, 6.0);
    this.jitter_yaw1 = randRange(-0.15, 0.15);
    this.jitter_x2 = randRange(-8.0, 8.0);
    this.jitter_y2 = randRange(-6.0, 6.0);
    this.jitter_yaw2 = randRange(-0.15, 0.15);

    this.spin_pitch1 = randRange(1.6, 2.2);
    this.spin_roll1 = randRange(0.3, 0.65);
    this.spin_yaw1 = randRange(0.25, 0.55);
    this.spin_pitch2 = randRange(1.4, 2.0);
    this.spin_roll2 = randRange(-0.65, -0.3);
    this.spin_yaw2 = randRange(-0.55, -0.25);

    this.start_time_us = performance.now() * 1000;
  }
}

interface ProjectedDieFace {
  value: number;
  light: number;
  avg_z: number;
  center_x: number;
  center_y: number;
  ux_x: number;
  ux_y: number;
  vy_x: number;
  vy_y: number;
  q0_x: number; q0_y: number;
  q1_x: number; q1_y: number;
  q2_x: number; q2_y: number;
  q3_x: number; q3_y: number;
}

export class Dice3D {
  /**
   * Main entry point to render rolling or landed dice on the board canvas
   */
  public static renderBoardDice(
    ctx: CanvasRenderingContext2D,
    state: BoardDiceState,
    boardWidth: number,
    boardHeight: number,
    remainingDice: number[],
    _isHumanTurn: boolean,
    _onRollRequested?: () => void
  ): void {
    const now = performance.now() * 1000;
    const elapsed = (now - state.start_time_us) / 1000000.0;
    const rawT = Math.min(1.0, Math.max(0.0, elapsed / state.duration));
    const isPlayer = state.color === 'white';

    // Die size proportional to board (approx 68px at 1920 width)
    const dieSize = Math.max(38, Math.min(boardWidth * 0.042, boardHeight * 0.065));

    // Landing center: Player lands in right inner board, AI lands in left inner board
    const targetCenterX = boardWidth * (isPlayer ? 0.65 : 0.35);
    const targetCenterY = boardHeight * 0.50;

    const spacing = dieSize * 1.35;
    const target1X = targetCenterX - spacing * 0.55 + state.jitter_x1;
    const target1Y = targetCenterY - spacing * 0.20 + state.jitter_y1;
    const targetYaw1 = -0.12 + state.jitter_yaw1;

    const target2X = targetCenterX + spacing * 0.55 + state.jitter_x2;
    const target2Y = targetCenterY + spacing * 0.20 + state.jitter_y2;
    const targetYaw2 = 0.16 + state.jitter_yaw2;

    if (rawT < 1.0) {
      // --- Rolling / Tumbling Animation ---
      const start1X = isPlayer ? boardWidth + 80.0 : -80.0;
      const start1Y = targetCenterY + 60.0;
      const start2X = isPlayer ? boardWidth + 120.0 : -120.0;
      const start2Y = targetCenterY - 60.0;

      // Die 1
      const effT1 = Math.min(1.0, rawT * 1.02);
      const motion1 = Dice3D.computeMotion(effT1);
      const x1 = start1X + (target1X - start1X) * motion1.posFraction;
      const y1 = start1Y + (target1Y - start1Y) * motion1.posFraction - motion1.altitude;
      const rot1 = Dice3D.compute3DRotation(
        effT1,
        targetYaw1,
        state.spin_pitch1,
        state.spin_roll1,
        state.spin_yaw1,
        isPlayer
      );
      const scale1 = 1.0 + motion1.scaleProgress;
      const shadowRad1 = 4.0 + motion1.altitude * 0.35;
      const shadowOp1 = effT1 >= 0.82 ? 0.35 : 0.12 + 0.22 * (1.0 - Math.min(1.0, motion1.altitude / 85.0));

      // Die 2
      const effT2 = Math.min(1.0, Math.max(0.0, (rawT - 0.06) / 0.94));
      const motion2 = Dice3D.computeMotion(effT2);
      const x2 = start2X + (target2X - start2X) * motion2.posFraction;
      const y2 = start2Y + (target2Y - start2Y) * motion2.posFraction - motion2.altitude;
      const rot2 = Dice3D.compute3DRotation(
        effT2,
        targetYaw2,
        state.spin_pitch2,
        state.spin_roll2,
        state.spin_yaw2,
        isPlayer
      );
      const scale2 = 1.0 + motion2.scaleProgress;
      const shadowRad2 = 4.0 + motion2.altitude * 0.35;
      const shadowOp2 = effT2 >= 0.82 ? 0.35 : 0.12 + 0.22 * (1.0 - Math.min(1.0, motion2.altitude / 85.0));

      // Draw Shadows
      Dice3D.drawDieShadow(ctx, x1, y1 + motion1.altitude + 3, dieSize * scale1, shadowRad1, shadowOp1);
      Dice3D.drawDieShadow(ctx, x2, y2 + motion2.altitude + 3, dieSize * scale2, shadowRad2, shadowOp2);

      // Draw 3D Cubes
      Dice3D.drawProjected3DCube(ctx, x1, y1, dieSize * scale1, state.roll.die1, rot1.pitch, rot1.yaw, rot1.roll);
      Dice3D.drawProjected3DCube(ctx, x2, y2, dieSize * scale2, state.roll.die2, rot2.pitch, rot2.yaw, rot2.roll);
    } else {
      // --- Landed / Resting Dice on the Board ---
      state.is_rolling = false;

      // Determine which dice have been consumed
      const roll1 = state.roll.die1;
      const roll2 = state.roll.die2;
      const isDouble = state.roll.isDouble;

      if (isDouble) {
        // Double: 4 dice display (2x2 cluster)
        const dSize = dieSize * 0.88;
        const offset = dSize * 0.65;
        const positions = [
          { x: targetCenterX - offset, y: targetCenterY - offset },
          { x: targetCenterX + offset, y: targetCenterY - offset },
          { x: targetCenterX - offset, y: targetCenterY + offset },
          { x: targetCenterX + offset, y: targetCenterY + offset },
        ];

        positions.forEach((pos, idx) => {
          const isAvailable = idx < remainingDice.length;
          Dice3D.drawLandedDie(ctx, pos.x, pos.y, dSize, roll1, 0, isAvailable);
        });
      } else {
        // Standard 2 dice
        // Check availability
        let isDie1Avail = false;
        let isDie2Avail = false;
        if (remainingDice.length === 2) {
          isDie1Avail = true;
          isDie2Avail = true;
        } else if (remainingDice.length === 1) {
          if (remainingDice[0] === roll1) {
            isDie1Avail = true;
          } else {
            isDie2Avail = true;
          }
        }

        Dice3D.drawLandedDie(ctx, target1X, target1Y, dieSize, roll1, targetYaw1, isDie1Avail);
        Dice3D.drawLandedDie(ctx, target2X, target2Y, dieSize, roll2, targetYaw2, isDie2Avail);
      }
    }
  }

  /**
   * Draws a settled flat die with clean 3D bevel and clear pips
   */
  public static drawLandedDie(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    value: number,
    yaw: number = 0,
    isAvailable: boolean = true
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    if (yaw !== 0) ctx.rotate(yaw);

    const half = size / 2.0;
    const r = size * 0.18;

    // 1. Soft drop shadow on felt
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 4;

    // Body: Beveled ivory gradient
    const grad = ctx.createLinearGradient(-half, -half, half, half);
    if (isAvailable) {
      grad.addColorStop(0.0, '#ffffff');
      grad.addColorStop(0.3, '#fbfbfa');
      grad.addColorStop(0.8, '#e7e5e4');
      grad.addColorStop(1.0, '#d6d3d1');
    } else {
      // Dimmed / used
      grad.addColorStop(0.0, 'rgba(214, 211, 209, 0.45)');
      grad.addColorStop(1.0, 'rgba(168, 162, 158, 0.35)');
    }

    Dice3D.roundedRect(ctx, -half, -half, size, size, r);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // Border
    Dice3D.roundedRect(ctx, -half, -half, size, size, r);
    ctx.strokeStyle = isAvailable ? 'rgba(0, 0, 0, 0.18)' : 'rgba(0, 0, 0, 0.10)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Top Gloss Highlight
    if (isAvailable) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(0, -half * 0.45, half * 0.75, half * 0.30, 0, 0, Math.PI * 2);
      const gloss = ctx.createLinearGradient(0, -half, 0, 0);
      gloss.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
      gloss.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
      ctx.fillStyle = gloss;
      ctx.fill();
      ctx.restore();
    }

    // Pips
    const pipR = Math.max(2.0, size * 0.082);
    ctx.fillStyle = isAvailable ? '#1c1917' : 'rgba(28, 25, 23, 0.28)';

    const pips = Dice3D.facePipCoords(value);
    for (const [pu, pv] of pips) {
      const px = pu * (half * 1.15);
      const py = pv * (half * 1.15);
      ctx.beginPath();
      ctx.arc(px, py, pipR, 0, Math.PI * 2);
      ctx.fill();
    }

    // If consumed, draw a subtle stylish red cross
    if (!isAvailable) {
      ctx.save();
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.65)';
      ctx.lineWidth = Math.max(2, size * 0.07);
      ctx.lineCap = 'round';
      const pad = size * 0.20;
      ctx.beginPath();
      ctx.moveTo(-half + pad, -half + pad);
      ctx.lineTo(half - pad, half - pad);
      ctx.moveTo(half - pad, -half + pad);
      ctx.lineTo(-half + pad, half - pad);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  /**
   * Interactive "Roll Dice / تاس بریزید" Button drawn directly in canvas
   */
  public static drawRollButton(
    ctx: CanvasRenderingContext2D,
    boardWidth: number,
    boardHeight: number,
    _diceIconImg?: HTMLImageElement
  ): { x: number; y: number; width: number; height: number } {
    const btnW = Math.min(180, boardWidth * 0.16);
    const btnH = Math.min(54, boardHeight * 0.075);
    const btnX = boardWidth * 0.65 - btnW / 2; // Right quadrant
    const btnY = boardHeight * 0.50 - btnH / 2;

    ctx.save();
    // Glowing pulse shadow
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.005);
    ctx.shadowColor = `rgba(245, 158, 11, ${0.4 + 0.3 * pulse})`;
    ctx.shadowBlur = 14 + 6 * pulse;
    ctx.shadowOffsetY = 2;

    // Button body
    const grad = ctx.createLinearGradient(btnX, btnY, btnX, btnY + btnH);
    grad.addColorStop(0.0, '#f59e0b'); // amber-500
    grad.addColorStop(1.0, '#d97706'); // amber-600

    Dice3D.roundedRect(ctx, btnX, btnY, btnW, btnH, btnH * 0.35);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    // Border
    ctx.save();
    Dice3D.roundedRect(ctx, btnX, btnY, btnW, btnH, btnH * 0.35);
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    // Text & Dice Icon
    ctx.save();
    ctx.font = `bold ${Math.round(btnH * 0.38)}px Vazirmatn, sans-serif`;
    ctx.fillStyle = '#1c1917';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = '🎲 تاس بریزید';
    ctx.fillText(text, btnX + btnW / 2, btnY + btnH / 2 + 1);
    ctx.restore();

    return { x: btnX, y: btnY, width: btnW, height: btnH };
  }

  // Physics ballistic motion
  private static computeMotion(t: number): { posFraction: number; altitude: number; scaleProgress: number } {
    const impactT = 0.35;
    if (t <= impactT) {
      const u = t / impactT;
      return {
        posFraction: 0.72 * (1.0 - Math.pow(1.0 - u, 1.4)),
        altitude: 85.0 * (1.0 - u * u),
        scaleProgress: (85.0 * (1.0 - u * u) / 85.0) * 0.16,
      };
    } else if (t <= 0.65) {
      const u = (t - impactT) / 0.30;
      return {
        posFraction: 0.72 + 0.18 * (1.0 - Math.pow(1.0 - u, 1.6)),
        altitude: Math.sin(u * Math.PI) * 18.0,
        scaleProgress: (Math.sin(u * Math.PI) * 18.0 / 18.0) * 0.05,
      };
    } else if (t <= 0.83) {
      const u = (t - 0.65) / 0.18;
      return {
        posFraction: 0.90 + 0.08 * (1.0 - Math.pow(1.0 - u, 1.8)),
        altitude: Math.sin(u * Math.PI) * 5.0,
        scaleProgress: 0.0,
      };
    } else {
      const u = (t - 0.83) / 0.17;
      return {
        posFraction: 0.98 + 0.02 * (1.0 - Math.pow(1.0 - u, 2.0)),
        altitude: 0.0,
        scaleProgress: 0.0,
      };
    }
  }

  private static compute3DRotation(
    t: number,
    targetYaw: number,
    spinPitch: number,
    spinRoll: number,
    spinYaw: number,
    isRightSide: boolean
  ): { pitch: number; yaw: number; roll: number } {
    if (t >= 0.82) {
      return { pitch: 0.0, yaw: targetYaw, roll: 0.0 };
    }
    const impactT = 0.35;
    let decay: number;
    if (t <= impactT) {
      const u = t / impactT;
      decay = 1.0 - 0.60 * u;
    } else {
      const u = (t - impactT) / (0.82 - impactT);
      decay = 0.40 * Math.pow(1.0 - u, 2.0);
    }
    const sign = isRightSide ? 1.0 : -1.0;
    return {
      pitch: spinPitch * 2.0 * Math.PI * decay * sign,
      roll: spinRoll * 2.0 * Math.PI * decay * (-sign),
      yaw: targetYaw + spinYaw * 2.0 * Math.PI * decay * sign,
    };
  }

  private static drawDieShadow(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    radius: number,
    opacity: number
  ): void {
    if (opacity <= 0.01) return;
    ctx.save();
    const rMax = size * 0.55 + radius;
    const pat = ctx.createRadialGradient(cx, cy, size * 0.08, cx, cy, rMax);
    pat.addColorStop(0.0, `rgba(0, 0, 0, ${opacity})`);
    pat.addColorStop(0.6, `rgba(0, 0, 0, ${opacity * 0.35})`);
    pat.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = pat;
    ctx.beginPath();
    ctx.arc(cx, cy, rMax, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
  }

  private static rotate3D(
    x: number, y: number, z: number,
    pitch: number, roll: number, yaw: number
  ): { x: number; y: number; z: number } {
    const y1 = y * Math.cos(pitch) - z * Math.sin(pitch);
    const z1 = y * Math.sin(pitch) + z * Math.cos(pitch);
    const x1 = x;

    const x2 = x1 * Math.cos(roll) + z1 * Math.sin(roll);
    const z2 = -x1 * Math.sin(roll) + z1 * Math.cos(roll);
    const y2 = y1;

    const rx = x2 * Math.cos(yaw) - y2 * Math.sin(yaw);
    const ry = x2 * Math.sin(yaw) + y2 * Math.cos(yaw);
    const rz = z2;

    return { x: rx, y: ry, z: rz };
  }

  private static getSideValues(targetValue: number): { posY: number; negY: number; posX: number; negX: number } {
    switch (targetValue) {
      case 1: return { posY: 2, negY: 5, posX: 3, negX: 4 };
      case 2: return { posY: 6, negY: 1, posX: 3, negX: 4 };
      case 3: return { posY: 1, negY: 6, posX: 5, negX: 2 };
      case 4: return { posY: 1, negY: 6, posX: 2, negX: 5 };
      case 5: return { posY: 1, negY: 6, posX: 3, negX: 4 };
      case 6: return { posY: 5, negY: 2, posX: 3, negX: 4 };
      default: return { posY: 2, negY: 5, posX: 3, negX: 4 };
    }
  }

  private static drawProjected3DCube(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    s: number,
    targetValue: number,
    pitch: number,
    yaw: number,
    roll: number
  ): void {
    const sides = Dice3D.getSideValues(targetValue);
    const half = s / 2.0;
    const cameraDist = 800.0;

    const project = (ox: number, oy: number, oz: number) => {
      const r = Dice3D.rotate3D(ox, oy, oz, pitch, roll, yaw);
      const sc = cameraDist / (cameraDist + r.z);
      return {
        x: cx + r.x * sc,
        y: cy + r.y * sc,
        z: r.z,
      };
    };

    const facesDef = [
      { nx: 0, ny: 0, nz: 1, val: targetValue, u: [1, 0, 0], v: [0, 1, 0] },
      { nx: 0, ny: 0, nz: -1, val: 7 - targetValue, u: [-1, 0, 0], v: [0, 1, 0] },
      { nx: 0, ny: 1, nz: 0, val: sides.posY, u: [1, 0, 0], v: [0, 0, -1] },
      { nx: 0, ny: -1, nz: 0, val: sides.negY, u: [1, 0, 0], v: [0, 0, 1] },
      { nx: 1, ny: 0, nz: 0, val: sides.posX, u: [0, 1, 0], v: [0, 0, -1] },
      { nx: -1, ny: 0, nz: 0, val: sides.negX, u: [0, -1, 0], v: [0, 0, -1] },
    ];

    const visibleFaces: ProjectedDieFace[] = [];

    for (const f of facesDef) {
      const rotNormal = Dice3D.rotate3D(f.nx, f.ny, f.nz, pitch, roll, yaw);
      if (rotNormal.z <= 0.05) continue;

      const pCenter = project(f.nx * half, f.ny * half, f.nz * half);

      const uHalfX = f.u[0] * half;
      const uHalfY = f.u[1] * half;
      const uHalfZ = f.u[2] * half;
      const vHalfX = f.v[0] * half;
      const vHalfY = f.v[1] * half;
      const vHalfZ = f.v[2] * half;

      const cX = f.nx * half;
      const cY = f.ny * half;
      const cZ = f.nz * half;

      const q0 = project(cX - uHalfX - vHalfX, cY - uHalfY - vHalfY, cZ - uHalfZ - vHalfZ);
      const q1 = project(cX + uHalfX - vHalfX, cY + uHalfY - vHalfY, cZ + uHalfZ - vHalfZ);
      const q2 = project(cX + uHalfX + vHalfX, cY + uHalfY + vHalfY, cZ + uHalfZ + vHalfZ);
      const q3 = project(cX - uHalfX + vHalfX, cY - uHalfY + vHalfY, cZ - uHalfZ + vHalfZ);

      const light = Math.max(0.65, Math.min(1.0, 0.72 + rotNormal.z * 0.18 - rotNormal.y * 0.10));

      const pUx = project(cX + uHalfX, cY + uHalfY, cZ + uHalfZ);
      const pVy = project(cX + vHalfX, cY + vHalfY, cZ + vHalfZ);

      visibleFaces.push({
        value: f.val,
        light,
        avg_z: pCenter.z,
        center_x: pCenter.x,
        center_y: pCenter.y,
        ux_x: pUx.x - pCenter.x,
        ux_y: pUx.y - pCenter.y,
        vy_x: pVy.x - pCenter.x,
        vy_y: pVy.y - pCenter.y,
        q0_x: q0.x, q0_y: q0.y,
        q1_x: q1.x, q1_y: q1.y,
        q2_x: q2.x, q2_y: q2.y,
        q3_x: q3.x, q3_y: q3.y,
      });
    }

    visibleFaces.sort((a, b) => a.avg_z - b.avg_z);

    for (const f of visibleFaces) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(f.q0_x, f.q0_y);
      ctx.lineTo(f.q1_x, f.q1_y);
      ctx.lineTo(f.q2_x, f.q2_y);
      ctx.lineTo(f.q3_x, f.q3_y);
      ctx.closePath();

      const c = Math.round(248 * f.light);
      ctx.fillStyle = `rgb(${c}, ${c}, ${c})`;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Pips
      const pipR = Math.max(1.8, s * 0.068);
      ctx.fillStyle = 'rgba(24, 24, 27, 0.90)';

      const pips = Dice3D.facePipCoords(f.value);
      for (const [pu, pv] of pips) {
        const px = f.center_x + pu * f.ux_x + pv * f.vy_x;
        const py = f.center_y + pu * f.ux_y + pv * f.vy_y;
        ctx.beginPath();
        ctx.arc(px, py, pipR, 0, 2 * Math.PI);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private static facePipCoords(val: number): [number, number][] {
    const d = 0.52;
    switch (val) {
      case 1: return [[0, 0]];
      case 2: return [[-d, -d], [d, d]];
      case 3: return [[-d, -d], [0, 0], [d, d]];
      case 4: return [[-d, -d], [d, -d], [-d, d], [d, d]];
      case 5: return [[-d, -d], [d, -d], [0, 0], [-d, d], [d, d]];
      case 6: return [[-d, -d], [d, -d], [-d, 0], [d, 0], [-d, d], [d, d]];
      default: return [[0, 0]];
    }
  }

  public static roundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.arc(x + w - r, y + r, r, -Math.PI / 2, 0);
    ctx.arc(x + w - r, y + h - r, r, 0, Math.PI / 2);
    ctx.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI);
    ctx.arc(x + r, y + r, r, Math.PI, (3 * Math.PI) / 2);
    ctx.closePath();
  }
}
