export type GoalIconId =
  | 'bone'
  | 'bonePile'
  | 'trophy'
  | 'crown'
  | 'vault'
  | 'magicBone'
  | 'arcaneStar'
  | 'pawPack'
  | 'shinyPup'
  | 'shinyPack'
  | 'starMedal'
  | 'ribbonMedal'
  | 'centurionCrest'
  | 'legendShield'
  | 'komondor'
  | 'heart'
  | 'tennisBall'
  | 'freshToy'
  | 'treat'
  | 'happyMood'
  | 'ecstaticMood'
  | 'flowerPatch'
  | 'parkTree'
  | 'dogSlide'
  | 'gardenArch'
  | 'parkMap'
  | 'manor'
  | 'sanctuary'
  | 'relicUrn'
  | 'relicGem'
  | 'relicScroll'
  | 'diamondBowl'
  | 'relicFlame'
  | 'clock'
  | 'shovel'
  | 'grassTap'
  | 'whistle'
  | 'giftChest'
  | 'calendar'
  | 'dice'
  | 'paintBrush'
  | 'level500Crest'
  | 'level1000Crest';

import { HUD_BONE_PRESETS, drawHudStyleBone, uiIconHtml } from './uiIcons';

const INK = '#261738';
const ICON_CACHE = new Map<GoalIconId, string>();

export const MAGIC_SPARK_INLINE_SVG = uiIconHtml('magicBone', 'goal-magic-svg');

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color = '#fff8c9',
  alpha = 1
): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawAura(ctx: CanvasRenderingContext2D, inner: string, outer: string): void {
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 28);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();
}

function drawPawPrint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  fill: string,
  stroke: string | null = INK
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = fill;
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2.2;
  }
  ctx.beginPath();
  ctx.moveTo(0, -1.5);
  ctx.bezierCurveTo(9, -1.5, 11.5, 9, 7, 11.5);
  ctx.bezierCurveTo(3.5, 13.2, 1.8, 11, 0, 11);
  ctx.bezierCurveTo(-1.8, 11, -3.5, 13.2, -7, 11.5);
  ctx.bezierCurveTo(-11.5, 9, -9, -1.5, 0, -1.5);
  ctx.closePath();
  ctx.fill();
  if (stroke) ctx.stroke();

  const toes: Array<[number, number, number, number, number]> = [
    [-10.2, -5.2, 3.2, 4.4, -0.34],
    [-3.7, -10.2, 3.4, 4.7, -0.12],
    [3.7, -10.2, 3.4, 4.7, 0.12],
    [10.2, -5.2, 3.2, 4.4, 0.34]
  ];
  for (const [tx, ty, rx, ry, rot] of toes) {
    ctx.beginPath();
    ctx.ellipse(tx, ty, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
    if (stroke) ctx.stroke();
  }
  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.lineTo(x + w - rad, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rad);
  ctx.lineTo(x + w, y + h - rad);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  ctx.lineTo(x + rad, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rad);
  ctx.lineTo(x, y + rad);
  ctx.quadraticCurveTo(x, y, x + rad, y);
  ctx.closePath();
}

function drawGoalIconArt(ctx: CanvasRenderingContext2D, id: GoalIconId): void {
  ctx.clearRect(0, 0, 64, 64);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (id) {
    case 'bone': {
      drawAura(ctx, 'rgba(255, 241, 198, 0.32)', 'rgba(255, 241, 198, 0)');
      drawHudStyleBone(ctx, { x: 32, y: 33, width: 42, rot: -0.48, ...HUD_BONE_PRESETS.regular });
      drawSparkle(ctx, 47, 17, 4.8, '#fff7cc', 0.9);
      break;
    }

    case 'bonePile': {
      drawAura(ctx, 'rgba(255, 224, 130, 0.34)', 'rgba(255, 224, 130, 0)');
      drawHudStyleBone(ctx, { x: 32, y: 36, width: 38, rot: 0.48, ...HUD_BONE_PRESETS.magic });
      drawHudStyleBone(ctx, { x: 32, y: 31, width: 40, rot: -0.48, ...HUD_BONE_PRESETS.regular });
      drawSparkle(ctx, 16, 17, 4.5, '#ffeaa7', 0.95);
      drawSparkle(ctx, 49, 44, 3.8, '#ffffff', 0.85);
      break;
    }

    case 'trophy': {
      drawAura(ctx, 'rgba(255, 214, 92, 0.36)', 'rgba(255, 214, 92, 0)');
      // Handles
      ctx.strokeStyle = '#d98c1a';
      ctx.lineWidth = 4.6;
      ctx.beginPath();
      ctx.arc(17, 25, 6.5, Math.PI * 0.55, Math.PI * 1.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(47, 25, 6.5, -Math.PI * 0.55, Math.PI * 0.45);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(17, 25, 6.5, Math.PI * 0.55, Math.PI * 1.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(47, 25, 6.5, -Math.PI * 0.55, Math.PI * 0.45);
      ctx.stroke();

      // Stem & base
      const baseGrad = ctx.createLinearGradient(20, 40, 44, 54);
      baseGrad.addColorStop(0, '#ffe382');
      baseGrad.addColorStop(1, '#c97a16');
      ctx.fillStyle = baseGrad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.rect(28.5, 38, 7, 9);
      ctx.fill();
      ctx.stroke();
      drawRoundedRect(ctx, 19, 46, 26, 7, 3);
      ctx.fill();
      ctx.stroke();

      // Cup body
      const cupGrad = ctx.createLinearGradient(18, 13, 46, 39);
      cupGrad.addColorStop(0, '#fff4b5');
      cupGrad.addColorStop(0.45, '#ffd052');
      cupGrad.addColorStop(1, '#d68216');
      ctx.fillStyle = cupGrad;
      ctx.beginPath();
      ctx.moveTo(18, 15);
      ctx.lineTo(46, 15);
      ctx.quadraticCurveTo(45, 37, 32, 39.5);
      ctx.quadraticCurveTo(19, 37, 18, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawPawPrint(ctx, 32, 26.5, 0.44, '#fff9d6', '#7c430c');
      drawSparkle(ctx, 48, 14, 4.6, '#fff8c9', 0.95);
      break;
    }

    case 'crown': {
      drawAura(ctx, 'rgba(255, 212, 90, 0.4)', 'rgba(255, 212, 90, 0)');
      const grad = ctx.createLinearGradient(12, 16, 52, 48);
      grad.addColorStop(0, '#fff4b0');
      grad.addColorStop(0.5, '#ffca44');
      grad.addColorStop(1, '#cc7712');
      ctx.fillStyle = grad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(12, 44);
      ctx.lineTo(10, 22);
      ctx.lineTo(22, 31);
      ctx.lineTo(32, 16);
      ctx.lineTo(42, 31);
      ctx.lineTo(54, 22);
      ctx.lineTo(52, 44);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Velvet band
      ctx.fillStyle = '#9b30ff';
      drawRoundedRect(ctx, 13, 40, 38, 7, 3);
      ctx.fill();
      ctx.stroke();

      // Gems
      const gems: Array<[number, number, string]> = [
        [22, 43.5, '#55efc4'],
        [32, 43.5, '#ff7675'],
        [42, 43.5, '#74b9ff']
      ];
      for (const [gx, gy, col] of gems) {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(gx, gy, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      drawSparkle(ctx, 32, 13, 4.5, '#fff8c9', 0.95);
      break;
    }

    case 'vault': {
      drawAura(ctx, 'rgba(255, 218, 108, 0.38)', 'rgba(255, 218, 108, 0)');
      // Overflowing HUD bones in lid
      drawHudStyleBone(ctx, { x: 24, y: 24, width: 25, rot: -0.35, ...HUD_BONE_PRESETS.regular });
      drawHudStyleBone(ctx, { x: 40, y: 24, width: 25, rot: 0.38, ...HUD_BONE_PRESETS.magic });
      // Chest base
      const wood = ctx.createLinearGradient(12, 28, 52, 52);
      wood.addColorStop(0, '#a86432');
      wood.addColorStop(1, '#633417');
      ctx.fillStyle = wood;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      drawRoundedRect(ctx, 12, 29, 40, 22, 5);
      ctx.fill();
      ctx.stroke();

      // Gold trim bands
      ctx.fillStyle = '#ffd159';
      ctx.fillRect(19, 30, 5, 20);
      ctx.fillRect(40, 30, 5, 20);
      drawRoundedRect(ctx, 11, 26, 42, 6, 3);
      ctx.fill();
      ctx.stroke();
      // Center lock
      drawRoundedRect(ctx, 27.5, 34, 9, 10, 2.5);
      ctx.fill();
      ctx.stroke();
      drawSparkle(ctx, 32, 15, 5, '#ffeaa7', 0.95);
      break;
    }

    case 'magicBone': {
      drawAura(ctx, 'rgba(255, 225, 115, 0.44)', 'rgba(155, 89, 246, 0)');
      drawHudStyleBone(ctx, { x: 32, y: 33, width: 42, rot: -0.48, ...HUD_BONE_PRESETS.magic });
      drawSparkle(ctx, 16, 18, 5.5, '#ffffff', 0.95);
      drawSparkle(ctx, 48, 45, 5.0, '#ffeaa7', 0.95);
      drawSparkle(ctx, 49, 18, 3.6, '#b8f7ff', 0.9);
      break;
    }

    case 'arcaneStar': {
      drawAura(ctx, 'rgba(182, 130, 255, 0.44)', 'rgba(108, 92, 231, 0)');
      const grad = ctx.createLinearGradient(14, 12, 50, 52);
      grad.addColorStop(0, '#fff9c4');
      grad.addColorStop(0.45, '#d6a2ff');
      grad.addColorStop(1, '#6c5ce7');
      ctx.fillStyle = grad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const ang = (i * Math.PI) / 4 - Math.PI / 2;
        const r = i % 2 === 0 ? 22 : 9.5;
        const px = 32 + Math.cos(ang) * r;
        const py = 32 + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawSparkle(ctx, 32, 32, 7.5, '#ffffff', 0.95);
      drawSparkle(ctx, 14, 16, 4.2, '#ffeaa7', 0.9);
      break;
    }

    case 'pawPack': {
      drawAura(ctx, 'rgba(162, 155, 254, 0.34)', 'rgba(162, 155, 254, 0)');
      drawPawPrint(ctx, 22, 38, 0.85, '#c8a2ff');
      drawPawPrint(ctx, 42, 38, 0.85, '#74f0cb');
      drawPawPrint(ctx, 32, 24, 1.05, '#ffeaa7');
      break;
    }

    case 'shinyPup': {
      drawAura(ctx, 'rgba(255, 234, 140, 0.44)', 'rgba(255, 180, 235, 0)');
      // Cute rounded pup head with floppy ears & shiny glow
      const coat = ctx.createLinearGradient(18, 16, 46, 50);
      coat.addColorStop(0, '#fff4c2');
      coat.addColorStop(0.55, '#ffd470');
      coat.addColorStop(1, '#f39c4b');
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      // Floppy ears
      ctx.fillStyle = '#e6943c';
      ctx.beginPath();
      ctx.ellipse(17, 32, 6, 11, 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(47, 32, 6, 11, -0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Face
      ctx.fillStyle = coat;
      ctx.beginPath();
      ctx.arc(32, 33, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Snout
      ctx.fillStyle = '#fff9e6';
      ctx.beginPath();
      ctx.ellipse(32, 38, 7.5, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Eyes & nose
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(26.5, 31, 2.2, 0, Math.PI * 2);
      ctx.arc(37.5, 31, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(32, 36.2, 3.2, 2.1, 0, 0, Math.PI * 2);
      ctx.fill();
      drawSparkle(ctx, 14, 16, 5.5, '#fff9c4', 0.98);
      drawSparkle(ctx, 50, 18, 4.8, '#ffffff', 0.95);
      drawSparkle(ctx, 48, 46, 4.0, '#ffb8ec', 0.9);
      break;
    }

    case 'shinyPack': {
      drawAura(ctx, 'rgba(255, 178, 232, 0.4)', 'rgba(138, 224, 255, 0)');
      // Three luminous rainbow-gold stars + paw emblem
      const colors = ['#ffb8ec', '#ffeaa7', '#8eeaff'];
      const pts: Array<[number, number, number]> = [
        [19, 36, 10],
        [45, 36, 10],
        [32, 23, 12.5]
      ];
      pts.forEach(([px, py, r], i) => {
        ctx.fillStyle = colors[i];
        ctx.strokeStyle = INK;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        drawPawPrint(ctx, px, py + 0.5, r * 0.044, '#ffffff', null);
      });
      drawSparkle(ctx, 14, 15, 5.2, '#fff9c4', 0.98);
      drawSparkle(ctx, 51, 16, 4.8, '#ffffff', 0.95);
      drawSparkle(ctx, 32, 50, 4.5, '#8eeaff', 0.92);
      break;
    }

    case 'starMedal': {
      drawAura(ctx, 'rgba(255, 220, 100, 0.34)', 'rgba(255, 220, 100, 0)');
      // Ribbon top
      ctx.fillStyle = '#6c5ce7';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(22, 10);
      ctx.lineTo(42, 10);
      ctx.lineTo(38, 25);
      ctx.lineTo(26, 25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gold disc
      const g = ctx.createLinearGradient(16, 20, 48, 52);
      g.addColorStop(0, '#fff3b0');
      g.addColorStop(0.5, '#ffca44');
      g.addColorStop(1, '#d37e14');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(32, 37, 15.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Star inside
      ctx.fillStyle = '#fff9d6';
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? 8.5 : 4;
        const sx = 32 + Math.cos(ang) * r;
        const sy = 37 + Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'ribbonMedal': {
      drawAura(ctx, 'rgba(85, 239, 196, 0.34)', 'rgba(85, 239, 196, 0)');
      // Ribbon tails
      ctx.fillStyle = '#00b894';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.moveTo(23, 36);
      ctx.lineTo(17, 54);
      ctx.lineTo(25, 50);
      ctx.lineTo(30, 54);
      ctx.lineTo(30, 36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(41, 36);
      ctx.lineTo(47, 54);
      ctx.lineTo(39, 50);
      ctx.lineTo(34, 54);
      ctx.lineTo(34, 36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Rosette
      const g = ctx.createRadialGradient(29, 24, 3, 32, 28, 17);
      g.addColorStop(0, '#fff5b8');
      g.addColorStop(0.6, '#ffbe3d');
      g.addColorStop(1, '#d37610');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(32, 27, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawPawPrint(ctx, 32, 27.5, 0.56, '#fffdf0', '#7c430c');
      break;
    }

    case 'centurionCrest': {
      drawAura(ctx, 'rgba(255, 215, 92, 0.42)', 'rgba(255, 215, 92, 0)');
      // Laurel wreath arc
      ctx.strokeStyle = '#55efc4';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(32, 32, 22, Math.PI * 0.65, Math.PI * 1.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(32, 32, 22, -Math.PI * 0.25, Math.PI * 0.35);
      ctx.stroke();

      // Shield
      const g = ctx.createLinearGradient(18, 12, 46, 52);
      g.addColorStop(0, '#fff6be');
      g.addColorStop(0.5, '#ffca42');
      g.addColorStop(1, '#c96f10');
      ctx.fillStyle = g;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(18, 16);
      ctx.lineTo(46, 16);
      ctx.lineTo(46, 34);
      ctx.quadraticCurveTo(46, 46, 32, 52);
      ctx.quadraticCurveTo(18, 46, 18, 34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#261738';
      ctx.font = '900 12px "Outfit", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('100', 32, 33);
      drawSparkle(ctx, 32, 11, 4.5, '#fff9c4', 0.95);
      break;
    }

    case 'legendShield': {
      drawAura(ctx, 'rgba(162, 155, 254, 0.42)', 'rgba(108, 92, 231, 0)');
      const g = ctx.createLinearGradient(16, 12, 48, 52);
      g.addColorStop(0, '#a29bfe');
      g.addColorStop(0.5, '#6c5ce7');
      g.addColorStop(1, '#3c2a99');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#ffd159';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(16, 16);
      ctx.lineTo(32, 11);
      ctx.lineTo(48, 16);
      ctx.lineTo(46, 36);
      ctx.quadraticCurveTo(44, 47, 32, 53);
      ctx.quadraticCurveTo(20, 47, 18, 36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.stroke();
      drawPawPrint(ctx, 32, 32, 0.68, '#ffeaa7', INK);
      break;
    }

    case 'komondor': {
      drawAura(ctx, 'rgba(255, 245, 210, 0.4)', 'rgba(255, 224, 130, 0)');
      // Iconic ivory corded coat silhouette + tiny gold crown
      ctx.fillStyle = '#f6f2e7';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.1;
      const cords: Array<[number, number, number, number]> = [
        [17, 37, 4.2, 11],
        [23, 39, 4.2, 12],
        [32, 40, 4.6, 12],
        [41, 39, 4.2, 12],
        [47, 37, 4.2, 11]
      ];
      for (const [cx, cy, rx, ry] of cords) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      // Fluffy corded head top
      ctx.fillStyle = '#fffdf8';
      ctx.beginPath();
      ctx.arc(32, 30, 14.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Cord tufts across brow
      ctx.strokeStyle = '#cfc5b0';
      ctx.lineWidth = 2;
      for (let x = 22; x <= 42; x += 5) {
        ctx.beginPath();
        ctx.moveTo(x, 22);
        ctx.lineTo(x, 34);
        ctx.stroke();
      }
      // Little black nose peeking out
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(32, 36.5, 3.8, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Miniature gold crown on top
      ctx.fillStyle = '#ffd04d';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(23, 18);
      ctx.lineTo(22, 10);
      ctx.lineTo(28, 14);
      ctx.lineTo(32, 8);
      ctx.lineTo(36, 14);
      ctx.lineTo(42, 10);
      ctx.lineTo(41, 18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawSparkle(ctx, 49, 16, 4.2, '#ffeaa7', 0.95);
      break;
    }

    case 'heart': {
      drawAura(ctx, 'rgba(255, 120, 165, 0.36)', 'rgba(255, 120, 165, 0)');
      const g = ctx.createLinearGradient(16, 14, 48, 52);
      g.addColorStop(0, '#ff9ec7');
      g.addColorStop(0.45, '#ff5e8a');
      g.addColorStop(1, '#c92a5b');
      ctx.fillStyle = g;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(32, 50);
      ctx.bezierCurveTo(10, 36, 10, 17, 22, 16);
      ctx.bezierCurveTo(28, 15.5, 31, 20, 32, 23);
      ctx.bezierCurveTo(33, 20, 36, 15.5, 42, 16);
      ctx.bezierCurveTo(54, 17, 54, 36, 32, 50);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Glossy specular dot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.62)';
      ctx.beginPath();
      ctx.ellipse(22.5, 23, 3.2, 5.2, -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'tennisBall': {
      drawAura(ctx, 'rgba(195, 255, 70, 0.32)', 'rgba(195, 255, 70, 0)');
      const g = ctx.createRadialGradient(25, 24, 3, 32, 32, 19);
      g.addColorStop(0, '#e8ff6b');
      g.addColorStop(0.55, '#b8f014');
      g.addColorStop(1, '#78a800');
      ctx.fillStyle = g;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.arc(32, 32, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(17, 32, 12, -0.82, 0.82);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(47, 32, 12, Math.PI - 0.82, Math.PI + 0.82);
      ctx.stroke();
      break;
    }

    case 'freshToy': {
      drawAura(ctx, 'rgba(255, 230, 100, 0.42)', 'rgba(155, 255, 110, 0)');
      const g = ctx.createRadialGradient(25, 25, 3, 32, 33, 17);
      g.addColorStop(0, '#f4ff7a');
      g.addColorStop(0.6, '#c8ff24');
      g.addColorStop(1, '#7eb000');
      ctx.fillStyle = g;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(30, 34, 15.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(17, 34, 10, -0.78, 0.78);
      ctx.stroke();
      // Fresh Toy golden bolt & sparkles
      ctx.fillStyle = '#ffe066';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(45, 11);
      ctx.lineTo(36, 26);
      ctx.lineTo(43, 26);
      ctx.lineTo(38, 39);
      ctx.lineTo(52, 22);
      ctx.lineTo(44.5, 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawSparkle(ctx, 16, 16, 5.2, '#fff9c4', 0.95);
      break;
    }

    case 'treat': {
      drawAura(ctx, 'rgba(255, 195, 120, 0.34)', 'rgba(255, 195, 120, 0)');
      // Baked golden HUD-style dog biscuit
      drawHudStyleBone(ctx, { x: 32, y: 33, width: 44, rot: -0.32, ...HUD_BONE_PRESETS.biscuit });
      // Baked speckle crumbs
      ctx.fillStyle = '#7c3e10';
      const dots: Array<[number, number]> = [
        [27, 32],
        [33, 35],
        [37, 30]
      ];
      for (const [dx, dy] of dots) {
        ctx.beginPath();
        ctx.arc(dx, dy, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
      drawSparkle(ctx, 47, 17, 4.4, '#ffeaa7', 0.9);
      break;
    }

    case 'happyMood': {
      drawAura(ctx, 'rgba(85, 239, 196, 0.36)', 'rgba(85, 239, 196, 0)');
      const g = ctx.createLinearGradient(16, 14, 48, 50);
      g.addColorStop(0, '#fff29c');
      g.addColorStop(1, '#f7b731');
      ctx.fillStyle = g;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.arc(32, 32, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Rosy cheeks
      ctx.fillStyle = 'rgba(255, 118, 150, 0.55)';
      ctx.beginPath();
      ctx.ellipse(22.5, 35, 3.2, 2, 0, 0, Math.PI * 2);
      ctx.ellipse(41.5, 35, 3.2, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Happy arc eyes & smile
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(25.5, 29, 3, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(38.5, 29, 3, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(32, 34, 6.5, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
      break;
    }

    case 'ecstaticMood': {
      drawAura(ctx, 'rgba(255, 165, 235, 0.44)', 'rgba(255, 224, 110, 0)');
      const g = ctx.createLinearGradient(14, 14, 50, 50);
      g.addColorStop(0, '#fff7b2');
      g.addColorStop(0.55, '#ffbe55');
      g.addColorStop(1, '#ff77b7');
      ctx.fillStyle = g;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.arc(32, 33, 17.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Star eyes
      drawSparkle(ctx, 25.5, 29, 4.6, INK, 1);
      drawSparkle(ctx, 38.5, 29, 4.6, INK, 1);
      // Big joyful open grin
      ctx.fillStyle = '#c92a5b';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(32, 36, 6.5, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawSparkle(ctx, 14, 16, 5.2, '#fff9c4', 0.98);
      drawSparkle(ctx, 50, 17, 4.8, '#ffffff', 0.95);
      break;
    }

    case 'flowerPatch': {
      drawAura(ctx, 'rgba(110, 235, 165, 0.34)', 'rgba(110, 235, 165, 0)');
      // Grass mound
      ctx.fillStyle = '#4cd97b';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.1;
      ctx.beginPath();
      ctx.ellipse(32, 45, 19, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Stems
      ctx.strokeStyle = '#248f48';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(22, 43);
      ctx.lineTo(20, 29);
      ctx.moveTo(32, 43);
      ctx.lineTo(32, 23);
      ctx.moveTo(42, 43);
      ctx.lineTo(44, 30);
      ctx.stroke();
      // Three blooms
      const drawBloom = (bx: number, by: number, petalCol: string, r: number): void => {
        ctx.fillStyle = petalCol;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.6;
        for (let i = 0; i < 5; i++) {
          const a = (i * Math.PI * 2) / 5;
          ctx.beginPath();
          ctx.arc(bx + Math.cos(a) * r, by + Math.sin(a) * r, r * 0.68, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(bx, by, r * 0.58, 0, Math.PI * 2);
        ctx.fill();
      };
      drawBloom(20, 27, '#ff8fb8', 4.5);
      drawBloom(44, 28, '#a29bfe', 4.4);
      drawBloom(32, 21, '#fff3a1', 5.4);
      break;
    }

    case 'parkTree': {
      drawAura(ctx, 'rgba(100, 225, 145, 0.36)', 'rgba(100, 225, 145, 0)');

      // Exact PupperPark in-park tree style with clean outer ink silhouette (zero overlapping internal circle lines)
      ctx.save();
      ctx.translate(32, 53);
      ctx.scale(0.86, 0.86);

      // Soft root moss tuft
      ctx.fillStyle = '#2b8a3e';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 2.2, 10.5, 4.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Tapered organic bark trunk with flared roots & forked boughs
      const trunkGrad = ctx.createLinearGradient(-6, 0, 6, 0);
      trunkGrad.addColorStop(0, '#5a3822');
      trunkGrad.addColorStop(0.38, '#8d5b3a');
      trunkGrad.addColorStop(0.75, '#724629');
      trunkGrad.addColorStop(1, '#4c2e1b');
      ctx.fillStyle = trunkGrad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-7.2, 2.6);
      ctx.quadraticCurveTo(-4.4, -2.5, -4.0, -18.5);
      ctx.lineTo(-8.5, -24.5);
      ctx.lineTo(-5.2, -25.8);
      ctx.lineTo(-1.2, -20.8);
      ctx.lineTo(1.2, -20.8);
      ctx.lineTo(6.2, -26.2);
      ctx.lineTo(8.6, -24.2);
      ctx.lineTo(4.0, -18.0);
      ctx.quadraticCurveTo(4.5, -2.5, 7.2, 2.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Subtle vertical bark grain lines
      ctx.strokeStyle = 'rgba(48, 26, 12, 0.45)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(-1.8, -1.5);
      ctx.quadraticCurveTo(-1.4, -9, -2.0, -16);
      ctx.moveTo(1.6, 0.5);
      ctx.quadraticCurveTo(2.0, -7, 1.4, -14.5);
      ctx.stroke();

      // Layer 1: Unified outer ink contour behind entire canopy silhouette
      const canopyHull: Array<[number, number, number]> = [
        [-11.5, -25.5, 11.2],
        [11.8, -25.0, 10.8],
        [0, -23.5, 13.0],
        [-10.5, -30.5, 11.5],
        [10.5, -30.0, 11.2],
        [0, -34.5, 13.8],
        [0.5, -40.5, 10.5]
      ];
      ctx.fillStyle = INK;
      for (const [cx, cy, r] of canopyHull) {
        ctx.beginPath();
        ctx.arc(cx, cy, r + 2.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Layer 2: Deep forest shaded underside foliage puffs
      ctx.fillStyle = '#1b7a43';
      ctx.beginPath();
      ctx.arc(-11.5, -25.5, 11.2, 0, Math.PI * 2);
      ctx.arc(11.8, -25.0, 10.8, 0, Math.PI * 2);
      ctx.arc(0, -23.5, 13.0, 0, Math.PI * 2);
      ctx.fill();

      // Layer 3: Rich mid-emerald canopy body clusters
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.arc(-10.5, -30.5, 11.5, 0, Math.PI * 2);
      ctx.arc(10.5, -30.0, 11.2, 0, Math.PI * 2);
      ctx.arc(0, -34.5, 13.8, 0, Math.PI * 2);
      ctx.fill();

      // Layer 4: Vibrant upper leaf puffs
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.arc(-7.5, -35.8, 9.6, 0, Math.PI * 2);
      ctx.arc(7.8, -35.0, 9.2, 0, Math.PI * 2);
      ctx.arc(0.5, -40.5, 10.5, 0, Math.PI * 2);
      ctx.fill();

      // Layer 5: Sunlit golden-lime crown highlights
      ctx.fillStyle = '#7bed9f';
      ctx.beginPath();
      ctx.arc(-5.2, -39.5, 5.4, 0, Math.PI * 2);
      ctx.arc(3.8, -42.5, 5.0, 0, Math.PI * 2);
      ctx.arc(8.4, -36.8, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Layer 6: Tiny sunlit leaf stipples
      ctx.fillStyle = 'rgba(220, 255, 210, 0.62)';
      const stipples: Array<[number, number, number]> = [
        [-11, -33, 1.5],
        [-2, -45, 1.7],
        [9, -39, 1.5],
        [2, -31, 1.4]
      ];
      for (const [sx, sy, sr] of stipples) {
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
      break;
    }

    case 'dogSlide': {
      drawAura(ctx, 'rgba(255, 160, 120, 0.34)', 'rgba(255, 160, 120, 0)');
      // Ladder legs
      ctx.strokeStyle = '#ffd159';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(19, 48);
      ctx.lineTo(24, 18);
      ctx.moveTo(27, 48);
      ctx.lineTo(29, 18);
      ctx.stroke();
      // Slide chute
      const g = ctx.createLinearGradient(24, 18, 50, 46);
      g.addColorStop(0, '#ff8e72');
      g.addColorStop(1, '#e84152');
      ctx.fillStyle = g;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(23, 18);
      ctx.lineTo(31, 18);
      ctx.quadraticCurveTo(38, 36, 51, 41);
      ctx.lineTo(48, 48);
      ctx.quadraticCurveTo(33, 42, 23, 25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawSparkle(ctx, 44, 21, 4.4, '#ffeaa7', 0.92);
      break;
    }

    case 'gardenArch': {
      drawAura(ctx, 'rgba(130, 240, 185, 0.36)', 'rgba(255, 195, 225, 0)');
      // Lush arch
      ctx.strokeStyle = '#38c172';
      ctx.lineWidth = 8.5;
      ctx.beginPath();
      ctx.arc(32, 36, 17, Math.PI, 0);
      ctx.lineTo(49, 49);
      ctx.moveTo(15, 36);
      ctx.lineTo(15, 49);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(32, 36, 21, Math.PI, 0);
      ctx.stroke();
      // Tiny roses along arch
      const roses: Array<[number, number, string]> = [
        [18, 25, '#ff8fb8'],
        [32, 19, '#ffe066'],
        [46, 25, '#ffb3e6']
      ];
      for (const [rx, ry, col] of roses) {
        ctx.fillStyle = col;
        ctx.strokeStyle = INK;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rx, ry, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      drawSparkle(ctx, 32, 35, 4.8, '#ffeaa7', 0.95);
      break;
    }

    case 'parkMap': {
      drawAura(ctx, 'rgba(95, 235, 175, 0.34)', 'rgba(95, 235, 175, 0)');
      // Isometric 8x8 diamond meadow tile
      const g = ctx.createLinearGradient(12, 18, 52, 48);
      g.addColorStop(0, '#78f59d');
      g.addColorStop(1, '#26a65b');
      ctx.fillStyle = g;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(32, 14);
      ctx.lineTo(54, 32);
      ctx.lineTo(32, 50);
      ctx.lineTo(10, 32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Grid lines inside
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(21, 23);
      ctx.lineTo(43, 41);
      ctx.moveTo(43, 23);
      ctx.lineTo(21, 41);
      ctx.stroke();
      drawSparkle(ctx, 32, 32, 5.2, '#fff9c4', 0.95);
      break;
    }

    case 'manor': {
      drawAura(ctx, 'rgba(255, 224, 128, 0.38)', 'rgba(130, 114, 240, 0)');
      // Manor walls
      ctx.fillStyle = '#fff3df';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      drawRoundedRect(ctx, 15, 28, 34, 22, 3);
      ctx.fill();
      ctx.stroke();
      // Grand pitched slate roof
      const roof = ctx.createLinearGradient(12, 13, 52, 30);
      roof.addColorStop(0, '#6a7fdb');
      roof.addColorStop(1, '#394382');
      ctx.fillStyle = roof;
      ctx.beginPath();
      ctx.moveTo(10, 30);
      ctx.lineTo(32, 13);
      ctx.lineTo(54, 30);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Arched doorway
      ctx.fillStyle = '#3b2454';
      ctx.beginPath();
      ctx.arc(32, 41, 6.5, Math.PI, 0);
      ctx.lineTo(38.5, 50);
      ctx.lineTo(25.5, 50);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Gold finial
      ctx.fillStyle = '#ffd159';
      ctx.beginPath();
      ctx.arc(32, 12, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'sanctuary': {
      drawAura(ctx, 'rgba(255, 235, 145, 0.44)', 'rgba(110, 235, 210, 0)');
      // Floating emerald sanctuary island
      ctx.fillStyle = '#8b5e3c';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(14, 36);
      ctx.lineTo(50, 36);
      ctx.quadraticCurveTo(42, 50, 32, 52);
      ctx.quadraticCurveTo(22, 50, 14, 36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#55efc4';
      ctx.beginPath();
      ctx.ellipse(32, 35, 19, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Mini golden sun & sparkles above
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.arc(32, 22, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawSparkle(ctx, 16, 18, 4.6, '#ffffff', 0.95);
      drawSparkle(ctx, 48, 19, 4.8, '#fff9c4', 0.95);
      break;
    }

    case 'relicUrn': {
      drawAura(ctx, 'rgba(255, 195, 120, 0.34)', 'rgba(255, 195, 120, 0)');
      const g = ctx.createLinearGradient(18, 14, 46, 52);
      g.addColorStop(0, '#ffd48a');
      g.addColorStop(0.55, '#d9843b');
      g.addColorStop(1, '#8c4416');
      ctx.fillStyle = g;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(25, 15);
      ctx.lineTo(39, 15);
      ctx.lineTo(37, 23);
      ctx.bezierCurveTo(48, 28, 46, 48, 32, 50);
      ctx.bezierCurveTo(18, 48, 16, 28, 27, 23);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Gold band
      ctx.fillStyle = '#ffe066';
      ctx.fillRect(21, 33, 22, 4.5);
      drawSparkle(ctx, 46, 18, 4.6, '#ffeaa7', 0.95);
      break;
    }

    case 'relicGem': {
      drawAura(ctx, 'rgba(130, 215, 255, 0.4)', 'rgba(170, 120, 255, 0)');
      const g = ctx.createLinearGradient(14, 16, 50, 50);
      g.addColorStop(0, '#e8fbff');
      g.addColorStop(0.45, '#74b9ff');
      g.addColorStop(1, '#6c5ce7');
      ctx.fillStyle = g;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(20, 17);
      ctx.lineTo(44, 17);
      ctx.lineTo(52, 29);
      ctx.lineTo(32, 50);
      ctx.lineTo(12, 29);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(12, 29);
      ctx.lineTo(52, 29);
      ctx.moveTo(24, 17);
      ctx.lineTo(32, 50);
      ctx.moveTo(40, 17);
      ctx.lineTo(32, 50);
      ctx.stroke();
      drawSparkle(ctx, 47, 16, 4.5, '#ffffff', 0.95);
      break;
    }

    case 'relicScroll': {
      drawAura(ctx, 'rgba(255, 232, 165, 0.34)', 'rgba(255, 232, 165, 0)');
      const g = ctx.createLinearGradient(16, 16, 48, 48);
      g.addColorStop(0, '#fff7dc');
      g.addColorStop(1, '#dfc084');
      ctx.fillStyle = g;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      drawRoundedRect(ctx, 16, 16, 32, 32, 5);
      ctx.fill();
      ctx.stroke();
      // Rolled ends
      ctx.fillStyle = '#c89b4b';
      drawRoundedRect(ctx, 13, 13, 38, 6.5, 3);
      ctx.fill();
      ctx.stroke();
      drawRoundedRect(ctx, 13, 44.5, 38, 6.5, 3);
      ctx.fill();
      ctx.stroke();
      // Wax seal
      ctx.fillStyle = '#ff6b81';
      ctx.beginPath();
      ctx.arc(32, 32, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }

    case 'diamondBowl': {
      drawAura(ctx, 'rgba(128, 240, 255, 0.45)', 'rgba(66, 196, 245, 0)');
      const g = ctx.createLinearGradient(12, 24, 52, 48);
      g.addColorStop(0, '#f0ffff');
      g.addColorStop(0.35, '#8eeaff');
      g.addColorStop(0.75, '#42c4f5');
      g.addColorStop(1, '#2286d1');
      ctx.fillStyle = g;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(16, 28);
      ctx.lineTo(48, 28);
      ctx.lineTo(52, 42);
      ctx.quadraticCurveTo(32, 52, 12, 42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Rim & water
      ctx.fillStyle = '#d4faff';
      ctx.beginPath();
      ctx.ellipse(32, 28, 16, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#4cc9f0';
      ctx.beginPath();
      ctx.ellipse(32, 28.4, 12.2, 4.1, 0, 0, Math.PI * 2);
      ctx.fill();
      // Golden paw emblem
      drawPawPrint(ctx, 32, 40.5, 0.36, '#ffd55a', '#7c440e');
      drawSparkle(ctx, 16, 18, 5.2, '#fff9c4', 0.98);
      drawSparkle(ctx, 48, 19, 4.4, '#ffffff', 0.95);
      break;
    }

    case 'relicFlame': {
      drawAura(ctx, 'rgba(255, 165, 90, 0.42)', 'rgba(255, 90, 120, 0)');
      const g = ctx.createLinearGradient(32, 12, 32, 52);
      g.addColorStop(0, '#fff5a8');
      g.addColorStop(0.5, '#ff9f43');
      g.addColorStop(1, '#ee5253');
      ctx.fillStyle = g;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(32, 12);
      ctx.bezierCurveTo(46, 22, 50, 39, 32, 51);
      ctx.bezierCurveTo(14, 39, 18, 22, 32, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff9d6';
      ctx.beginPath();
      ctx.moveTo(32, 25);
      ctx.bezierCurveTo(38, 31, 39, 40, 32, 45);
      ctx.bezierCurveTo(25, 40, 26, 31, 32, 25);
      ctx.closePath();
      ctx.fill();
      break;
    }

    case 'clock': {
      drawAura(ctx, 'rgba(130, 235, 220, 0.34)', 'rgba(130, 235, 220, 0)');
      // Crown knob
      ctx.fillStyle = '#ffd159';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.1;
      drawRoundedRect(ctx, 28, 9, 8, 6, 2);
      ctx.fill();
      ctx.stroke();
      // Case
      ctx.fillStyle = '#ffca44';
      ctx.beginPath();
      ctx.arc(32, 34, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Dial
      ctx.fillStyle = '#f5fffd';
      ctx.beginPath();
      ctx.arc(32, 34, 13.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Hands
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(32, 34);
      ctx.lineTo(32, 24);
      ctx.moveTo(32, 34);
      ctx.lineTo(40, 36);
      ctx.stroke();
      break;
    }

    case 'shovel': {
      drawAura(ctx, 'rgba(195, 220, 255, 0.32)', 'rgba(195, 220, 255, 0)');
      ctx.save();
      ctx.translate(32, 32);
      ctx.rotate(-0.65);
      // Handle
      ctx.fillStyle = '#c27d46';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      drawRoundedRect(ctx, -3, -21, 6, 25, 2.5);
      ctx.fill();
      ctx.stroke();
      // T-grip
      drawRoundedRect(ctx, -8, -23, 16, 5.5, 2.5);
      ctx.fill();
      ctx.stroke();
      // Steel spade blade
      const blade = ctx.createLinearGradient(-10, 2, 10, 22);
      blade.addColorStop(0, '#eef4ff');
      blade.addColorStop(1, '#8ea6c9');
      ctx.fillStyle = blade;
      ctx.beginPath();
      ctx.moveTo(-10, 3);
      ctx.lineTo(10, 3);
      ctx.lineTo(8, 16);
      ctx.quadraticCurveTo(0, 24, -8, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      break;
    }

    case 'grassTap': {
      drawAura(ctx, 'rgba(85, 239, 196, 0.36)', 'rgba(85, 239, 196, 0)');
      // Soft green turf mound
      ctx.fillStyle = '#4cd97b';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(32, 42, 19, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Grass blades
      ctx.fillStyle = '#2ed573';
      ctx.beginPath();
      ctx.moveTo(22, 38);
      ctx.lineTo(18, 22);
      ctx.lineTo(27, 35);
      ctx.lineTo(32, 17);
      ctx.lineTo(37, 35);
      ctx.lineTo(46, 22);
      ctx.lineTo(42, 38);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      drawSparkle(ctx, 32, 14, 4.5, '#55efc4', 0.95);
      break;
    }

    case 'whistle': {
      drawAura(ctx, 'rgba(255, 234, 167, 0.36)', 'rgba(255, 234, 167, 0)');

      // Exact Call button (#btnWhistle) megaphone silhouette mapped cleanly from viewBox 0 0 24 24
      ctx.save();
      ctx.translate(32, 32);
      const s = 2.05;
      const vx = (x: number): number => (x - 12) * s;
      const vy = (y: number): number => (y - 12.5) * s;

      // Curved lower grip handle matching <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
      ctx.lineCap = 'round';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 6.8;
      ctx.beginPath();
      ctx.arc(vx(8.7), vy(16.0), 3.01 * s, 0.27, Math.PI + 0.27, false);
      ctx.stroke();

      ctx.strokeStyle = '#ffd66b';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(vx(8.7), vy(16.0), 3.01 * s, 0.27, Math.PI + 0.27, false);
      ctx.stroke();

      // Main megaphone cone matching <path d="M3 11l18-5v12L3 14v-3z"/>
      const coneGrad = ctx.createLinearGradient(vx(3), vy(6), vx(21), vy(18));
      coneGrad.addColorStop(0, '#fff9d6');
      coneGrad.addColorStop(0.45, '#ffeaa7');
      coneGrad.addColorStop(0.82, '#f7c148');
      coneGrad.addColorStop(1, '#d68910');
      ctx.fillStyle = coneGrad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(vx(3), vy(11));
      ctx.lineTo(vx(21), vy(6));
      ctx.lineTo(vx(21), vy(18));
      ctx.lineTo(vx(3), vy(14));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Subtle glossy top highlight ridge & inner rim accent
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(vx(5.2), vy(11.3));
      ctx.lineTo(vx(18.6), vy(7.6));
      ctx.stroke();

      ctx.strokeStyle = 'rgba(181, 102, 12, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(vx(19.1), vy(7.2));
      ctx.lineTo(vx(19.1), vy(16.9));
      ctx.stroke();

      ctx.restore();
      break;
    }

    case 'giftChest': {
      drawAura(ctx, 'rgba(255, 225, 115, 0.44)', 'rgba(155, 89, 246, 0)');
      // Box body
      const box = ctx.createLinearGradient(14, 24, 50, 52);
      box.addColorStop(0, '#9a86ff');
      box.addColorStop(1, '#5844c7');
      ctx.fillStyle = box;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      drawRoundedRect(ctx, 15, 26, 34, 24, 4);
      ctx.fill();
      ctx.stroke();
      // Lid
      drawRoundedRect(ctx, 12, 20, 40, 8, 3);
      ctx.fill();
      ctx.stroke();
      // Gold vertical & bow ribbon
      ctx.fillStyle = '#ffd159';
      ctx.fillRect(28.5, 21, 7, 28);
      ctx.strokeRect(28.5, 21, 7, 28);
      ctx.beginPath();
      ctx.ellipse(25, 17, 6.5, 4.2, -0.35, 0, Math.PI * 2);
      ctx.ellipse(39, 17, 6.5, 4.2, 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      drawSparkle(ctx, 49, 14, 4.8, '#fff9c4', 0.98);
      break;
    }

    case 'calendar': {
      drawAura(ctx, 'rgba(130, 235, 220, 0.36)', 'rgba(130, 235, 220, 0)');
      // Calendar card
      ctx.fillStyle = '#fffdf7';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      drawRoundedRect(ctx, 13, 16, 38, 36, 6);
      ctx.fill();
      ctx.stroke();
      // Header bar
      const head = ctx.createLinearGradient(13, 16, 51, 28);
      head.addColorStop(0, '#ff85a2');
      head.addColorStop(1, '#e8436d');
      ctx.fillStyle = head;
      drawRoundedRect(ctx, 13, 16, 38, 12, 6);
      ctx.fill();
      ctx.fillRect(13, 22, 38, 6);
      ctx.stroke();
      // Spiral rings
      ctx.fillStyle = '#ffd159';
      drawRoundedRect(ctx, 21, 11, 5, 9, 2.5);
      ctx.fill();
      ctx.stroke();
      drawRoundedRect(ctx, 38, 11, 5, 9, 2.5);
      ctx.fill();
      ctx.stroke();
      // Paw stamp inside calendar
      drawPawPrint(ctx, 32, 39.5, 0.72, '#6c5ce7', INK);
      drawSparkle(ctx, 50, 14, 4.2, '#ffeaa7', 0.95);
      break;
    }

    case 'dice': {
      drawAura(ctx, 'rgba(178, 138, 255, 0.42)', 'rgba(108, 92, 231, 0)');
      ctx.save();
      ctx.translate(32, 32);
      ctx.rotate(-0.18);
      const die = ctx.createLinearGradient(-18, -18, 18, 18);
      die.addColorStop(0, '#c6b7ff');
      die.addColorStop(0.55, '#8068f0');
      die.addColorStop(1, '#5037b8');
      ctx.fillStyle = die;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.3;
      drawRoundedRect(ctx, -17, -17, 34, 34, 7);
      ctx.fill();
      ctx.stroke();
      // Five golden pips
      ctx.fillStyle = '#fff5b8';
      const pips: Array<[number, number]> = [
        [-8, -8],
        [8, -8],
        [0, 0],
        [-8, 8],
        [8, 8]
      ];
      for (const [px, py] of pips) {
        ctx.beginPath();
        ctx.arc(px, py, 3.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      drawSparkle(ctx, 49, 15, 4.8, '#fff9c4', 0.95);
      break;
    }

    case 'paintBrush': {
      drawAura(ctx, 'rgba(95, 235, 195, 0.36)', 'rgba(255, 182, 115, 0)');
      ctx.save();
      ctx.translate(32, 32);
      ctx.rotate(-0.65);
      // Wooden handle
      ctx.fillStyle = '#d98a4a';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      drawRoundedRect(ctx, -4, -22, 8, 20, 4);
      ctx.fill();
      ctx.stroke();
      // Metal ferrule
      ctx.fillStyle = '#dce7f7';
      drawRoundedRect(ctx, -8, -4, 16, 7, 2);
      ctx.fill();
      ctx.stroke();
      // Bristles dipped in bright mint/gold paint
      const bristle = ctx.createLinearGradient(0, 3, 0, 22);
      bristle.addColorStop(0, '#f5d79b');
      bristle.addColorStop(0.45, '#55efc4');
      bristle.addColorStop(1, '#00b894');
      ctx.fillStyle = bristle;
      drawRoundedRect(ctx, -9.5, 3, 19, 18, 4);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      drawSparkle(ctx, 47, 17, 4.4, '#ffeaa7', 0.95);
      break;
    }

    case 'level500Crest': {
      drawAura(ctx, 'rgba(116, 185, 255, 0.44)', 'rgba(108, 92, 231, 0)');
      // Silver-mint laurel arcs
      ctx.strokeStyle = '#74b9ff';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.arc(32, 33, 22, Math.PI * 0.65, Math.PI * 1.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(32, 33, 22, -Math.PI * 0.25, Math.PI * 0.35);
      ctx.stroke();

      // Royal sapphire shield
      const g = ctx.createLinearGradient(17, 13, 47, 53);
      g.addColorStop(0, '#a8e6ff');
      g.addColorStop(0.5, '#4b7bec');
      g.addColorStop(1, '#341f97');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#ffd159';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(17, 16);
      ctx.lineTo(32, 12);
      ctx.lineTo(47, 16);
      ctx.lineTo(46, 35);
      ctx.quadraticCurveTo(45, 47, 32, 53);
      ctx.quadraticCurveTo(19, 47, 18, 35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.fillStyle = '#fff9d6';
      ctx.font = '900 12px "Outfit", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('500', 32, 34);
      drawSparkle(ctx, 32, 9, 4.6, '#fff9c4', 0.98);
      break;
    }

    case 'level1000Crest': {
      drawAura(ctx, 'rgba(255, 224, 102, 0.5)', 'rgba(195, 130, 255, 0)');
      // Golden laurel arcs
      ctx.strokeStyle = '#ffd159';
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.arc(32, 34, 23, Math.PI * 0.65, Math.PI * 1.25);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(32, 34, 23, -Math.PI * 0.25, Math.PI * 0.35);
      ctx.stroke();

      // Cosmic diamond-gold shield
      const g = ctx.createLinearGradient(16, 14, 48, 54);
      g.addColorStop(0, '#fff9c4');
      g.addColorStop(0.45, '#ffd04d');
      g.addColorStop(0.85, '#c471ed');
      g.addColorStop(1, '#5f27cd');
      ctx.fillStyle = g;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.moveTo(16, 18);
      ctx.lineTo(32, 13);
      ctx.lineTo(48, 18);
      ctx.lineTo(46, 36);
      ctx.quadraticCurveTo(45, 48, 32, 54);
      ctx.quadraticCurveTo(19, 48, 18, 36);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Tiny crown perched atop shield
      ctx.fillStyle = '#ffe066';
      ctx.beginPath();
      ctx.moveTo(23, 15);
      ctx.lineTo(22, 8);
      ctx.lineTo(28, 12);
      ctx.lineTo(32, 6);
      ctx.lineTo(36, 12);
      ctx.lineTo(42, 8);
      ctx.lineTo(41, 15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#261738';
      ctx.font = '900 11px "Outfit", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1000', 32, 35);
      drawSparkle(ctx, 13, 15, 4.8, '#ffffff', 0.98);
      drawSparkle(ctx, 51, 15, 4.8, '#fff9c4', 0.98);
      break;
    }
  }
}

export function getGoalIconDataUrl(id: GoalIconId): string {
  const cached = ICON_CACHE.get(id);
  if (cached) return cached;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.scale(2, 2);
  drawGoalIconArt(ctx, id);
  const url = canvas.toDataURL('image/png');
  ICON_CACHE.set(id, url);
  return url;
}
