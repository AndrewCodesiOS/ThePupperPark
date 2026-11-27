import type { TreasureRarity } from './treasures';
import { HUD_BONE_PRESETS, drawHudStyleBone } from './uiIcons';

const INK = '#261738';

const RARITY_AURA: Record<TreasureRarity, { inner: string; mid: string; spark: string }> = {
  Common: {
    inner: 'rgba(235, 212, 166, 0.22)',
    mid: 'rgba(130, 114, 184, 0.14)',
    spark: '#ffeaa7'
  },
  Rare: {
    inner: 'rgba(92, 196, 255, 0.28)',
    mid: 'rgba(72, 126, 235, 0.16)',
    spark: '#9ee7ff'
  },
  Legendary: {
    inner: 'rgba(255, 214, 92, 0.34)',
    mid: 'rgba(243, 156, 18, 0.16)',
    spark: '#fff2a8'
  },
  Mythic: {
    inner: 'rgba(255, 118, 198, 0.38)',
    mid: 'rgba(155, 89, 246, 0.20)',
    spark: '#ffb3e6'
  }
};

function drawSparkle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  alpha = 1
): void {
  if (r <= 0.4 || alpha <= 0.02) return;
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.quadraticCurveTo(x + r * 0.16, y - r * 0.16, x + r, y);
  ctx.quadraticCurveTo(x + r * 0.16, y + r * 0.16, x, y + r);
  ctx.quadraticCurveTo(x - r * 0.16, y + r * 0.16, x - r, y);
  ctx.quadraticCurveTo(x - r * 0.16, y - r * 0.16, x, y - r);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPaw(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  fill: string,
  stroke?: string,
  lineW = 2.2
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = fill;
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineW;
  }

  // Main pad
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.bezierCurveTo(10, -2, 13, 10, 8, 13);
  ctx.bezierCurveTo(4, 15, 2, 12.5, 0, 12.5);
  ctx.bezierCurveTo(-2, 12.5, -4, 15, -8, 13);
  ctx.bezierCurveTo(-13, 10, -10, -2, 0, -2);
  ctx.closePath();
  ctx.fill();
  if (stroke) ctx.stroke();

  // Four toes
  const toes: Array<[number, number, number, number, number]> = [
    [-11.5, -5.5, 3.6, 4.9, -0.34],
    [-4.2, -11.2, 3.8, 5.2, -0.12],
    [4.2, -11.2, 3.8, 5.2, 0.12],
    [11.5, -5.5, 3.6, 4.9, 0.34]
  ];
  for (const [tx, ty, rx, ry, rot] of toes) {
    ctx.beginPath();
    ctx.ellipse(tx, ty, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
    if (stroke) ctx.stroke();
  }
  ctx.restore();
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  s: number,
  fill: string,
  stroke?: string,
  lineW = 2
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(0, 7);
  ctx.bezierCurveTo(-12, -2, -12, -11, -5, -11);
  ctx.bezierCurveTo(-1.8, -11, 0, -8.5, 0, -6.5);
  ctx.bezierCurveTo(0, -8.5, 1.8, -11, 5, -11);
  ctx.bezierCurveTo(12, -11, 12, -2, 0, 7);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineW;
    ctx.lineJoin = 'round';
    ctx.stroke();
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
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  rarity: TreasureRarity,
  t: number
): void {
  const bgGrad = ctx.createRadialGradient(100, 92, 10, 100, 100, 118);
  bgGrad.addColorStop(0, '#2a2152');
  bgGrad.addColorStop(0.58, '#1b1438');
  bgGrad.addColorStop(1, '#120d26');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 200, 200);

  const aura = RARITY_AURA[rarity];
  const pulse = 1 + Math.sin(t * 2.2) * 0.06;
  const glow = ctx.createRadialGradient(100, 100, 6, 100, 100, 78 * pulse);
  glow.addColorStop(0, aura.inner);
  glow.addColorStop(0.55, aura.mid);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 200, 200);

  // Subtle storybook background sparkles
  const stars: Array<[number, number, number, number]> = [
    [28, 34, 4.5, 0.2],
    [170, 38, 5.2, 1.5],
    [34, 162, 3.8, 2.7],
    [168, 158, 4.4, 3.9],
    [152, 24, 3.0, 5.0],
    [22, 104, 3.2, 1.0]
  ];
  for (const [sx, sy, sr, ph] of stars) {
    const a = 0.28 + 0.52 * (0.5 + 0.5 * Math.sin(t * 2.4 + ph));
    drawSparkle(ctx, sx, sy, sr * (0.75 + 0.3 * a), aura.spark, a);
  }
}

/* ---------------- 16 Handcrafted Relic Renderers ---------------- */

function drawMuddyMap(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 2.0) * 2.2;
  ctx.save();
  ctx.translate(100, 102 + bob);
  ctx.rotate(-0.07);

  // Soft drop shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
  ctx.beginPath();
  ctx.ellipse(2, 64, 56, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Parchment body
  const bodyGrad = ctx.createLinearGradient(-50, -52, 54, 52);
  bodyGrad.addColorStop(0, '#fff7dc');
  bodyGrad.addColorStop(0.55, '#f5e1b3');
  bodyGrad.addColorStop(1, '#e1be80');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.8;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-46, -46);
  ctx.lineTo(48, -40);
  ctx.lineTo(44, 48);
  ctx.lineTo(-50, 42);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Winding blue river
  ctx.strokeStyle = '#48b8f0';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-44, 2);
  ctx.bezierCurveTo(-24, -4, -26, 16, -8, 10);
  ctx.stroke();
  ctx.strokeStyle = '#8de0ff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Tiny cartoon park trees
  const trees: Array<[number, number, number]> = [
    [-31, -24, 1],
    [-20, -28, 0.9],
    [-12, -21, 0.85],
    [22, 6, 0.8]
  ];
  for (const [tx, ty, ts] of trees) {
    ctx.save();
    ctx.translate(tx, ty);
    ctx.scale(ts, ts);
    ctx.fillStyle = '#7d5333';
    ctx.fillRect(-2, 4, 4, 6);
    ctx.fillStyle = '#3fb950';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(8, 5);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // Dotted paw-print trail
  const dots: Array<[number, number]> = [
    [-26, 26], [-16, 30], [-4, 26], [3, 15], [-4, 4], [4, -8], [16, -16]
  ];
  ctx.fillStyle = '#6b4432';
  for (const [dx, dy] of dots) {
    ctx.beginPath();
    ctx.arc(dx, dy, 2.3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Pulsing red X marks the spot
  const xPulse = 1 + Math.sin(t * 3.8) * 0.1;
  ctx.save();
  ctx.translate(27, -20);
  ctx.scale(xPulse, xPulse);
  ctx.strokeStyle = '#ff4d4f';
  ctx.lineWidth = 5.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-9, -9);
  ctx.lineTo(9, 9);
  ctx.moveTo(9, -9);
  ctx.lineTo(-9, 9);
  ctx.stroke();
  ctx.restore();

  // Charming muddy paw smudge
  drawPaw(ctx, 21, 25, 0.92, 'rgba(110, 74, 44, 0.84)');

  // Top & Bottom rolled parchment tubes
  const drawRoll = (rx: number, ry: number, w: number, rot: number) => {
    ctx.save();
    ctx.translate(rx, ry);
    ctx.rotate(rot);
    const rg = ctx.createLinearGradient(0, -12, 0, 12);
    rg.addColorStop(0, '#fffbef');
    rg.addColorStop(0.5, '#f4dfb0');
    rg.addColorStop(1, '#cfa468');
    drawRoundedRect(ctx, -w / 2, -10, w, 20, 10);
    ctx.fillStyle = rg;
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3.6;
    ctx.stroke();

    // Spiral curl on right end
    ctx.fillStyle = '#b9884e';
    ctx.beginPath();
    ctx.ellipse(w / 2 - 5, 0, 5.5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Highlight stripe
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-w * 0.34, -4);
    ctx.lineTo(w * 0.24, -4);
    ctx.stroke();
    ctx.restore();
  };

  drawRoll(2, -48, 108, 0.05);
  drawRoll(-4, 46, 106, 0.05);
  ctx.restore();
}

function drawLostCompass(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 2.1) * 2;
  ctx.save();
  ctx.translate(100, 103 + bob);

  // Top pocket ring & crown knob
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.8;
  ctx.fillStyle = '#f5b83d';
  ctx.beginPath();
  ctx.arc(0, -64, 12, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffd666';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(0, -64, 14.5, 0, Math.PI * 2);
  ctx.stroke();

  drawRoundedRect(ctx, -11, -57, 22, 14, 6);
  ctx.fillStyle = '#f3b43f';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.4;
  ctx.stroke();

  // Outer chunky gold casing
  const outerGrad = ctx.createLinearGradient(-54, -54, 54, 54);
  outerGrad.addColorStop(0, '#fff099');
  outerGrad.addColorStop(0.45, '#f6b93b');
  outerGrad.addColorStop(1, '#c57919');
  ctx.beginPath();
  ctx.arc(0, 0, 56, 0, Math.PI * 2);
  ctx.fillStyle = outerGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Inner bezel
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.fillStyle = '#a86516';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.stroke();

  // Mint-cream dial
  const dialGrad = ctx.createRadialGradient(-8, -10, 4, 0, 0, 41);
  dialGrad.addColorStop(0, '#f3fff6');
  dialGrad.addColorStop(1, '#c8f7dc');
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.fillStyle = dialGrad;
  ctx.fill();

  // Cardinal tick marks
  ctx.strokeStyle = '#4e7a6d';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const inner = i % 2 === 0 ? 29 : 33;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * 36.5, Math.sin(a) * 36.5);
    ctx.stroke();
  }

  // Animated HUD-style bone-shaped needle seeking buried treasure!
  const needleAngle = -0.68 + Math.sin(t * 2.6) * 0.22 + Math.sin(t * 6.2) * 0.04;
  drawHudStyleBone(ctx, {
    x: 0,
    y: 0,
    width: 50,
    rot: needleAngle,
    fill: '#ff7675',
    fillBottom: '#d63031',
    rim: '#a61c1c',
    shade: '#b82525',
    shine: '#ffd0d0'
  });

  // Center golden pin
  ctx.beginPath();
  ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffeaa7';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.8;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-2, -2, 2.2, 0, Math.PI * 2);
  ctx.fill();

  // Outer brass specular highlight arcs
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, 0, 49.5, -Math.PI * 0.82, -Math.PI * 0.56);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 49.5, Math.PI * 0.16, Math.PI * 0.34);
  ctx.stroke();

  ctx.restore();
}

function drawTreatPouch(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 2.2) * 2;
  ctx.save();
  ctx.translate(100, 108 + bob);

  // HUD-style biscuits peeking out the top (behind front lip)
  drawHudStyleBone(ctx, { x: -22, y: -38, width: 44, rot: -0.65, ...HUD_BONE_PRESETS.biscuit });
  drawHudStyleBone(ctx, { x: 20, y: -39, width: 44, rot: 0.52, ...HUD_BONE_PRESETS.biscuit });
  drawHudStyleBone(ctx, { x: 0, y: -48, width: 48, rot: 0.08, ...HUD_BONE_PRESETS.biscuitLight });
  drawHudStyleBone(ctx, { x: -7, y: -30, width: 40, rot: -0.2, ...HUD_BONE_PRESETS.biscuit });

  // Pouch ruffled collar
  ctx.fillStyle = '#c89b6e';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.moveTo(-40, -28);
  ctx.quadraticCurveTo(-18, -18, 0, -25);
  ctx.quadraticCurveTo(18, -18, 40, -28);
  ctx.lineTo(35, -8);
  ctx.lineTo(-35, -8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Plump canvas body
  const sackGrad = ctx.createRadialGradient(-16, 4, 8, 0, 16, 62);
  sackGrad.addColorStop(0, '#f3d7b0');
  sackGrad.addColorStop(0.55, '#d8af7f');
  sackGrad.addColorStop(1, '#a87b4f');
  ctx.fillStyle = sackGrad;
  ctx.beginPath();
  ctx.moveTo(-36, -14);
  ctx.bezierCurveTo(-60, 8, -60, 56, 0, 56);
  ctx.bezierCurveTo(60, 56, 60, 8, 36, -14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Soft cloth crease lines
  ctx.strokeStyle = 'rgba(72, 42, 24, 0.35)';
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-22, -4);
  ctx.quadraticCurveTo(-30, 22, -24, 44);
  ctx.moveTo(22, -4);
  ctx.quadraticCurveTo(30, 22, 24, 44);
  ctx.stroke();

  // Coral-red drawstring cord & bow
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9.5;
  ctx.beginPath();
  ctx.moveTo(-37, -10);
  ctx.quadraticCurveTo(0, -1, 37, -10);
  ctx.stroke();
  ctx.strokeStyle = '#ff6b6b';
  ctx.lineWidth = 5;
  ctx.stroke();

  // Bow loops on right
  ctx.save();
  ctx.translate(29, -8);
  ctx.fillStyle = '#ff6b6b';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.ellipse(-6, 12, 10, 6.5, -0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(12, 8, 11, 6.5, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(2, 2, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Subtle paw stamp on pouch front
  drawPaw(ctx, -2, 24, 0.9, 'rgba(130, 86, 48, 0.42)');

  // Glossy left highlight
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-42, 12);
  ctx.quadraticCurveTo(-45, 25, -39, 34);
  ctx.stroke();

  ctx.restore();
}

function drawSturdyShovel(ctx: CanvasRenderingContext2D, t: number): void {
  const sway = Math.sin(t * 2.2) * 0.055;
  ctx.save();
  ctx.translate(100, 100);
  ctx.rotate(0.62 + sway);

  // D-Grip top handle
  ctx.strokeStyle = INK;
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-16, -64);
  ctx.lineTo(16, -64);
  ctx.quadraticCurveTo(22, -40, 0, -34);
  ctx.quadraticCurveTo(-22, -40, -16, -64);
  ctx.stroke();

  ctx.strokeStyle = '#c97e3c';
  ctx.lineWidth = 7.5;
  ctx.stroke();

  // Wood shaft
  const shaftGrad = ctx.createLinearGradient(-8, -38, 8, 12);
  shaftGrad.addColorStop(0, '#e39d58');
  shaftGrad.addColorStop(1, '#9d5b27');
  drawRoundedRect(ctx, -7.5, -38, 15, 50, 6);
  ctx.fillStyle = shaftGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.6;
  ctx.stroke();

  // Metal socket collar
  drawRoundedRect(ctx, -9.5, 4, 19, 14, 5);
  ctx.fillStyle = '#c8dff0';
  ctx.fill();
  ctx.stroke();

  // Shiny sky-silver spade blade
  const bladeGrad = ctx.createLinearGradient(-32, 14, 32, 68);
  bladeGrad.addColorStop(0, '#eef8ff');
  bladeGrad.addColorStop(0.5, '#b6d8ee');
  bladeGrad.addColorStop(1, '#7ea8c9');
  ctx.fillStyle = bladeGrad;
  ctx.beginPath();
  ctx.moveTo(-28, 16);
  ctx.lineTo(28, 16);
  ctx.quadraticCurveTo(32, 48, 0, 72);
  ctx.quadraticCurveTo(-32, 48, -28, 16);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Center blade ridge & specular sheen
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.78)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-16, 24);
  ctx.quadraticCurveTo(-17, 42, -6, 56);
  ctx.stroke();

  ctx.restore();

  // Cheerful dirt clump & grass blades at bottom-left tip
  ctx.save();
  ctx.translate(68, 148);
  ctx.fillStyle = '#7e4e2a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 6, 18, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Bright park grass tuft
  ctx.fillStyle = '#4cd137';
  ctx.beginPath();
  ctx.moveTo(-6, 4);
  ctx.quadraticCurveTo(-16, -14, -10, -20);
  ctx.quadraticCurveTo(-2, -10, 0, 2);
  ctx.quadraticCurveTo(2, -18, 8, -22);
  ctx.quadraticCurveTo(10, -8, 6, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawBiscuitTin(ctx: CanvasRenderingContext2D, t: number): void {
  const lidBob = Math.sin(t * 2.4) * 2.5;
  ctx.save();
  ctx.translate(100, 114);

  // Peeking HUD-style biscuits inside tin
  drawHudStyleBone(ctx, { x: -28, y: -24, width: 42, rot: -0.45, ...HUD_BONE_PRESETS.biscuit });
  drawHudStyleBone(ctx, { x: 28, y: -24, width: 42, rot: 0.45, ...HUD_BONE_PRESETS.biscuit });
  drawHudStyleBone(ctx, { x: 0, y: -26, width: 40, rot: 0.05, ...HUD_BONE_PRESETS.biscuitLight });

  // Royal blue enameled tin body
  const tinGrad = ctx.createLinearGradient(-56, -10, 56, 48);
  tinGrad.addColorStop(0, '#3a6ff7');
  tinGrad.addColorStop(0.5, '#274bdb');
  tinGrad.addColorStop(1, '#1a2f8f');
  ctx.fillStyle = tinGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-52, -14);
  ctx.bezierCurveTo(-60, 12, -56, 46, 0, 46);
  ctx.bezierCurveTo(56, 46, 60, 12, 52, -14);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Golden top & bottom rims
  drawRoundedRect(ctx, -54, -20, 108, 12, 6);
  ctx.fillStyle = '#ffd15c';
  ctx.fill();
  ctx.stroke();

  // Golden HUD-style bone emblem on front
  drawHudStyleBone(ctx, { x: 0, y: 16, width: 46, rot: 0, ...HUD_BONE_PRESETS.magic });

  // Faceted ruby & turquoise gem studs
  const gems: Array<[number, number, string]> = [
    [-36, 16, '#ff4d79'],
    [36, 16, '#ff4d79'],
    [-51, 14, '#2ef2e0'],
    [51, 14, '#2ef2e0']
  ];
  for (const [gx, gy, gc] of gems) {
    ctx.beginPath();
    ctx.arc(gx, gy, 6.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd15c';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(gx, gy, 4.2, 0, Math.PI * 2);
    ctx.fillStyle = gc;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath();
    ctx.arc(gx - 1.3, gy - 1.3, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tilted golden domed lid
  ctx.save();
  ctx.translate(4, -34 + lidBob);
  ctx.rotate(0.14);
  const lidGrad = ctx.createLinearGradient(-46, -24, 46, 8);
  lidGrad.addColorStop(0, '#fff3b0');
  lidGrad.addColorStop(0.5, '#f6b93b');
  lidGrad.addColorStop(1, '#c87d1a');
  ctx.fillStyle = lidGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.moveTo(-48, 4);
  ctx.bezierCurveTo(-42, -30, 42, -30, 48, 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lid knob
  ctx.beginPath();
  ctx.ellipse(0, -24, 10, 7, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe588';
  ctx.fill();
  ctx.stroke();

  // Turquoise center lid gem
  ctx.beginPath();
  ctx.arc(0, -6, 5.2, 0, Math.PI * 2);
  ctx.fillStyle = '#2ef2e0';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawGoldenTag(ctx: CanvasRenderingContext2D, t: number): void {
  const swing = Math.sin(t * 2.2) * 0.055;
  ctx.save();
  ctx.translate(100, 48);
  ctx.rotate(swing);

  // Soft golden drop shadow beneath tag
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
  ctx.beginPath();
  ctx.ellipse(0, 122, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Top split keyring (outer + inner metallic gold ring)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 10.5;
  ctx.beginPath();
  ctx.arc(0, -4, 15, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffd85e';
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(0, -4, 15, -Math.PI * 0.85, -Math.PI * 0.35);
  ctx.stroke();

  // Small connecting jump ring through eyelet
  ctx.fillStyle = '#f6b93b';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  drawRoundedRect(ctx, -5, 7, 10, 14, 5);
  ctx.fill();
  ctx.stroke();

  // 3D beveled thickness under the ID tag plate
  ctx.save();
  ctx.translate(0, 5.5);
  drawRoundedRect(ctx, -35, 16, 70, 94, 22);
  ctx.fillStyle = '#a86012';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();

  // Main brushed 24k gold ID tag plate (classic rounded dog-tag silhouette)
  const plateGrad = ctx.createLinearGradient(-36, 16, 38, 110);
  plateGrad.addColorStop(0, '#fff8c4');
  plateGrad.addColorStop(0.32, '#ffd652');
  plateGrad.addColorStop(0.72, '#f0a624');
  plateGrad.addColorStop(1, '#c97814');
  drawRoundedRect(ctx, -35, 16, 70, 94, 22);
  ctx.fillStyle = plateGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Sweeping specular metallic glint clipped to tag plate
  const glintX = -65 + ((t * 52) % 165);
  ctx.save();
  drawRoundedRect(ctx, -32, 19, 64, 88, 19);
  ctx.clip();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
  ctx.beginPath();
  ctx.moveTo(glintX, 12);
  ctx.lineTo(glintX + 20, 12);
  ctx.lineTo(glintX - 8, 114);
  ctx.lineTo(glintX - 28, 114);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Recessed engraved inner border frame
  drawRoundedRect(ctx, -27, 24, 54, 78, 15);
  ctx.strokeStyle = 'rgba(138, 76, 12, 0.55)';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  drawRoundedRect(ctx, -25.5, 25.5, 51, 75, 13.5);
  ctx.strokeStyle = 'rgba(255, 250, 210, 0.55)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Punched top eyelet hole with gold grommet rim
  ctx.beginPath();
  ctx.arc(0, 31, 6.2, 0, Math.PI * 2);
  ctx.fillStyle = '#1b1438';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.stroke();

  // Embossed paw stamp on upper-center of ID tag
  drawPaw(ctx, 0, 56, 0.92, '#c87714', '#7a4109', 1.8);
  drawPaw(ctx, -0.8, 54.8, 0.84, '#ffe988');

  // Crisp engraved ID inscription lines below the paw
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#8a4c0e';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(-16, 78);
  ctx.lineTo(16, 78);
  ctx.moveTo(-11, 88);
  ctx.lineTo(11, 88);
  ctx.stroke();

  // Subtle light bevel underneath engraved grooves
  ctx.strokeStyle = 'rgba(255, 248, 200, 0.6)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.moveTo(-16, 80.2);
  ctx.lineTo(16, 80.2);
  ctx.moveTo(-11, 90.2);
  ctx.lineTo(11, 90.2);
  ctx.stroke();

  // Twinkling corner glints
  const sp = 0.5 + 0.5 * Math.sin(t * 3.2);
  drawSparkle(ctx, -28, 26, 5.5 + sp * 2.5, '#ffffff', 0.55 + sp * 0.45);
  drawSparkle(ctx, 29, 96, 4.5 + (1 - sp) * 2.5, '#fff7bd', 0.45 + (1 - sp) * 0.45);

  ctx.restore();
}

function drawGoldenCollar(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 2.0) * 1.8;
  ctx.save();
  ctx.translate(100, 102 + bob);

  // Soft ground shadow
  ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
  ctx.beginPath();
  ctx.ellipse(0, 48, 58, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // Back inner gold band (deeper antique gold for 3D interior depth)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 27;
  ctx.beginPath();
  ctx.ellipse(0, -2, 56, 33, 0, Math.PI, Math.PI * 2);
  ctx.stroke();

  const backGold = ctx.createLinearGradient(-58, -36, 58, -2);
  backGold.addColorStop(0, '#c67d18');
  backGold.addColorStop(0.5, '#9d5d0f');
  backGold.addColorStop(1, '#c67d18');
  ctx.strokeStyle = backGold;
  ctx.lineWidth = 19;
  ctx.stroke();

  // Subtle top bevel rim on back arc
  ctx.strokeStyle = '#ffe588';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.ellipse(0, -10.5, 56, 31, 0, Math.PI + 0.06, Math.PI * 2 - 0.06);
  ctx.stroke();

  // Front full-gold collar band (chunky 24k sculpted gold)
  ctx.strokeStyle = INK;
  ctx.lineWidth = 30;
  ctx.beginPath();
  ctx.ellipse(0, 4, 56, 34, 0, 0.02, Math.PI - 0.02);
  ctx.stroke();

  const frontGold = ctx.createLinearGradient(-60, -6, 60, 42);
  frontGold.addColorStop(0, '#ffe47a');
  frontGold.addColorStop(0.28, '#ffd046');
  frontGold.addColorStop(0.58, '#f0a622');
  frontGold.addColorStop(0.84, '#ffd75e');
  frontGold.addColorStop(1, '#c97b16');
  ctx.strokeStyle = frontGold;
  ctx.lineWidth = 22;
  ctx.stroke();

  // Raised polished gold upper & lower rails along the front curve
  ctx.strokeStyle = '#fff5b8';
  ctx.lineWidth = 3.4;
  ctx.beginPath();
  ctx.ellipse(0, -5.5, 56, 33, 0, 0.08, Math.PI - 0.08);
  ctx.stroke();

  ctx.strokeStyle = '#b96e12';
  ctx.lineWidth = 3.0;
  ctx.beginPath();
  ctx.ellipse(0, 14.5, 56, 33, 0, 0.08, Math.PI - 0.08);
  ctx.stroke();

  // Glossy specular sheen arc on front-left gold surface
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.62)';
  ctx.lineWidth = 3.8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.ellipse(0, 2, 56, 33, 0, Math.PI * 0.56, Math.PI * 0.84);
  ctx.stroke();

  // Sculpted solid-gold pyramid/dome rivets along the collar band (no dangling tag)
  const rivets: Array<[number, number]> = [
    [-40, 24],
    [-20, 35],
    [2, 38]
  ];
  for (const [rx, ry] of rivets) {
    ctx.beginPath();
    ctx.arc(rx, ry, 5.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffe985';
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(rx - 1.5, ry - 1.5, 1.8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // Polished solid-gold buckle frame + keeper loop on front-right
  ctx.save();
  ctx.translate(33, 25);
  ctx.rotate(-0.46);

  // Gold keeper loop beside buckle
  drawRoundedRect(ctx, -23, -13, 9, 26, 4);
  ctx.fillStyle = '#f5b332';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Main chunky gold buckle frame
  drawRoundedRect(ctx, -13, -16, 26, 32, 9);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = '#ffe169';
  ctx.lineWidth = 4.8;
  ctx.stroke();

  // Buckle prong across center
  ctx.strokeStyle = INK;
  ctx.lineWidth = 5.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-11, 0);
  ctx.lineTo(11, 0);
  ctx.stroke();
  ctx.strokeStyle = '#fff2a8';
  ctx.lineWidth = 2.4;
  ctx.stroke();
  ctx.restore();

  // Twinkling gold sparkles along the collar rim
  const sp1 = 0.5 + 0.5 * Math.sin(t * 3.1);
  const sp2 = 0.5 + 0.5 * Math.sin(t * 3.1 + 1.9);
  drawSparkle(ctx, -44, -6, 6 + sp1 * 3, '#fff9c4', 0.55 + sp1 * 0.45);
  drawSparkle(ctx, 42, 16, 5.5 + sp2 * 3, '#ffffff', 0.5 + sp2 * 0.5);

  ctx.restore();
}

function drawDiamondBowl(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 2.0) * 1.8;
  ctx.save();
  ctx.translate(100, 114 + bob);

  // Soft icy glow
  const glow = ctx.createRadialGradient(0, -10, 6, 0, -4, 72);
  glow.addColorStop(0, 'rgba(130, 240, 255, 0.34)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(-75, -75, 150, 130);

  // Outer faceted bowl trapezoid
  const bowlGrad = ctx.createLinearGradient(-64, -18, 64, 42);
  bowlGrad.addColorStop(0, '#e8ffff');
  bowlGrad.addColorStop(0.35, '#8eeaff');
  bowlGrad.addColorStop(0.75, '#42c4f5');
  bowlGrad.addColorStop(1, '#2691d9');
  ctx.fillStyle = bowlGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-48, -18);
  ctx.lineTo(48, -18);
  ctx.lineTo(64, 30);
  ctx.quadraticCurveTo(0, 48, -64, 30);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Crystal facet lines & bright specular planes
  ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
  ctx.beginPath();
  ctx.moveTo(-48, -18);
  ctx.lineTo(-22, -12);
  ctx.lineTo(-32, 36);
  ctx.lineTo(-64, 30);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.beginPath();
  ctx.moveTo(22, -12);
  ctx.lineTo(48, -18);
  ctx.lineTo(64, 30);
  ctx.lineTo(32, 36);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = '#2570b5';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-22, -12);
  ctx.lineTo(-30, 36);
  ctx.moveTo(22, -12);
  ctx.lineTo(30, 36);
  ctx.stroke();

  // Top crystal rim ellipse
  ctx.beginPath();
  ctx.ellipse(0, -18, 48, 15, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#c8f8ff';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.8;
  ctx.stroke();

  // Inner bowl hollow
  const innerGrad = ctx.createLinearGradient(0, -28, 0, -6);
  innerGrad.addColorStop(0, '#3aaae6');
  innerGrad.addColorStop(1, '#9ef0ff');
  ctx.beginPath();
  ctx.ellipse(0, -18, 36, 9.5, 0, 0, Math.PI * 2);
  ctx.fillStyle = innerGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.8;
  ctx.stroke();

  // Golden paw crest on front crystal facet
  drawPaw(ctx, 0, 14, 1.2, '#ffd55a', '#7c440e', 2.4);

  // Floating twinkling diamond stars above bowl
  const sp1 = 0.5 + 0.5 * Math.sin(t * 3.4);
  const sp2 = 0.5 + 0.5 * Math.sin(t * 3.4 + 1.8);
  drawSparkle(ctx, -10, -48 - sp1 * 4, 9 + sp1 * 3, '#fff9c4', 0.95);
  drawSparkle(ctx, 18, -54 - sp2 * 4, 7 + sp2 * 2.5, '#b8f7ff', 0.9);
  drawSparkle(ctx, 42, -18, 8 * sp1 + 4, '#ffffff', 0.95);

  ctx.restore();
}

function drawMysticToy(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 2.4) * 3.5;
  ctx.save();
  ctx.translate(100, 100 + bob);

  // Magical turquoise/violet aura
  const aura = ctx.createRadialGradient(0, 0, 10, 0, 0, 72);
  aura.addColorStop(0, 'rgba(130, 255, 224, 0.34)');
  aura.addColorStop(0.55, 'rgba(182, 118, 255, 0.24)');
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(-75, -75, 150, 150);

  // Plump glowing lavender HUD-style magic chew bone
  ctx.save();
  ctx.rotate(-0.68);
  drawHudStyleBone(ctx, {
    x: 0,
    y: 0,
    width: 132,
    rot: 0,
    fill: '#f0bfff',
    fillBottom: '#9347e0',
    rim: '#6c2bd9',
    shade: '#7c3aed',
    shine: '#fceeff',
    outlineScale: 0.46
  });

  // Glowing mint-aqua runes & stars etched on bone
  const runeGlow = 0.72 + 0.28 * Math.sin(t * 3.5);
  ctx.save();
  ctx.globalAlpha = runeGlow;
  drawSparkle(ctx, 0, 0, 11.5, '#7efce0', 1);
  drawSparkle(ctx, -45, -18, 6.5, '#a8ffec', 0.95);
  drawSparkle(ctx, 45, 18, 6.5, '#a8ffec', 0.95);
  ctx.strokeStyle = '#7efce0';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(-22, 4, 6.5, 0.2, Math.PI * 1.45);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(22, -4, 6.5, Math.PI + 0.2, Math.PI * 2.45);
  ctx.stroke();
  ctx.restore();
  ctx.restore();

  // Orbiting little stars
  for (let i = 0; i < 4; i++) {
    const a = t * 1.1 + (i * Math.PI) / 2;
    const ox = Math.cos(a) * 62;
    const oy = Math.sin(a) * 48;
    drawSparkle(ctx, ox, oy, 6.5, i % 2 === 0 ? '#7efce0' : '#ffeaa7', 0.85);
  }

  ctx.restore();
}

function drawStarlightWhistle(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 2.2) * 2;
  ctx.save();
  ctx.translate(100, 112 + bob);

  // Swirling musical starlight ribbon floating upward from whistle
  ctx.save();
  const ribbonGrad = ctx.createLinearGradient(16, -24, -10, -86);
  ribbonGrad.addColorStop(0, 'rgba(116, 235, 255, 0.72)');
  ribbonGrad.addColorStop(0.55, 'rgba(255, 234, 167, 0.62)');
  ribbonGrad.addColorStop(1, 'rgba(116, 235, 255, 0)');
  ctx.strokeStyle = ribbonGrad;
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(18, -22);
  ctx.bezierCurveTo(56, -42, 10, -64, -12, -74);
  ctx.bezierCurveTo(-28, -80, -14, -92, 8, -94);
  ctx.stroke();

  // Twinkling stardust along the swirl
  for (let i = 0; i < 6; i++) {
    const u = ((t * 0.45 + i / 6) % 1);
    const sx = 20 + Math.sin(u * Math.PI * 2.3) * 24 - u * 26;
    const sy = -24 - u * 68;
    drawSparkle(ctx, sx, sy, 4.5 + (1 - u) * 3.5, i % 2 === 0 ? '#ffeaa7' : '#8ef6ff', 1 - u * 0.5);
  }
  ctx.restore();

  // Lanyard loop & dangling golden star charm
  const charmSwing = Math.sin(t * 2.6) * 0.14;
  ctx.save();
  ctx.translate(-34, -16);
  ctx.rotate(charmSwing);
  ctx.strokeStyle = '#b9c9e8';
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.moveTo(10, 0);
  ctx.quadraticCurveTo(-12, 6, -12, 22);
  ctx.stroke();

  ctx.fillStyle = '#ffe066';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 14 : 6.5;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = -12 + Math.cos(a) * r;
    const py = 28 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Sleek silver & sapphire whistle body
  ctx.save();
  ctx.rotate(0.45);
  const bodyGrad = ctx.createLinearGradient(-32, -26, 48, 22);
  bodyGrad.addColorStop(0, '#f4f9ff');
  bodyGrad.addColorStop(0.5, '#b6ccf0');
  bodyGrad.addColorStop(1, '#7997cc');
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.arc(-10, 0, 26, Math.PI * 0.45, Math.PI * 1.72);
  ctx.lineTo(44, -14);
  ctx.lineTo(48, 8);
  ctx.lineTo(8, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Sapphire side inlay
  ctx.beginPath();
  ctx.arc(-10, 0, 14.5, 0, Math.PI * 2);
  ctx.fillStyle = '#2d7ff9';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Whistle sound slot
  drawRoundedRect(ctx, 16, -15, 16, 7, 2);
  ctx.fillStyle = '#1b1438';
  ctx.fill();

  // Glossy specular shine
  ctx.fillStyle = 'rgba(255,255,255,0.72)';
  ctx.beginPath();
  ctx.arc(-14, -5, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function drawBoneLantern(ctx: CanvasRenderingContext2D, t: number): void {
  const flicker = 0.88 + 0.12 * Math.sin(t * 7.2) + 0.05 * Math.sin(t * 13);
  ctx.save();
  ctx.translate(100, 102);

  // Warm golden lantern halo
  const halo = ctx.createRadialGradient(0, 8, 6, 0, 8, 76 * flicker);
  halo.addColorStop(0, 'rgba(255, 224, 118, 0.44)');
  halo.addColorStop(0.55, 'rgba(243, 156, 18, 0.16)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo;
  ctx.fillRect(-82, -74, 164, 160);

  // Top carrying ring
  ctx.strokeStyle = INK;
  ctx.lineWidth = 9.5;
  ctx.beginPath();
  ctx.arc(0, -60, 11, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffd15c';
  ctx.lineWidth = 4.5;
  ctx.stroke();

  // Glass cylinder body
  const glassGrad = ctx.createRadialGradient(0, 8, 6, 0, 8, 44);
  glassGrad.addColorStop(0, `rgba(255, 246, 188, ${0.82 * flicker})`);
  glassGrad.addColorStop(0.55, `rgba(255, 198, 92, ${0.42 * flicker})`);
  glassGrad.addColorStop(1, 'rgba(130, 156, 200, 0.28)');
  ctx.fillStyle = glassGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.moveTo(-34, -28);
  ctx.quadraticCurveTo(-44, 10, -30, 44);
  ctx.lineTo(30, 44);
  ctx.quadraticCurveTo(44, 10, 34, -28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Glowing levitating HUD Magic Bone flame inside!
  const flameBob = Math.sin(t * 3.6) * 2.8;
  drawHudStyleBone(ctx, {
    x: 0,
    y: 8 + flameBob,
    width: 40,
    rot: -1.08 + Math.sin(t * 2.5) * 0.08,
    ...HUD_BONE_PRESETS.magic,
    glowColor: '#ffe066',
    glowBlur: 12
  });

  // Brass vertical cage ribs
  ctx.strokeStyle = INK;
  ctx.lineWidth = 7.5;
  ctx.beginPath();
  ctx.moveTo(-19, -28);
  ctx.quadraticCurveTo(-24, 10, -17, 44);
  ctx.moveTo(19, -28);
  ctx.quadraticCurveTo(24, 10, 17, 44);
  ctx.stroke();
  ctx.strokeStyle = '#f1b43c';
  ctx.lineWidth = 3.5;
  ctx.stroke();

  // Brass domed cap
  const brassGrad = ctx.createLinearGradient(-42, -52, 42, -26);
  brassGrad.addColorStop(0, '#fff099');
  brassGrad.addColorStop(0.5, '#e8a229');
  brassGrad.addColorStop(1, '#a96215');
  ctx.fillStyle = brassGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.8;
  ctx.beginPath();
  ctx.moveTo(-40, -28);
  ctx.bezierCurveTo(-34, -56, 34, -56, 40, -28);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  drawRoundedRect(ctx, -42, -32, 84, 10, 5);
  ctx.fill();
  ctx.stroke();

  // Brass base pedestal
  drawRoundedRect(ctx, -36, 42, 72, 12, 6);
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, -28, 52, 56, 10, 5);
  ctx.fill();
  ctx.stroke();

  // Floating firefly sparks around lantern
  for (let i = 0; i < 4; i++) {
    const a = t * 1.3 + i * 1.57;
    const fx = Math.cos(a) * (50 + (i % 2) * 8);
    const fy = 4 + Math.sin(a * 1.4) * 26;
    ctx.fillStyle = '#ffe588';
    ctx.beginPath();
    ctx.arc(fx, fy, 2.8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawGoodBoyStash(ctx: CanvasRenderingContext2D, t: number): void {
  const glowPulse = 0.85 + 0.15 * Math.sin(t * 3.0);
  ctx.save();
  ctx.translate(100, 114);

  // Open curved chest lid behind
  ctx.save();
  ctx.translate(0, -18);
  ctx.rotate(-0.18);
  const lidGrad = ctx.createLinearGradient(-50, -44, 50, 0);
  lidGrad.addColorStop(0, '#c87e3a');
  lidGrad.addColorStop(1, '#7f471c');
  ctx.fillStyle = lidGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-52, 0);
  ctx.bezierCurveTo(-48, -44, 48, -44, 52, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Gold lid trim band
  ctx.strokeStyle = '#ffd15c';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(-48, -2);
  ctx.lineTo(48, -2);
  ctx.stroke();
  ctx.restore();

  // Warm golden inner light spilling out
  const rad = ctx.createRadialGradient(0, -12, 6, 0, -16, 56 * glowPulse);
  rad.addColorStop(0, 'rgba(255, 240, 150, 0.9)');
  rad.addColorStop(0.55, 'rgba(255, 196, 61, 0.35)');
  rad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rad;
  ctx.fillRect(-66, -72, 132, 80);

  // Overflowing HUD Magic Bones & HUD Regular Bones!
  drawHudStyleBone(ctx, {
    x: -20,
    y: -24 + Math.sin(t * 2.8) * 1.8,
    width: 46,
    rot: -1.05,
    ...HUD_BONE_PRESETS.magic,
    glowColor: '#ffe066',
    glowBlur: 10
  });
  drawHudStyleBone(ctx, {
    x: 18,
    y: -22 + Math.cos(t * 2.8) * 1.8,
    width: 46,
    rot: 0.95,
    ...HUD_BONE_PRESETS.magic,
    glowColor: '#ffe066',
    glowBlur: 10
  });
  drawHudStyleBone(ctx, { x: -32, y: -9, width: 38, rot: -0.35, ...HUD_BONE_PRESETS.regular });
  drawHudStyleBone(ctx, { x: 30, y: -9, width: 38, rot: 0.35, ...HUD_BONE_PRESETS.regular });
  drawHudStyleBone(ctx, { x: 0, y: -11, width: 42, rot: 0.05, ...HUD_BONE_PRESETS.magic });

  // Wooden chest front base
  const boxGrad = ctx.createLinearGradient(-56, -4, 56, 48);
  boxGrad.addColorStop(0, '#b96f32');
  boxGrad.addColorStop(1, '#6f3b16');
  drawRoundedRect(ctx, -54, -4, 108, 52, 10);
  ctx.fillStyle = boxGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Wood planks
  ctx.strokeStyle = 'rgba(46, 23, 12, 0.45)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-50, 14);
  ctx.lineTo(50, 14);
  ctx.moveTo(-50, 30);
  ctx.lineTo(50, 30);
  ctx.stroke();

  // Gold corner straps & top rim
  ctx.fillStyle = '#ffd15c';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  drawRoundedRect(ctx, -56, -8, 112, 12, 5);
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, -54, 34, 16, 14, 4);
  ctx.fill();
  ctx.stroke();
  drawRoundedRect(ctx, 38, 34, 16, 14, 4);
  ctx.fill();
  ctx.stroke();

  // Golden keyhole clasp
  drawRoundedRect(ctx, -11, -10, 22, 24, 8);
  ctx.fillStyle = '#ffe588';
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-1.8, 1, 3.6, 7);

  ctx.restore();
}

function drawSunLeash(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 2.2) * 2;
  ctx.save();
  ctx.translate(100, 96 + bob);

  // Coiled sunlit leather rings (spiral stack)
  const coils: Array<[number, number, string]> = [
    [54, 35, '#df7d1c'],
    [40, 25, '#f29e2e'],
    [26, 16, '#ffb938'],
    [13, 8, '#ffd85e']
  ];
  for (const [rx, ry, col] of coils) {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, -0.08, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = col;
    ctx.lineWidth = 8;
    ctx.stroke();
  }

  // Highlight stitches on outer coil
  ctx.strokeStyle = 'rgba(255, 250, 204, 0.65)';
  ctx.lineWidth = 2.2;
  ctx.setLineDash([5, 6]);
  ctx.beginPath();
  ctx.ellipse(0, 0, 54, 35, -0.08, 0.2, Math.PI * 1.15);
  ctx.stroke();
  ctx.setLineDash([]);

  // Sunburst gold clasp medallion at bottom
  ctx.save();
  ctx.translate(4, 40);
  // Subtle rotating sunburst rays
  ctx.save();
  ctx.rotate(t * 0.65);
  ctx.fillStyle = '#ffd54f';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const r = i % 2 === 0 ? 25 : 15;
    const a = (i * Math.PI) / 8;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // Center sun gem
  const sunGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, 14);
  sunGrad.addColorStop(0, '#fffef2');
  sunGrad.addColorStop(0.55, '#ffe066');
  sunGrad.addColorStop(1, '#f39c12');
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fillStyle = sunGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

function drawMoonstoneBell(ctx: CanvasRenderingContext2D, t: number): void {
  const chime = Math.sin(t * 2.5) * 0.08;
  ctx.save();
  ctx.translate(100, 62);
  ctx.rotate(chime);

  // Golden ribbon loop at top
  ctx.strokeStyle = INK;
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.ellipse(4, -18, 12, 20, 0.22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#ffd85e';
  ctx.lineWidth = 6.5;
  ctx.stroke();

  // Bell body (plump opalescent moonstone sphere)
  ctx.translate(0, 50);
  const bellGrad = ctx.createRadialGradient(-16, -18, 8, 0, 4, 58);
  bellGrad.addColorStop(0, '#f4fdff');
  bellGrad.addColorStop(0.45, '#b6e6ff');
  bellGrad.addColorStop(0.78, '#c8b6ff');
  bellGrad.addColorStop(1, '#9890e8');
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fillStyle = bellGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Center raised equatorial ridge
  ctx.beginPath();
  ctx.ellipse(0, 4, 50, 11, 0.1, 0, Math.PI * 2);
  ctx.fillStyle = '#d6f3ff';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.6;
  ctx.stroke();

  // Moonstone crescent engraving
  ctx.fillStyle = '#6c73c7';
  ctx.beginPath();
  ctx.arc(-2, -16, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#c4eaff';
  ctx.beginPath();
  ctx.arc(2, -18, 6.8, 0, Math.PI * 2);
  ctx.fill();

  // Bell keyhole slit & golden clapper ball
  ctx.fillStyle = '#4e4884';
  ctx.beginPath();
  ctx.arc(-8, 22, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-11, 24, 6, 18);
  ctx.beginPath();
  ctx.arc(-8, 43, 7, 0, Math.PI * 2);
  ctx.fillStyle = '#ffd55a';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.8;
  ctx.stroke();

  // Ribbon knot & tail
  ctx.fillStyle = '#ffd55a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(8, -46);
  ctx.lineTo(22, -16);
  ctx.lineTo(13, -12);
  ctx.lineTo(2, -40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(4, -44, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Glossy specular dot
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.beginPath();
  ctx.ellipse(-20, -20, 9, 5.5, -0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Floating pastel pink cozy hearts & moons around bell
  const h1 = Math.sin(t * 2.2) * 3;
  const h2 = Math.cos(t * 2.2) * 3;
  drawHeart(ctx, 36, 94 + h1, 0.85, '#ff9eb5', INK, 2.4);
  drawHeart(ctx, 166, 102 + h2, 0.78, '#ffb3c6', INK, 2.4);
  drawHeart(ctx, 148, 154 - h1, 0.65, '#ff9eb5', INK, 2.4);
  drawSparkle(ctx, 42, 146 - h2, 7.5, '#ffeaa7', 0.9);
}

function drawInfiniteChest(ctx: CanvasRenderingContext2D, t: number): void {
  const pulse = 0.88 + 0.12 * Math.sin(t * 3.0);
  ctx.save();
  ctx.translate(100, 120);

  // Joyful rainbow light beam shooting out upper-right
  ctx.save();
  ctx.globalAlpha = 0.72 * pulse;
  const bands = ['#ff6b6b', '#ffd166', '#55efc4', '#54a0ff', '#c56cf0'];
  bands.forEach((col, idx) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(-6 + idx * 7, -14);
    ctx.lineTo(4 + idx * 7, -14);
    ctx.lineTo(66 + idx * 12, -120);
    ctx.lineTo(52 + idx * 12, -120);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();

  // Open ornate violet-and-gold lid
  ctx.save();
  ctx.translate(-8, -22);
  ctx.rotate(-0.34);
  const lidGrad = ctx.createLinearGradient(-46, -42, 46, 0);
  lidGrad.addColorStop(0, '#9b6bff');
  lidGrad.addColorStop(1, '#5833b8');
  ctx.fillStyle = lidGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-48, 0);
  ctx.bezierCurveTo(-44, -44, 44, -44, 48, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#ffd15c';
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(-46, -2);
  ctx.lineTo(46, -2);
  ctx.stroke();
  ctx.restore();

  // Glowing HUD Magic Bone & Regular Bone peeking behind the toys
  drawHudStyleBone(ctx, {
    x: -20,
    y: -28,
    width: 44,
    rot: -0.85,
    ...HUD_BONE_PRESETS.magic,
    glowColor: '#ffe066',
    glowBlur: 10
  });
  drawHudStyleBone(ctx, {
    x: 18,
    y: -32,
    width: 44,
    rot: 0.72,
    ...HUD_BONE_PRESETS.regular
  });

  // PupperPark's own Tennis Ball (left)
  ctx.save();
  ctx.translate(-26, -12 + Math.sin(t * 3) * 1.6);
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fillStyle = '#a3e635';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(-10, 0, 11, -0.9, 0.9);
  ctx.stroke();
  ctx.restore();

  // PupperPark's own Coral Frisbee (right)
  ctx.save();
  ctx.translate(28, -14);
  ctx.rotate(-0.45);
  ctx.beginPath();
  ctx.ellipse(0, 0, 21, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ff7675';
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.stroke();
  ctx.strokeStyle = '#ffb8b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -1, 13, 6.5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // PupperPark's own Yellow Rubber Ducky (center!)
  ctx.save();
  ctx.translate(2, -14 + Math.sin(t * 3.4 + 1) * 2.2);
  // Body
  ctx.fillStyle = '#ffd93d';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.ellipse(3, 8, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Head
  ctx.beginPath();
  ctx.arc(-2, -6, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Orange beak
  ctx.fillStyle = '#ff7f2a';
  ctx.beginPath();
  ctx.ellipse(-13, -4, 6, 3.6, -0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Cute eye
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(-5, -8, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Ornate violet-and-gold chest base
  const chestGrad = ctx.createLinearGradient(-56, -2, 56, 48);
  chestGrad.addColorStop(0, '#8854d0');
  chestGrad.addColorStop(1, '#4b2882');
  drawRoundedRect(ctx, -56, -2, 112, 50, 12);
  ctx.fillStyle = chestGrad;
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.stroke();

  // Gold top rim & star medallion
  drawRoundedRect(ctx, -58, -6, 116, 11, 5);
  ctx.fillStyle = '#ffd15c';
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffe588';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 15 : 7;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = Math.cos(a) * r;
    const py = 12 + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawFirstPupCrown(ctx: CanvasRenderingContext2D, t: number): void {
  const bob = Math.sin(t * 2.1) * 2.4;
  const starPulse = 1 + Math.sin(t * 3.6) * 0.08;
  ctx.save();
  ctx.translate(100, 110 + bob);

  // Royal golden velvet cushion dome inside crown
  const cushionGrad = ctx.createRadialGradient(0, -14, 6, 0, -4, 48);
  cushionGrad.addColorStop(0, '#ffe97d');
  cushionGrad.addColorStop(1, '#d98a1c');
  ctx.fillStyle = cushionGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.6;
  ctx.beginPath();
  ctx.ellipse(0, -6, 46, 30, 0, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Rose-gold arched crown ribs
  ctx.strokeStyle = INK;
  ctx.lineWidth = 13;
  ctx.beginPath();
  ctx.moveTo(-54, 10);
  ctx.bezierCurveTo(-66, -42, -24, -48, 0, -34);
  ctx.moveTo(54, 10);
  ctx.bezierCurveTo(66, -42, 24, -48, 0, -34);
  ctx.stroke();

  ctx.strokeStyle = '#f5a3a9';
  ctx.lineWidth = 6.5;
  ctx.stroke();

  // Main chunky gold crown band & peaks
  const bandGrad = ctx.createLinearGradient(-60, -18, 60, 34);
  bandGrad.addColorStop(0, '#fff2a6');
  bandGrad.addColorStop(0.5, '#ffd04c');
  bandGrad.addColorStop(1, '#e18b27');
  ctx.fillStyle = bandGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-56, 8);
  ctx.lineTo(-42, -16);
  ctx.lineTo(-22, -2);
  ctx.lineTo(0, -28);
  ctx.lineTo(22, -2);
  ctx.lineTo(42, -16);
  ctx.lineTo(56, 8);
  ctx.lineTo(52, 34);
  ctx.quadraticCurveTo(0, 48, -52, 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rose-gold lower band stripe
  ctx.fillStyle = '#e88b99';
  ctx.beginPath();
  ctx.moveTo(-53, 14);
  ctx.quadraticCurveTo(0, 26, 53, 14);
  ctx.lineTo(51, 29);
  ctx.quadraticCurveTo(0, 41, -51, 29);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.8;
  ctx.stroke();

  // Pink heart gems along band
  drawHeart(ctx, 0, 26, 0.95, '#ff5ca8', INK, 2.4);
  drawHeart(ctx, -31, 22, 0.72, '#ff74b8', INK, 2.4);
  drawHeart(ctx, 31, 22, 0.72, '#ff74b8', INK, 2.4);

  // Central golden paw crest
  drawPaw(ctx, 0, 2, 0.76, '#f6b93b', '#87480c', 2.4);

  // Radiant star diamond crowning the peak!
  ctx.save();
  ctx.translate(0, -40);
  ctx.scale(starPulse, starPulse);
  ctx.shadowColor = '#ff79c6';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffd1f2';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const r = i % 2 === 0 ? 22 : 9.5;
    const a = -Math.PI / 2 + (i * Math.PI) / 4;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.stroke();

  drawSparkle(ctx, 0, 0, 12, '#ffffff', 0.95);
  ctx.restore();

  ctx.restore();
}

export function drawTreasureArt(
  ctx: CanvasRenderingContext2D,
  relicId: string,
  size: number,
  timeSec: number,
  rarity: TreasureRarity
): void {
  const s = size / 200;
  ctx.save();
  ctx.scale(s, s);
  drawBackdrop(ctx, rarity, timeSec);

  switch (relicId) {
    case 'bp_1':
      drawMuddyMap(ctx, timeSec);
      break;
    case 'bp_2':
      drawLostCompass(ctx, timeSec);
      break;
    case 'bp_3':
      drawTreatPouch(ctx, timeSec);
      break;
    case 'sp_1':
      drawSturdyShovel(ctx, timeSec);
      break;
    case 'gp_1':
      drawBiscuitTin(ctx, timeSec);
      break;
    case 'bp_4':
      drawGoldenTag(ctx, timeSec);
      break;
    case 'bp_5':
      drawGoldenCollar(ctx, timeSec);
      break;
    case 'bp_6':
      drawDiamondBowl(ctx, timeSec);
      break;
    case 'mp_1':
      drawMysticToy(ctx, timeSec);
      break;
    case 'xp_1':
      drawStarlightWhistle(ctx, timeSec);
      break;
    case 'tr_1':
      drawBoneLantern(ctx, timeSec);
      break;
    case 'mp_2':
      drawGoodBoyStash(ctx, timeSec);
      break;
    case 'sp_2':
      drawSunLeash(ctx, timeSec);
      break;
    case 'hp_1':
      drawMoonstoneBell(ctx, timeSec);
      break;
    case 'myth_1':
      drawInfiniteChest(ctx, timeSec);
      break;
    case 'myth_2':
      drawFirstPupCrown(ctx, timeSec);
      break;
    default:
      drawGoldenTag(ctx, timeSec);
      break;
  }

  ctx.restore();
}

export function renderTreasureCanvasFrame(
  canvas: HTMLCanvasElement,
  relicId: string,
  rarity: TreasureRarity,
  logicalSize: number,
  timeSec = 0.6
): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pixelSize = Math.max(64, Math.round(logicalSize * dpr));
  if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
    canvas.width = pixelSize;
    canvas.height = pixelSize;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const scale = pixelSize / logicalSize;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, logicalSize, logicalSize);
  drawTreasureArt(ctx, relicId, logicalSize, timeSec, rarity);
}

/* Lightweight shared animation driver for open treasure modals */
interface AnimatedEntry {
  canvas: HTMLCanvasElement;
  relicId: string;
  rarity: TreasureRarity;
  logicalSize: number;
}

const animatedEntries = new Set<AnimatedEntry>();
let animRafId: number | null = null;
let animStartTime = 0;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function tickAnimatedTreasures(now: number): void {
  animRafId = null;
  if (animatedEntries.size === 0) return;

  const t = (now - animStartTime) / 1000;
  for (const entry of Array.from(animatedEntries)) {
    if (!entry.canvas.isConnected) {
      animatedEntries.delete(entry);
      continue;
    }
    renderTreasureCanvasFrame(entry.canvas, entry.relicId, entry.rarity, entry.logicalSize, t);
  }

  if (animatedEntries.size > 0 && !prefersReducedMotion()) {
    animRafId = window.requestAnimationFrame(tickAnimatedTreasures);
  }
}

export function startAnimatedTreasureCanvas(
  canvas: HTMLCanvasElement,
  relicId: string,
  rarity: TreasureRarity,
  logicalSize: number
): () => void {
  const entry: AnimatedEntry = { canvas, relicId, rarity, logicalSize };
  renderTreasureCanvasFrame(canvas, relicId, rarity, logicalSize, 0.5);

  if (prefersReducedMotion()) {
    return () => {
      // Static frame rendered for reduced motion
    };
  }

  if (animatedEntries.size === 0) {
    animStartTime = performance.now();
  }
  animatedEntries.add(entry);

  if (animRafId === null) {
    animRafId = window.requestAnimationFrame(tickAnimatedTreasures);
  }

  return () => {
    animatedEntries.delete(entry);
    if (animatedEntries.size === 0 && animRafId !== null) {
      window.cancelAnimationFrame(animRafId);
      animRafId = null;
    }
  };
}
