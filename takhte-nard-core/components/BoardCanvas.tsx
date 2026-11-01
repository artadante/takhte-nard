/* BoardCanvas.tsx
 * High-performance 2D Canvas board renderer for Traditional Iranian Backgammon:
 * - Authentic 1920 x 1200 aspect ratio (16:10)
 * - Exact 100px base checker diameter at 1920x1200 (scales smoothly with responsive viewport)
 * - 24 points with traditional layout (2, 5, 3, 5)
 * - The Bar (پیشخوان وسط) with interactive re-entry for hit checkers
 * - Full-column generous hit-testing
 * - High-sensitivity magnetic snapping for blue landing circles
 * - 60FPS physics-based 3D checker animations & directional tumbling dice
 * - Interactive Drag-and-Drop & Click-to-Move
 */

import React, { useEffect, useRef, useState } from 'react';
import { BoardLayout } from '../logic/boardLayout';
import { GameSession } from '../logic/gameSession';
import { BoardPoint, BoardSide, BoardTheme, CheckerColor, MoveOption } from '../logic/models';
import { Dice3D } from '../logic/dice3D';
import { CheckerAnimationEngine } from '../logic/checkerAnimation';

export interface BoardCanvasProps {
  session: GameSession;
  boardTheme?: BoardTheme;
  boardSide?: BoardSide;
  onSelectPoint?: (point: BoardPoint | 'bar' | null) => void;
  onBearOff?: () => void;
  selectedPoint?: BoardPoint | 'bar' | null;
  legalMoves?: MoveOption[];
  showCellIndices?: boolean;
  assetsBasePath?: string;
}

interface DestinationTarget {
  to: BoardPoint | null;
  x: number;
  y: number;
  isHit: boolean;
  die: number;
}

export const BoardCanvas: React.FC<BoardCanvasProps> = ({
  session,
  boardTheme = 'classic',
  boardSide = 'right',
  onSelectPoint = p => session.selectPoint(p),
  onBearOff: _onBearOff,
  selectedPoint = session.selectedPoint,
  legalMoves = session.getLegalMoves(),
  showCellIndices: _showCellIndices,
  assetsBasePath = './assets',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rollButtonRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const imagesRef = useRef<Record<string, HTMLImageElement>>({});
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Drag state
  const [dragState, setDragState] = useState<{
    origin: BoardPoint | 'bar';
    color: CheckerColor;
    x: number;
    y: number;
    startX: number;
    startY: number;
  } | null>(null);

  // Preload images
  useEffect(() => {
    const base = assetsBasePath.replace(/\/+$/, '');
    const urls: Record<string, string> = {
      board_classic: `${base}/images/marble_board.png`,
      board_wood: `${base}/images/marble_board.png`,
      board_marble: `${base}/images/marble_board.png`,
      white_classic: `${base}/images/marble_white.png`,
      black_classic: `${base}/images/marble_black.png`,
      white_wood: `${base}/images/marble_white.png`,
      black_wood: `${base}/images/marble_black.png`,
      white_marble: `${base}/images/marble_white.png`,
      black_marble: `${base}/images/marble_black.png`,
      marble_dicecursor: `${base}/images/marble_dicecursor.png`,
    };

    let loadedCount = 0;
    const total = Object.keys(urls).length;

    Object.entries(urls).forEach(([key, src]) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        imagesRef.current[key] = img;
        loadedCount++;
        if (loadedCount >= total) setImagesLoaded(true);
      };
      img.onerror = () => {
        loadedCount++;
        if (loadedCount >= total) setImagesLoaded(true);
      };
    });
  }, [assetsBasePath]);

  // Compute destination targets for an origin
  const getDestinationTargets = (
    origin: BoardPoint | 'bar',
    width: number,
    height: number
  ): DestinationTarget[] => {
    const matchingMoves = legalMoves.filter(m => m.from === origin);
    const targets: DestinationTarget[] = [];
    const seen = new Set<string>();
    const diameter = BoardLayout.checkerDiameter(width, height);

    matchingMoves.forEach(m => {
      const key = m.to === null ? 'bearOff' : String(m.to);
      if (seen.has(key)) return;
      seen.add(key);

      if (m.to !== null) {
        const targetStack = session.board.stackAt(m.to);
        const targetDirection = m.to >= 13 ? 1 : -1;
        const targetPos = BoardLayout.position(m.to, width, height, boardSide);

        let landingIdx = 0;
        if (targetStack && targetStack.color === session.currentPlayer) {
          landingIdx = targetStack.count;
        }

        const landingOffsetY = BoardLayout.stackOffset(landingIdx, diameter, targetDirection);
        targets.push({
          to: m.to,
          x: targetPos.x,
          y: targetPos.y + landingOffsetY,
          isHit: !!m.isHit,
          die: m.die,
        });
      } else {
        const isWhite = session.currentPlayer === 'white';
        const p = BoardLayout.bearOffPosition(
          session.currentPlayer,
          session.board.borneOffCount(session.currentPlayer),
          width,
          height,
          boardSide
        );
        targets.push({
          to: null,
          x: p.x,
          y: isWhite ? height * 0.78 : height * 0.22,
          isHit: false,
          die: m.die,
        });
      }
    });

    return targets;
  };

  // Trajectory arrow drawing
  const drawTrajectoryArrow = (
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    _radius: number,
    isHit: boolean
  ) => {
    ctx.save();

    const dx = toX - fromX;
    const dy = toY - fromY;
    const midX = (fromX + toX) / 2;
    const arcHeight = Math.min(80, Math.max(30, Math.abs(dx) * 0.15));
    const midY = (fromY + toY) / 2 - (dy > 0 ? arcHeight : -arcHeight);

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.quadraticCurveTo(midX, midY, toX, toY);
    ctx.strokeStyle = isHit ? 'rgba(239, 68, 68, 0.75)' : 'rgba(56, 189, 248, 0.75)';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.stroke();

    // Arrowhead
    const angle = Math.atan2(toY - midY, toX - midX);
    const arrowLen = 12;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - arrowLen * Math.cos(angle - Math.PI / 6),
      toY - arrowLen * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - arrowLen * Math.cos(angle + Math.PI / 6),
      toY - arrowLen * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = isHit ? '#ef4444' : '#38bdf8';
    ctx.fill();

    ctx.restore();
  };

  // Landing indicator blue circle
  const drawLandingTarget = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    isHovered: boolean,
    isHit: boolean,
    dieNumber: number
  ) => {
    ctx.save();

    // Outer glow
    ctx.shadowColor = isHit ? '#ef4444' : '#38bdf8';
    ctx.shadowBlur = isHovered ? 18 : 8;

    // Fill
    ctx.beginPath();
    ctx.arc(x, y, radius * (isHovered ? 1.15 : 0.95), 0, Math.PI * 2);
    ctx.fillStyle = isHit
      ? isHovered
        ? 'rgba(239, 68, 68, 0.6)'
        : 'rgba(239, 68, 68, 0.35)'
      : isHovered
      ? 'rgba(56, 189, 248, 0.65)'
      : 'rgba(56, 189, 248, 0.38)';
    ctx.fill();

    // Stroke
    ctx.lineWidth = isHovered ? 3.5 : 2;
    ctx.strokeStyle = isHit ? '#fca5a5' : '#bae6fd';
    ctx.stroke();

    // Die value badge inside target
    ctx.shadowBlur = 0;
    ctx.font = `bold ${Math.round(radius * 0.75)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(dieNumber), x, y);

    ctx.restore();
  };

  // Base disc highlighting selected checker
  const drawOriginBase = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number
  ) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.25, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  };

  // Full-column generous hit-testing
  const getElementAtCoordinates = (clientX: number, clientY: number): BoardPoint | 'bar' | 'bearOff' | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const diameter = BoardLayout.checkerDiameter(width, height);

    // 1. Check Bar in the center (x ~ 0.50 * width)
    const barX = 0.5 * width;
    if (Math.abs(x - barX) < diameter * 0.95) {
      if (session.currentPlayer === 'white' && session.board.whiteBarIds.length > 0) {
        if (y < height * 0.5) return 'bar';
      }
      if (session.currentPlayer === 'black' && session.board.blackBarIds.length > 0) {
        if (y >= height * 0.5) return 'bar';
      }
    }

    // 2. Check 24 Points FIRST
    const colTolerance = diameter * 0.95;

    // Top half columns (13..24)
    if (y < height * 0.50) {
      let closestPt: BoardPoint | null = null;
      let minDx = colTolerance;
      for (let raw = 13; raw <= 24; raw++) {
        const pos = BoardLayout.position(raw, width, height, boardSide);
        const dx = Math.abs(x - pos.x);
        if (dx < minDx) {
          minDx = dx;
          closestPt = raw;
        }
      }
      if (closestPt !== null) return closestPt;
    }

    // Bottom half columns (1..12)
    if (y >= height * 0.50) {
      let closestPt: BoardPoint | null = null;
      let minDx = colTolerance;
      for (let raw = 1; raw <= 12; raw++) {
        const pos = BoardLayout.position(raw, width, height, boardSide);
        const dx = Math.abs(x - pos.x);
        if (dx < minDx) {
          minDx = dx;
          closestPt = raw;
        }
      }
      if (closestPt !== null) return closestPt;
    }

    // 3. Check Bear-off tray only on far right tray edge
    if (x >= 0.915 * width) {
      return 'bearOff';
    }

    return null;
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // 1. Board background
    const bgKey = `board_${boardTheme}`;
    const bgImg = imagesRef.current[bgKey] || imagesRef.current['board_classic'];
    if (bgImg && bgImg.complete) {
      ctx.drawImage(bgImg, 0, 0, width, height);
    } else {
      ctx.fillStyle = '#261b14';
      ctx.fillRect(0, 0, width, height);
    }

    const diameter = BoardLayout.checkerDiameter(width, height);
    const radius = diameter / 2;

    const activeOrigin = dragState ? dragState.origin : selectedPoint;

    // 2. Draw Checkers on 24 Points
    const board = session.board;
    for (let raw = 1; raw <= 24; raw++) {
      const stack = board.stackAt(raw);
      if (!stack || stack.count === 0) continue;

      const pos = BoardLayout.position(raw, width, height, boardSide);
      const direction = raw >= 13 ? 1 : -1;
      const count = stack.count;

      const checkerImgKey = `${stack.color}_${boardTheme}`;
      const checkerImg = imagesRef.current[checkerImgKey] || imagesRef.current[`${stack.color}_classic`];

      const isAnimTarget = CheckerAnimationEngine.shared().isTargetPoint(raw);
      const animSlot = CheckerAnimationEngine.shared().getTargetSlot(raw);

      for (let idx = 0; idx < count; idx++) {
        if (dragState && dragState.origin === raw && idx === count - 1) {
          continue; // Skip dragged checker
        }
        if (isAnimTarget && idx === animSlot) {
          continue; // Skip checker currently animating in flight to this slot
        }

        const offsetY = BoardLayout.stackOffset(idx, diameter, direction);
        const cx = pos.x;
        const cy = pos.y + offsetY;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy + 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fill();

        if (checkerImg && checkerImg.complete) {
          ctx.drawImage(checkerImg, cx - radius, cy - radius, diameter, diameter);
        } else {
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = stack.color === 'white' ? '#f3f4f6' : '#1f2937';
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = stack.color === 'white' ? '#d1d5db' : '#374151';
          ctx.stroke();
        }
        ctx.restore();
      }

      // Stack count number if > 5
      if (count > 5) {
        const topOffsetY = BoardLayout.stackOffset(count - 1, diameter, direction);
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(pos.x, pos.y + topOffsetY, radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f8fafc';
        ctx.font = `bold ${Math.round(radius * 0.6)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(count), pos.x, pos.y + topOffsetY);
        ctx.restore();
      }
    }

    // 4. Draw Checkers on THE BAR (پیشخوان وسط)
    const drawBarCheckers = (color: CheckerColor, count: number) => {
      const checkerImgKey = `${color}_${boardTheme}`;
      const checkerImg = imagesRef.current[checkerImgKey] || imagesRef.current[`${color}_classic`];

      const isHitBarAnim = CheckerAnimationEngine.shared().isHitBarTarget(color);
      const hitBarSlot = CheckerAnimationEngine.shared().getHitBarSlot(color);

      for (let i = 0; i < count; i++) {
        if (dragState && dragState.origin === 'bar' && dragState.color === color && i === count - 1) {
          continue;
        }
        if (isHitBarAnim && i === hitBarSlot) {
          continue; // Skip hit checker currently flying to the bar
        }

        const p = BoardLayout.barPosition(color, i, width, height);
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y + 3, radius * 1.05, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fill();

        if (checkerImg && checkerImg.complete) {
          ctx.drawImage(checkerImg, p.x - radius, p.y - radius, diameter, diameter);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fillStyle = color === 'white' ? '#f3f4f6' : '#1f2937';
          ctx.fill();
        }
        ctx.restore();
      }
    };

    drawBarCheckers('white', board.whiteBarIds.length);
    drawBarCheckers('black', board.blackBarIds.length);

    // 5. Draw Borne-off checkers in trays
    (['white', 'black'] as CheckerColor[]).forEach(color => {
      const count = board.borneOffCount(color);
      const checkerImgKey = `${color}_${boardTheme}`;
      const checkerImg = imagesRef.current[checkerImgKey] || imagesRef.current[`${color}_classic`];

      const isBearOffAnim = CheckerAnimationEngine.shared().isBearOffTarget(color);
      const bearOffSlot = CheckerAnimationEngine.shared().getBearOffSlot(color);

      for (let i = 0; i < count; i++) {
        if (isBearOffAnim && i === bearOffSlot) {
          continue; // Skip borne-off checker currently flying to tray
        }

        const p = BoardLayout.bearOffPosition(color, i, width, height, boardSide);
        ctx.save();
        ctx.beginPath();
        ctx.arc(p.x, p.y + 1, radius * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fill();

        if (checkerImg && checkerImg.complete) {
          ctx.drawImage(
            checkerImg,
            p.x - radius * 0.85,
            p.y - radius * 0.85,
            diameter * 0.85,
            diameter * 0.85
          );
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius * 0.85, 0, Math.PI * 2);
          ctx.fillStyle = color === 'white' ? '#f3f4f6' : '#1f2937';
          ctx.fill();
        }
        ctx.restore();
      }
    });

    // 5.5 Render Active Flying Checkers & Hit Blots (60FPS Physics Engine)
    CheckerAnimationEngine.shared().render(
      ctx,
      width,
      height,
      imagesRef.current,
      boardTheme,
      boardSide
    );

    // 6. DRAW ARROWS & BLUE CIRCLES FOR DESTINATIONS
    if (activeOrigin !== null) {
      let originX = 0;
      let originY = 0;

      if (activeOrigin === 'bar') {
        const p = BoardLayout.barPosition(session.currentPlayer, 0, width, height);
        originX = p.x;
        originY = p.y;
      } else {
        const stack = board.stackAt(activeOrigin);
        const count = stack ? stack.count : 1;
        const pos = BoardLayout.position(activeOrigin, width, height, boardSide);
        const direction = activeOrigin >= 13 ? 1 : -1;
        const topOffsetY = BoardLayout.stackOffset(count - 1, diameter, direction);
        originX = pos.x;
        originY = pos.y + topOffsetY;
      }

      // Draw light blue base disc under origin
      drawOriginBase(ctx, originX, originY, radius);

      // Get destination targets
      const destinationTargets = getDestinationTargets(activeOrigin, width, height);

      // High-sensitivity magnetic hover detection
      let hoveredTarget: DestinationTarget | null = null;
      if (dragState) {
        let minDist = Infinity;
        destinationTargets.forEach(t => {
          const d = Math.hypot(dragState.x - t.x, dragState.y - t.y);
          const dx = Math.abs(dragState.x - t.x);
          const isSameHalf =
            (dragState.y < height * 0.5 && t.y < height * 0.5) ||
            (dragState.y >= height * 0.5 && t.y >= height * 0.5);

          if (d < diameter * 3.5 || (dx < diameter * 1.8 && isSameHalf)) {
            if (d < minDist) {
              minDist = d;
              hoveredTarget = t;
            }
          }
        });

        // Fallback: column hit
        if (!hoveredTarget) {
          const dropCol = getElementAtCoordinates(
            canvas.getBoundingClientRect().left + dragState.x,
            canvas.getBoundingClientRect().top + dragState.y
          );
          if (dropCol === 'bearOff') {
            hoveredTarget = destinationTargets.find(t => t.to === null) || null;
          } else if (typeof dropCol === 'number') {
            hoveredTarget = destinationTargets.find(t => t.to === dropCol) || null;
          }
        }
      }

      // Draw arrows and targets
      destinationTargets.forEach(t => {
        const isHovered = hoveredTarget === t;

        // Trajectory arrow
        drawTrajectoryArrow(ctx, originX, originY, t.x, t.y, radius, t.isHit);

        // Landing blue/red circle with die value
        drawLandingTarget(ctx, t.x, t.y, radius, isHovered, t.isHit, t.die);
      });
    }

    // 7. DRAW DRAGGED CHECKER UNDER POINTER
    if (dragState) {
      const checkerImgKey = `${dragState.color}_${boardTheme}`;
      const checkerImg = imagesRef.current[checkerImgKey] || imagesRef.current[`${dragState.color}_classic`];

      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 8;

      if (checkerImg && checkerImg.complete) {
        ctx.drawImage(
          checkerImg,
          dragState.x - radius * 1.15,
          dragState.y - radius * 1.15,
          diameter * 1.15,
          diameter * 1.15
        );
      } else {
        ctx.beginPath();
        ctx.arc(dragState.x, dragState.y, radius * 1.15, 0, Math.PI * 2);
        ctx.fillStyle = dragState.color === 'white' ? '#ffffff' : '#111827';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#38bdf8';
        ctx.stroke();
      }

      ctx.restore();
    }

    // 8. RENDER 3D TUMBLING & LANDED DICE IN THE MIDDLE OF THE BOARD
    if (session.boardDiceState) {
      Dice3D.renderBoardDice(
        ctx,
        session.boardDiceState,
        width,
        height,
        session.remainingDice,
        session.currentPlayer === 'white'
      );
    }

    // 9. RENDER "تاس بریزید" BUTTON ON BOARD IF HUMAN CAN ROLL
    const canRoll =
      !session.isRollOffActive &&
      session.currentPlayer === 'white' &&
      session.remainingDice.length === 0 &&
      !session.isGameOver &&
      !session.isRolling &&
      !session.isAiMoving;

    if (canRoll) {
      rollButtonRectRef.current = Dice3D.drawRollButton(
        ctx,
        width,
        height,
        imagesRef.current['marble_dicecursor']
      );
    } else {
      rollButtonRectRef.current = null;
    }

    ctx.restore();
  };

  const handleResize = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const containerWidth = rect.width > 0 ? rect.width : window.innerWidth * 0.8;
    const containerHeight = rect.height > 0 ? rect.height : window.innerHeight * 0.85;

    const TARGET_RATIO = BoardLayout.ASPECT_RATIO; // 1920 / 1200 = 1.6

    let renderWidth = containerWidth;
    let renderHeight = renderWidth / TARGET_RATIO;

    if (renderHeight > containerHeight) {
      renderHeight = containerHeight;
      renderWidth = renderHeight * TARGET_RATIO;
    }

    renderWidth = Math.floor(renderWidth);
    renderHeight = Math.floor(renderHeight);

    const dpr = window.devicePixelRatio || 1;

    canvas.width = renderWidth * dpr;
    canvas.height = renderHeight * dpr;
    canvas.style.width = `${renderWidth}px`;
    canvas.style.height = `${renderHeight}px`;

    draw();
  };

  useEffect(() => {
    handleResize();
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      handleResize();
    });
    observer.observe(container);

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [imagesLoaded, boardTheme, boardSide]);

  // 60FPS continuous animation loop
  useEffect(() => {
    let animId: number;
    const loop = () => {
      draw();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [session, selectedPoint, legalMoves, dragState, imagesLoaded]);

  // Pointer interactions
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (session.isAiMoving || session.isAnimatingMove) return;
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    // Check if clicked on Roll Dice button on the board
    const canRoll =
      !session.isRollOffActive &&
      session.currentPlayer === 'white' &&
      session.remainingDice.length === 0 &&
      !session.isGameOver &&
      !session.isRolling &&
      !session.isAiMoving;

    if (canRoll) {
      if (rollButtonRectRef.current) {
        const btn = rollButtonRectRef.current;
        if (
          clickX >= btn.x - 20 &&
          clickX <= btn.x + btn.width + 20 &&
          clickY >= btn.y - 20 &&
          clickY <= btn.y + btn.height + 20
        ) {
          session.rollDice();
          return;
        }
      }
      // Also allow tapping anywhere in the center-right quadrant to roll
      if (
        clickX >= canvas.width * 0.52 &&
        clickX <= canvas.width * 0.85 &&
        Math.abs(clickY - canvas.height * 0.5) < canvas.height * 0.20
      ) {
        session.rollDice();
        return;
      }
    }

    const target = getElementAtCoordinates(e.clientX, e.clientY);

    if (target === 'bar') {
      const barCount = session.board.barCount(session.currentPlayer);
      if (barCount > 0) {
        onSelectPoint('bar');
        setDragState({
          origin: 'bar',
          color: session.currentPlayer,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          startX: e.clientX - rect.left,
          startY: e.clientY - rect.top,
        });
        canvas.setPointerCapture(e.pointerId);
      }
      return;
    }

    if (typeof target === 'number') {
      const stack = session.board.stackAt(target);
      if (stack && stack.color === session.currentPlayer && stack.count > 0) {
        onSelectPoint(target);
        setDragState({
          origin: target,
          color: session.currentPlayer,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          startX: e.clientX - rect.left,
          startY: e.clientY - rect.top,
        });
        canvas.setPointerCapture(e.pointerId);
      } else if (selectedPoint !== null) {
        // Click-to-move attempt
        const move = legalMoves.find(m => m.from === selectedPoint && m.to === target);
        if (move) {
          session.executeMove(move);
          onSelectPoint(null);
        } else {
          onSelectPoint(null);
        }
      }
      return;
    }

    if (target === 'bearOff' && selectedPoint !== null) {
      const move = legalMoves.find(m => m.from === selectedPoint && m.to === null);
      if (move) {
        session.executeMove(move);
        onSelectPoint(null);
      }
      return;
    }

    // Clicked empty spot: deselect
    if (selectedPoint !== null) {
      onSelectPoint(null);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragState || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setDragState(prev => (prev ? { ...prev, x, y } : null));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragState || !canvasRef.current) return;

    try {
      canvasRef.current.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const diameter = BoardLayout.checkerDiameter(width, height);

    const destinationTargets = getDestinationTargets(dragState.origin, width, height);

    let chosenTarget: DestinationTarget | null = null;
    let minDist = Infinity;

    // 1. Check Magnetic Snap targets
    destinationTargets.forEach(t => {
      const d = Math.hypot(dragState.x - t.x, dragState.y - t.y);
      const dx = Math.abs(dragState.x - t.x);
      const isSameHalf =
        (dragState.y < height * 0.5 && t.y < height * 0.5) ||
        (dragState.y >= height * 0.5 && t.y >= height * 0.5);

      if (d < diameter * 3.5 || (dx < diameter * 1.8 && isSameHalf)) {
        if (d < minDist) {
          minDist = d;
          chosenTarget = t;
        }
      }
    });

    // 2. Check column drop fallback
    if (!chosenTarget) {
      const dropCol = getElementAtCoordinates(e.clientX, e.clientY);
      if (dropCol === 'bearOff') {
        chosenTarget = destinationTargets.find(t => t.to === null) || null;
      } else if (typeof dropCol === 'number') {
        chosenTarget = destinationTargets.find(t => t.to === dropCol) || null;
      }
    }

    // 3. Apply move if valid
    if (chosenTarget) {
      const move = legalMoves.find(
        m => m.from === dragState.origin && m.to === chosenTarget!.to
      );
      if (move) {
        session.executeMove(move, { x: dragState.x, y: dragState.y });
        onSelectPoint(null);
      }
    } else {
      // Invalid drop: smooth snap back to origin stack
      let stackIndex = 0;
      if (dragState.origin === 'bar') {
        stackIndex = Math.max(0, session.board.barCount(dragState.color) - 1);
      } else {
        stackIndex = Math.max(0, (session.board.stackAt(dragState.origin)?.count || 1) - 1);
      }
      CheckerAnimationEngine.shared().startSnapBack({
        origin: dragState.origin,
        color: dragState.color,
        stackIndex,
        fromPos: { x: dragState.x, y: dragState.y },
        duration: 160,
      });
    }

    setDragState(null);
  };

  const handlePointerCancel = () => {
    setDragState(null);
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full flex items-center justify-center relative touch-none overflow-hidden select-none"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        className="cursor-pointer max-w-full max-h-full rounded-2xl shadow-2xl drop-shadow-2xl border border-stone-800/60"
        style={{
          aspectRatio: '1920 / 1200',
        }}
      />
    </div>
  );
};
