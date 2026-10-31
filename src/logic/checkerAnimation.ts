/* checkerAnimation.ts
 *
 * 60FPS Checker Physics & Movement Animation Engine for Traditional Iranian Backgammon:
 * - Parabolic 3D flight trajectory with realistic lift, scale and dynamic ground shadow
 * - Cubic Bezier easing curve (ease-out cubic / natural physics deceleration)
 * - Microscopic landing settle bounce and synchronized audio impact
 * - Dynamic hit blot trajectory: opponent blot launches in a tumbling arc to The Bar
 * - Drag-and-drop magnetic snap-in and snap-back animations
 * - Screen-independent real-time coordinate tracking matching BoardLayout
 */

import { BoardPoint, BoardSide, BoardTheme, CheckerColor, oppositeColor } from './models';
import { BoardLayout } from './boardLayout';
import { SoundManager } from './soundManager';

export interface MoveAnimOptions {
  from: BoardPoint | 'bar';
  to: BoardPoint | null;
  color: CheckerColor;
  isHit: boolean;
  fromStackIndex?: number;
  toStackIndex?: number;
  hitBarIndex?: number;
  customStartPos?: { x: number; y: number };
  duration?: number;
  onComplete?: () => void;
}

export interface SnapBackOptions {
  origin: BoardPoint | 'bar';
  color: CheckerColor;
  stackIndex: number;
  fromPos: { x: number; y: number };
  duration?: number;
}

interface ActiveMoveAnim {
  id: string;
  type: 'move';
  from: BoardPoint | 'bar';
  to: BoardPoint | null;
  color: CheckerColor;
  isHit: boolean;
  fromStackIndex: number;
  toStackIndex: number;
  hitBarIndex: number;
  customStartPos?: { x: number; y: number };
  startTime: number;
  duration: number;
  hasPlayedLandSound: boolean;
  hasPlayedHitSound: boolean;
  onComplete?: () => void;
}

interface ActiveSnapBackAnim {
  id: string;
  type: 'snapback';
  origin: BoardPoint | 'bar';
  color: CheckerColor;
  stackIndex: number;
  fromPos: { x: number; y: number };
  startTime: number;
  duration: number;
}

type ActiveAnim = ActiveMoveAnim | ActiveSnapBackAnim;

export class CheckerAnimationEngine {
  private static instance: CheckerAnimationEngine | null = null;
  private activeAnimations: ActiveAnim[] = [];

  static shared(): CheckerAnimationEngine {
    if (!this.instance) {
      this.instance = new CheckerAnimationEngine();
    }
    return this.instance;
  }

  clear(): void {
    this.activeAnimations = [];
  }

  hasActiveAnimations(): boolean {
    return this.activeAnimations.length > 0;
  }

  startMove(options: MoveAnimOptions): void {
    const anim: ActiveMoveAnim = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'move',
      from: options.from,
      to: options.to,
      color: options.color,
      isHit: options.isHit,
      fromStackIndex: options.fromStackIndex ?? 0,
      toStackIndex: options.toStackIndex ?? 0,
      hitBarIndex: options.hitBarIndex ?? 0,
      customStartPos: options.customStartPos,
      startTime: performance.now(),
      duration: options.duration ?? 340,
      hasPlayedLandSound: false,
      hasPlayedHitSound: false,
      onComplete: options.onComplete,
    };
    this.activeAnimations.push(anim);
  }

  startSnapBack(options: SnapBackOptions): void {
    const anim: ActiveSnapBackAnim = {
      id: Math.random().toString(36).substring(2, 9),
      type: 'snapback',
      origin: options.origin,
      color: options.color,
      stackIndex: options.stackIndex,
      fromPos: options.fromPos,
      startTime: performance.now(),
      duration: options.duration ?? 160,
    };
    this.activeAnimations.push(anim);
  }

  isTargetPoint(point: BoardPoint): boolean {
    return this.activeAnimations.some(
      a => (a.type === 'move' && a.to === point) || (a.type === 'snapback' && a.origin === point)
    );
  }

  getTargetSlot(point: BoardPoint): number {
    for (const a of this.activeAnimations) {
      if (a.type === 'move' && a.to === point) return a.toStackIndex;
      if (a.type === 'snapback' && a.origin === point) return a.stackIndex;
    }
    return -1;
  }

  isHitBarTarget(color: CheckerColor): boolean {
    return this.activeAnimations.some(
      a => a.type === 'move' && a.isHit && oppositeColor(a.color) === color
    );
  }

  getHitBarSlot(color: CheckerColor): number {
    for (const a of this.activeAnimations) {
      if (a.type === 'move' && a.isHit && oppositeColor(a.color) === color) {
        return a.hitBarIndex;
      }
    }
    return -1;
  }

  isBearOffTarget(color: CheckerColor): boolean {
    return this.activeAnimations.some(
      a => a.type === 'move' && a.to === null && a.color === color
    );
  }

  getBearOffSlot(color: CheckerColor): number {
    for (const a of this.activeAnimations) {
      if (a.type === 'move' && a.to === null && a.color === color) {
        return a.toStackIndex;
      }
    }
    return -1;
  }

  render(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    images: Record<string, HTMLImageElement>,
    boardTheme: BoardTheme,
    boardSide: BoardSide = 'right'
  ): void {
    if (this.activeAnimations.length === 0) return;

    const now = performance.now();
    const remaining: ActiveAnim[] = [];
    const diameter = BoardLayout.checkerDiameter(width, height);
    const radius = diameter / 2;

    for (const anim of this.activeAnimations) {
      const elapsed = now - anim.startTime;
      const rawProgress = Math.min(1.0, Math.max(0.0, elapsed / anim.duration));

      if (anim.type === 'snapback') {
        // --- Snap-back Animation on invalid drop ---
        const ease = 1 - Math.pow(1 - rawProgress, 3);
        let targetX = 0;
        let targetY = 0;

        if (anim.origin === 'bar') {
          const p = BoardLayout.barPosition(anim.color, anim.stackIndex, width, height);
          targetX = p.x;
          targetY = p.y;
        } else {
          const p = BoardLayout.position(anim.origin, width, height, boardSide);
          const dir = anim.origin >= 13 ? 1 : -1;
          const offY = BoardLayout.stackOffset(anim.stackIndex, diameter, dir);
          targetX = p.x;
          targetY = p.y + offY;
        }

        const curX = anim.fromPos.x + (targetX - anim.fromPos.x) * ease;
        const curY = anim.fromPos.y + (targetY - anim.fromPos.y) * ease;
        const arc = Math.sin(rawProgress * Math.PI);
        const renderY = curY - arc * 14;

        this.drawChecker(
          ctx,
          curX,
          renderY,
          curY,
          radius,
          arc,
          anim.color,
          boardTheme,
          images
        );

        if (rawProgress < 1.0) {
          remaining.push(anim);
        }
        continue;
      }

      // --- Main Move Animation ---
      const ease = 1 - Math.pow(1 - rawProgress, 3);

      // 1. Calculate Start (From) Position
      let startX = 0;
      let startY = 0;
      if (anim.customStartPos) {
        startX = anim.customStartPos.x;
        startY = anim.customStartPos.y;
      } else if (anim.from === 'bar') {
        const p = BoardLayout.barPosition(anim.color, anim.fromStackIndex, width, height);
        startX = p.x;
        startY = p.y;
      } else {
        const p = BoardLayout.position(anim.from, width, height, boardSide);
        const dir = anim.from >= 13 ? 1 : -1;
        const offY = BoardLayout.stackOffset(anim.fromStackIndex, diameter, dir);
        startX = p.x;
        startY = p.y + offY;
      }

      // 2. Calculate Target (To) Position
      let targetX = 0;
      let targetY = 0;
      if (anim.to === null) {
        const p = BoardLayout.bearOffPosition(anim.color, anim.toStackIndex, width, height, boardSide);
        targetX = p.x;
        targetY = anim.color === 'white' ? height * 0.78 : height * 0.22;
      } else {
        const p = BoardLayout.position(anim.to, width, height, boardSide);
        const dir = anim.to >= 13 ? 1 : -1;
        const offY = BoardLayout.stackOffset(anim.toStackIndex, diameter, dir);
        targetX = p.x;
        targetY = p.y + offY;
      }

      // Current 2D interpolated position
      const curX = startX + (targetX - startX) * ease;
      const curY = startY + (targetY - startY) * ease;

      // Parabolic 3D flight arc (lift off the board)
      const arc = Math.sin(rawProgress * Math.PI);
      const moveDistance = Math.hypot(targetX - startX, targetY - startY);
      const maxLift = Math.min(54, Math.max(18, moveDistance * 0.12 + 16));
      let lift = maxLift * arc;

      // Microscopic landing settle on touchdown
      let settleY = 0;
      if (rawProgress >= 0.82) {
        const st = (rawProgress - 0.82) / 0.18;
        settleY = Math.sin(st * Math.PI * 2) * Math.exp(-st * 3.5) * 2.2;
      }

      const renderY = curY - lift + settleY;

      // Sound trigger upon landing impact
      if (rawProgress >= 0.84 && !anim.hasPlayedLandSound) {
        anim.hasPlayedLandSound = true;
        SoundManager.shared().playMove();
      }

      // Draw ground shadow & elevated moving checker
      this.drawChecker(
        ctx,
        curX,
        renderY,
        curY,
        radius,
        arc,
        anim.color,
        boardTheme,
        images
      );

      // --- Dynamic Hit Blot Trajectory (Opponent blot launches to The Bar) ---
      if (anim.isHit && anim.to !== null) {
        const hitOpponentColor = oppositeColor(anim.color);
        const hitTriggerProgress = 0.42;

        if (rawProgress >= hitTriggerProgress) {
          const hitProgress = Math.min(
            1.0,
            (rawProgress - hitTriggerProgress) / (1.0 - hitTriggerProgress)
          );
          const hitEase = 1 - Math.pow(1 - hitProgress, 2.5);

          // Hit start = point `to` position
          const hitPt = BoardLayout.position(anim.to, width, height, boardSide);
          const hitDir = anim.to >= 13 ? 1 : -1;
          const hitFromX = hitPt.x;
          const hitFromY = hitPt.y + BoardLayout.stackOffset(0, diameter, hitDir);

          // Hit target = The Bar position
          const barPos = BoardLayout.barPosition(hitOpponentColor, anim.hitBarIndex, width, height);
          const hitToX = barPos.x;
          const hitToY = barPos.y;

          const hitCurX = hitFromX + (hitToX - hitFromX) * hitEase;
          const hitCurY = hitFromY + (hitToY - hitFromY) * hitEase;

          const hitArc = Math.sin(hitProgress * Math.PI);
          const hitDist = Math.hypot(hitToX - hitFromX, hitToY - hitFromY);
          const hitLift = Math.min(75, hitDist * 0.16 + 28) * hitArc;
          const hitRenderY = hitCurY - hitLift;
          const hitAngle = hitProgress * Math.PI * 1.6 * (anim.color === 'white' ? 1 : -1);

          // Play hit landing sound
          if (hitProgress >= 0.88 && !anim.hasPlayedHitSound) {
            anim.hasPlayedHitSound = true;
            SoundManager.shared().playStep();
          }

          // Draw hit blot in flight with tumble rotation
          this.drawHitBlot(
            ctx,
            hitCurX,
            hitRenderY,
            hitCurY,
            radius,
            hitArc,
            hitAngle,
            hitOpponentColor,
            boardTheme,
            images
          );
        }
      }

      if (rawProgress < 1.0) {
        remaining.push(anim);
      } else {
        if (anim.onComplete) {
          try {
            anim.onComplete();
          } catch {
            // ignore
          }
        }
      }
    }

    this.activeAnimations = remaining;
  }

  private drawChecker(
    ctx: CanvasRenderingContext2D,
    curX: number,
    renderY: number,
    groundY: number,
    radius: number,
    arc: number,
    color: CheckerColor,
    boardTheme: BoardTheme,
    images: Record<string, HTMLImageElement>
  ): void {
    const scale = 1.0 + 0.12 * arc;
    const currentRadius = radius * scale;
    const currentDiameter = currentRadius * 2;
    const lift = groundY - renderY;

    // 1. Ground Shadow (stays on board surface, softens & blurs with height)
    ctx.save();
    ctx.beginPath();
    const shadowY = groundY + 3 + lift * 0.25;
    const shadowRadius = radius * (1.0 + 0.10 * arc);
    ctx.arc(curX, shadowY, shadowRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0.18, 0.42 - 0.16 * arc)})`;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = Math.round(6 + lift * 0.45);
    ctx.shadowOffsetY = Math.round(2 + lift * 0.18);
    ctx.fill();
    ctx.restore();

    // 2. Elevated Checker Body
    ctx.save();
    const checkerImgKey = `${color}_${boardTheme}`;
    const checkerImg = images[checkerImgKey] || images[`${color}_classic`];

    if (checkerImg && checkerImg.complete) {
      ctx.drawImage(
        checkerImg,
        curX - currentRadius,
        renderY - currentRadius,
        currentDiameter,
        currentDiameter
      );
    } else {
      ctx.beginPath();
      ctx.arc(curX, renderY, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = color === 'white' ? '#f3f4f6' : '#1f2937';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = color === 'white' ? '#d1d5db' : '#374151';
      ctx.stroke();
    }

    // 3. Dynamic Marble/Wood Specular Glaze Highlight during flight
    if (arc > 0.04) {
      ctx.beginPath();
      ctx.arc(curX, renderY, currentRadius - 1, 0, Math.PI * 2);
      const sheen = ctx.createRadialGradient(
        curX - currentRadius * 0.35,
        renderY - currentRadius * 0.35,
        currentRadius * 0.1,
        curX,
        renderY,
        currentRadius * 0.95
      );
      sheen.addColorStop(0, `rgba(255, 255, 255, ${0.40 * arc})`);
      sheen.addColorStop(0.4, `rgba(255, 255, 255, ${0.12 * arc})`);
      sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = sheen;
      ctx.fill();
    }

    ctx.restore();
  }

  private drawHitBlot(
    ctx: CanvasRenderingContext2D,
    curX: number,
    renderY: number,
    groundY: number,
    radius: number,
    arc: number,
    angle: number,
    color: CheckerColor,
    boardTheme: BoardTheme,
    images: Record<string, HTMLImageElement>
  ): void {
    const scale = 1.0 + 0.15 * arc;
    const currentRadius = radius * scale;
    const currentDiameter = currentRadius * 2;
    const lift = groundY - renderY;

    // Ground Shadow under hit blot
    ctx.save();
    ctx.beginPath();
    ctx.arc(curX, groundY + 3 + lift * 0.2, radius * (0.95 + 0.1 * arc), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(239, 68, 68, ${0.35 * (1 - arc * 0.4)})`;
    ctx.shadowColor = 'rgba(239, 68, 68, 0.4)';
    ctx.shadowBlur = Math.round(8 + lift * 0.4);
    ctx.fill();
    ctx.restore();

    // Tumbling Checker
    ctx.save();
    ctx.translate(curX, renderY);
    ctx.rotate(angle);

    const checkerImgKey = `${color}_${boardTheme}`;
    const checkerImg = images[checkerImgKey] || images[`${color}_classic`];

    if (checkerImg && checkerImg.complete) {
      ctx.drawImage(
        checkerImg,
        -currentRadius,
        -currentRadius,
        currentDiameter,
        currentDiameter
      );
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = color === 'white' ? '#f3f4f6' : '#1f2937';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ef4444';
      ctx.stroke();
    }

    ctx.restore();
  }
}
