export interface DogRenderParams {
  breed: string;
  isShiny: boolean;
  shinyColor: string;
  isSleeping: boolean;
  isBlinking: boolean;
  isJoyful: boolean;
  showTongue: boolean;
  legSwing: number;
  sleepBreath: number;
  wagPhase: number;
  animPhase: number;
  moodWagAmp: number;
  tailWag: number;
  earBounce: number;
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

export function shadeHex(hex: string, amount: number): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return hex;
  const num = parseInt(cleaned, 16);
  if (Number.isNaN(num)) return hex;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  if (amount >= 0) {
    const nr = clampByte(r + (255 - r) * amount);
    const ng = clampByte(g + (255 - g) * amount);
    const nb = clampByte(b + (255 - b) * amount);
    return `rgb(${nr}, ${ng}, ${nb})`;
  }
  const f = 1 + amount;
  // Blend gently toward deep warm indigo-brown shadow instead of flat black
  const nr = clampByte(r * f + 14 * -amount * 0.45);
  const ng = clampByte(g * f + 10 * -amount * 0.45);
  const nb = clampByte(b * f + 22 * -amount * 0.55);
  return `rgb(${nr}, ${ng}, ${nb})`;
}

const SOFT_OUTLINE = 'rgba(24, 18, 30, 0.28)';

function fillShadedEllipse(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rot: number,
  topCol: string,
  botCol: string,
  strokeCol: string | null = SOFT_OUTLINE
): void {
  const g = c.createLinearGradient(cx, cy - ry, cx, cy + ry);
  g.addColorStop(0, topCol);
  g.addColorStop(1, botCol);
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2);
  c.fill();
  if (strokeCol) {
    c.strokeStyle = strokeCol;
    c.lineWidth = 0.9;
    c.stroke();
  }
}

interface LegOptions {
  bandColor?: string;
  bandStartRatio?: number;
  bandEndRatio?: number;
  spotColor?: string;
  featherColor?: string;
  outlineColor?: string;
}

function drawRoundedLeg(
  c: CanvasRenderingContext2D,
  x: number,
  yTop: number,
  w: number,
  h: number,
  legCol: string,
  pawCol: string,
  pawH: number,
  opts: LegOptions = {}
): void {
  const halfW = w * 0.5;
  const ankleW = w * 0.4;
  const yBot = yTop + h;

  if (opts.featherColor) {
    c.fillStyle = opts.featherColor;
    c.beginPath();
    c.ellipse(x - halfW * 0.85, yTop + h * 0.45, 1.45, h * 0.36, 0.12, 0, Math.PI * 2);
    c.fill();
  }

  // Tapered capsule leg shaft
  c.fillStyle = legCol;
  c.beginPath();
  c.moveTo(x - halfW, yTop + 1);
  c.quadraticCurveTo(x - halfW, yTop - 1.2, x, yTop - 1.2);
  c.quadraticCurveTo(x + halfW, yTop - 1.2, x + halfW, yTop + 1);
  c.lineTo(x + ankleW, yBot - 1);
  c.quadraticCurveTo(x + ankleW, yBot + 0.8, x, yBot + 0.8);
  c.quadraticCurveTo(x - ankleW, yBot + 0.8, x - ankleW, yBot - 1);
  c.closePath();
  c.fill();

  // Optional mid-leg tricolor/hock band (e.g. Bernese rust or Shepherd upper thigh)
  if (opts.bandColor) {
    const startR = opts.bandStartRatio ?? 0.45;
    const endR = opts.bandEndRatio ?? 0.78;
    const by1 = yTop + h * startR;
    const by2 = yTop + h * endR;
    c.fillStyle = opts.bandColor;
    c.beginPath();
    c.rect(x - ankleW - 0.1, by1, (ankleW + 0.1) * 2, Math.max(1.4, by2 - by1));
    c.fill();
  }

  // Optional Dalmatian leg spot
  if (opts.spotColor) {
    c.fillStyle = opts.spotColor;
    c.beginPath();
    c.arc(x + 0.2, yTop + h * 0.45, 1.15, 0, Math.PI * 2);
    c.fill();
  }

  // Rounded forward-facing paw / sock
  const pawCenterY = yBot - pawH * 0.25;
  c.fillStyle = pawCol;
  c.beginPath();
  c.ellipse(x + 0.9, pawCenterY, ankleW + 1.15, Math.max(1.7, pawH * 0.62), 0, 0, Math.PI * 2);
  c.fill();

  // Subtle silhouette stroke around lower leg & paw
  const outline = opts.outlineColor ?? SOFT_OUTLINE;
  c.strokeStyle = outline;
  c.lineWidth = 0.8;
  c.beginPath();
  c.moveTo(x - halfW, yTop + 1.5);
  c.lineTo(x - ankleW, yBot - 1.2);
  c.quadraticCurveTo(x - ankleW, pawCenterY + 1.6, x + 0.9, pawCenterY + Math.max(1.5, pawH * 0.58));
  c.quadraticCurveTo(x + ankleW + 2.0, pawCenterY + 1.4, x + ankleW + 1.8, pawCenterY - 0.5);
  c.lineTo(x + halfW, yTop + 1.5);
  c.stroke();
}

function drawTuckedSleepPaws(
  c: CanvasRenderingContext2D,
  backX: number,
  frontX: number,
  groundY: number,
  backCol: string,
  frontCol: string
): void {
  // Snug tucked hind paw
  c.fillStyle = backCol;
  c.strokeStyle = SOFT_OUTLINE;
  c.lineWidth = 0.8;
  c.beginPath();
  c.ellipse(backX, groundY, 3.6, 2.0, -0.06, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // Snug tucked front paws side-by-side under chin
  c.fillStyle = shadeHex(frontCol, -0.14);
  c.beginPath();
  c.ellipse(frontX + 2.0, groundY - 0.4, 3.5, 1.85, 0.04, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  c.fillStyle = frontCol;
  c.beginPath();
  c.ellipse(frontX, groundY + 0.3, 3.9, 2.0, 0.05, 0, Math.PI * 2);
  c.fill();
  c.stroke();
}

interface FourLegsConfig {
  backX: number;
  frontX: number;
  yTop: number;
  w: number;
  h: number;
  swing: number;
  legCol: string;
  pawCol: string;
  pawH: number;
  isSleeping: boolean;
  farLegCol?: string;
  farPawCol?: string;
  opts?: LegOptions;
}

function drawFarPairLegs(c: CanvasRenderingContext2D, cfg: FourLegsConfig): void {
  if (cfg.isSleeping) return;
  const farLeg = cfg.farLegCol ?? shadeHex(cfg.legCol, -0.24);
  const farPaw = cfg.farPawCol ?? shadeHex(cfg.pawCol, -0.18);
  const farOpts: LegOptions = {
    ...cfg.opts,
    bandColor: cfg.opts?.bandColor ? shadeHex(cfg.opts.bandColor, -0.22) : undefined,
    featherColor: cfg.opts?.featherColor ? shadeHex(cfg.opts.featherColor, -0.16) : undefined
  };
  drawRoundedLeg(c, cfg.backX + 2.2 + cfg.swing * 0.85, cfg.yTop - 0.5, cfg.w * 0.92, cfg.h - 0.7, farLeg, farPaw, cfg.pawH, farOpts);
  drawRoundedLeg(c, cfg.frontX + 1.8 - cfg.swing * 0.85, cfg.yTop - 0.5, cfg.w * 0.92, cfg.h - 0.7, farLeg, farPaw, cfg.pawH, farOpts);
}

function drawNearPairLegs(c: CanvasRenderingContext2D, cfg: FourLegsConfig): void {
  if (cfg.isSleeping) {
    drawTuckedSleepPaws(c, cfg.backX + 1.5, cfg.frontX + 3.0, 2.2, cfg.pawCol, cfg.pawCol);
    return;
  }
  drawRoundedLeg(c, cfg.backX - cfg.swing, cfg.yTop, cfg.w, cfg.h, cfg.legCol, cfg.pawCol, cfg.pawH, cfg.opts);
  drawRoundedLeg(c, cfg.frontX + cfg.swing, cfg.yTop, cfg.w, cfg.h, cfg.legCol, cfg.pawCol, cfg.pawH, cfg.opts);
}

function drawGlossyNose(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx = 1.85,
  ry = 1.45,
  color = '#171c24'
): void {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  // Crisp wet-nose specular highlight
  c.fillStyle = 'rgba(255, 255, 255, 0.52)';
  c.beginPath();
  c.ellipse(x - rx * 0.28, y - ry * 0.34, rx * 0.42, ry * 0.28, -0.25, 0, Math.PI * 2);
  c.fill();
}

interface EyeOptions {
  isSleeping: boolean;
  isBlinking: boolean;
  isJoyful: boolean;
  irisColor?: string;
  lidColor?: string;
  radius?: number;
  almond?: boolean;
}

function drawDogEye(c: CanvasRenderingContext2D, x: number, y: number, opts: EyeOptions): void {
  const r = opts.radius ?? 1.65;
  const lid = opts.lidColor ?? '#1c1f26';

  if (opts.isSleeping) {
    c.strokeStyle = lid;
    c.lineWidth = 1.45;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(x, y - 0.2, r * 0.95, 0.16 * Math.PI, 0.84 * Math.PI);
    c.stroke();
    return;
  }

  if (opts.isBlinking) {
    c.strokeStyle = lid;
    c.lineWidth = 1.4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x - r * 0.9, y + 0.1);
    c.quadraticCurveTo(x, y + 0.55, x + r * 0.9, y + 0.1);
    c.stroke();
    return;
  }

  if (opts.isJoyful) {
    c.strokeStyle = lid;
    c.lineWidth = 1.55;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(x, y + 0.65, r * 0.95, 1.15 * Math.PI, 1.85 * Math.PI);
    c.stroke();
    return;
  }

  // Dark outer lash rim
  c.fillStyle = '#15181f';
  c.beginPath();
  if (opts.almond) {
    c.ellipse(x, y, r * 1.15, r * 0.85, -0.1, 0, Math.PI * 2);
  } else {
    c.arc(x, y, r, 0, Math.PI * 2);
  }
  c.fill();

  // Warm iris color (or icy blue for Husky / amber for Shepherd)
  if (opts.irisColor) {
    c.fillStyle = opts.irisColor;
    c.beginPath();
    c.arc(x + 0.08, y, r * 0.76, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#11141a';
    c.beginPath();
    c.arc(x + 0.12, y, r * 0.44, 0, Math.PI * 2);
    c.fill();
  }

  // Primary bright catchlight + secondary tiny glint
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(x + r * 0.26, y - r * 0.3, Math.max(0.45, r * 0.34), 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255, 255, 255, 0.65)';
  c.beginPath();
  c.arc(x - r * 0.24, y + r * 0.28, Math.max(0.28, r * 0.18), 0, Math.PI * 2);
  c.fill();
}

function drawMouthAndTongue(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  isSleeping: boolean,
  isJoyful: boolean,
  showTongue: boolean,
  animPhase: number,
  strokeColor = '#2a2224'
): void {
  if (isSleeping) return;

  // Soft friendly mouth curve
  c.strokeStyle = strokeColor;
  c.lineWidth = 1.05;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - 1.8, y);
  c.quadraticCurveTo(x + 0.2, y + (isJoyful ? 1.55 : 1.05), x + 2.2, y - 0.35);
  c.stroke();

  if (showTongue) {
    const pantBob = Math.sin(animPhase * 3.4) * 0.45;
    c.fillStyle = '#ff7696';
    c.strokeStyle = '#c84b6b';
    c.lineWidth = 0.55;
    c.beginPath();
    c.moveTo(x - 0.5, y + 0.55);
    c.quadraticCurveTo(x - 0.7, y + 3.4 + pantBob, x + 0.85, y + 3.55 + pantBob);
    c.quadraticCurveTo(x + 2.25, y + 3.25 + pantBob, x + 1.85, y + 0.45);
    c.closePath();
    c.fill();
    c.stroke();

    // Subtle pink tongue highlight
    c.fillStyle = 'rgba(255, 224, 232, 0.65)';
    c.beginPath();
    c.ellipse(x + 0.65, y + 1.9 + pantBob * 0.6, 0.45, 0.85, 0.1, 0, Math.PI * 2);
    c.fill();
  }
}

export function drawIllustratedDog(c: CanvasRenderingContext2D, p: DogRenderParams): void {
  const {
    breed,
    isShiny,
    shinyColor,
    isSleeping,
    isBlinking,
    isJoyful,
    showTongue,
    legSwing,
    sleepBreath,
    wagPhase,
    animPhase,
    moodWagAmp,
    tailWag,
    earBounce
  } = p;

  const legH = 10.0;
  const pawH = 3.0;

  // Helper to build harmonious shiny palettes that preserve breed markings
  const sc = (normalHex: string, shinyShift: number): string =>
    isShiny ? shadeHex(shinyColor, shinyShift) : normalHex;

  if (breed === 'aussie') {
    const tanPoints = sc('#cf824b', 0.12);
    const coatDark = sc('#473c38', -0.22);
    const coatMid = sc('#655852', -0.05);
    const merleLight = sc('#8e817b', 0.24);
    const whiteFur = isShiny ? shadeHex(shinyColor, 0.68) : '#faf9f7';

    const legs: FourLegsConfig = {
      backX: -9.2,
      frontX: 8.0,
      yTop: -3.0,
      w: 4.3,
      h: legH,
      swing: legSwing,
      legCol: tanPoints,
      pawCol: whiteFur,
      pawH,
      isSleeping
    };

    drawFarPairLegs(c, legs);

    // Fluffy Aussie bobtail
    c.fillStyle = coatDark;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.85;
    c.beginPath();
    c.arc(isSleeping ? -13.2 : -15.4, (isSleeping ? -5.8 : -10.2) + tailWag, 4.5, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = merleLight;
    c.beginPath();
    c.arc(isSleeping ? -13.6 : -15.8, (isSleeping ? -6.5 : -11.0) + tailWag, 2.3, 0, Math.PI * 2);
    c.fill();

    // Sculpted merle torso
    fillShadedEllipse(
      c,
      -1.2,
      (isSleeping ? -6.6 : -8.8) + sleepBreath * 0.15,
      isSleeping ? 14.2 : 14.8,
      (isSleeping ? 7.8 : 9.0) + sleepBreath * 0.22,
      0,
      coatMid,
      coatDark
    );

    // Layered merle mottling patches
    c.fillStyle = merleLight;
    c.beginPath();
    c.ellipse(-5.2, isSleeping ? -8.6 : -11.0, 6.2, 3.6, -0.18, 0, Math.PI * 2);
    c.ellipse(1.2, isSleeping ? -7.2 : -9.4, 4.5, 3.0, 0.15, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = coatDark;
    c.beginPath();
    c.arc(-7.2, isSleeping ? -8.2 : -10.4, 2.0, 0, Math.PI * 2);
    c.arc(-2.5, isSleeping ? -9.5 : -12.0, 1.8, 0, Math.PI * 2);
    c.fill();

    // Copper-tan flank highlight
    c.fillStyle = tanPoints;
    c.beginPath();
    c.ellipse(2.6, isSleeping ? -4.8 : -6.6, 5.4, 3.2, 0.08, 0, Math.PI * 2);
    c.fill();

    // Plush snowy chest ruff with scalloped fluff
    fillShadedEllipse(c, 8.2, isSleeping ? -6.0 : -8.0, 6.4, 6.8, 0.14, whiteFur, shadeHex('#e6e2dc', 0));
    c.fillStyle = whiteFur;
    c.beginPath();
    c.arc(10.8, isSleeping ? -5.0 : -6.8, 3.5, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    // Far folded Aussie ear
    const headX = isSleeping ? 9.8 : 11.2;
    const headY = isSleeping ? -10.8 : -17.0;
    c.fillStyle = shadeHex(coatDark, -0.2);
    c.beginPath();
    c.moveTo(headX + 1.0, headY - 4.2 + earBounce * 0.5);
    c.quadraticCurveTo(headX + 5.8, headY - 8.2 + earBounce, headX + 6.4, headY - 1.8 + earBounce * 0.4);
    c.closePath();
    c.fill();

    // Round fluffy head
    fillShadedEllipse(c, headX, headY, 7.6, 7.2, 0, coatMid, coatDark);

    // Copper cheek & brow blaze
    c.fillStyle = tanPoints;
    c.beginPath();
    c.ellipse(headX + 1.8, headY + 1.8, 4.3, 3.1, 0.1, 0, Math.PI * 2);
    c.fill();

    // White muzzle & nose bridge blaze
    fillShadedEllipse(c, headX + 5.6, headY + 2.1, 4.9, 3.3, 0.05, whiteFur, '#e7e4de');
    c.fillStyle = whiteFur;
    c.beginPath();
    c.ellipse(headX + 3.4, headY - 0.6, 1.8, 3.2, -0.15, 0, Math.PI * 2);
    c.fill();

    // Near folded triangular Aussie ear
    c.fillStyle = coatDark;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(headX - 4.5, headY - 3.6 + earBounce * 0.4);
    c.quadraticCurveTo(headX - 7.8, headY - 7.2 + earBounce, headX - 5.2, headY + 1.4 + earBounce * 0.6);
    c.quadraticCurveTo(headX - 1.4, headY - 0.4 + earBounce * 0.4, headX - 0.5, headY - 4.4 + earBounce * 0.4);
    c.closePath();
    c.fill();
    c.stroke();

    // Copper eyebrow pip
    c.fillStyle = tanPoints;
    c.beginPath();
    c.ellipse(headX + 3.2, headY - 2.4, 1.5, 1.0, -0.12, 0, Math.PI * 2);
    c.fill();

    drawMouthAndTongue(c, headX + 6.4, headY + 3.4, isSleeping, isJoyful, showTongue, animPhase);
    drawGlossyNose(c, headX + 9.5, headY + 1.4, 1.85, 1.4);
    drawDogEye(c, headX + 3.5, headY - 0.3, { isSleeping, isBlinking, isJoyful, irisColor: '#5c3a21' });
  } else if (breed === 'collie') {
    const coat = sc('#2b3137', -0.2);
    const coatTop = sc('#414a52', 0.02);
    const whiteFur = isShiny ? shadeHex(shinyColor, 0.72) : '#fbfbfc';

    const legs: FourLegsConfig = {
      backX: -9.8,
      frontX: 8.2,
      yTop: -3.2,
      w: 3.9,
      h: legH + 0.4,
      swing: legSwing,
      legCol: coat,
      pawCol: whiteFur,
      pawH,
      isSleeping,
      opts: { featherColor: whiteFur }
    };

    drawFarPairLegs(c, legs);

    // Feathered Collie plume tail with snowy tip
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 2.1) * 3.4 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = coat;
    c.lineWidth = 6.2;
    c.beginPath();
    c.moveTo(-14.2, isSleeping ? -6.2 : -9.4);
    c.quadraticCurveTo(isSleeping ? -18.5 : -22.5, (isSleeping ? -7.2 : -14.2) + wag, isSleeping ? -21.0 : -26.5, (isSleeping ? -4.2 : -8.5) + wag * 0.6);
    c.stroke();
    c.strokeStyle = whiteFur;
    c.lineWidth = 3.2;
    c.beginPath();
    c.moveTo(isSleeping ? -18.0 : -21.2, (isSleeping ? -6.4 : -12.6) + wag * 0.5);
    c.quadraticCurveTo(isSleeping ? -19.8 : -24.0, (isSleeping ? -6.8 : -13.5) + wag * 0.85, isSleeping ? -21.0 : -26.5, (isSleeping ? -4.2 : -8.5) + wag * 0.6);
    c.stroke();
    c.restore();

    // Sleek athletic Collie body
    fillShadedEllipse(
      c,
      -1.4,
      (isSleeping ? -6.6 : -9.6) + sleepBreath * 0.15,
      isSleeping ? 14.2 : 15.6,
      (isSleeping ? 7.2 : 8.2) + sleepBreath * 0.2,
      -0.05,
      coatTop,
      coat
    );

    // Crisp snowy chest ruff & white belly edge
    fillShadedEllipse(c, 6.8, isSleeping ? -6.6 : -9.8, 5.8, 7.2, 0.15, whiteFur, '#dfe5ec');
    c.fillStyle = whiteFur;
    c.beginPath();
    c.ellipse(0.5, isSleeping ? -3.4 : -5.4, 8.2, 2.6, -0.02, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 9.8 : 11.2;
    const headY = isSleeping ? -10.8 : -17.4;

    // Far semi-tipped ear
    c.fillStyle = shadeHex(coat, -0.2);
    c.beginPath();
    c.moveTo(headX + 0.5, headY - 4.4 + earBounce * 0.4);
    c.lineTo(headX + 3.4, headY - 10.2 + earBounce);
    c.lineTo(headX + 5.8, headY - 4.0 + earBounce * 0.4);
    c.closePath();
    c.fill();

    // Sculpted Collie head
    fillShadedEllipse(c, headX, headY, 7.2, 6.8, 0, coatTop, coat);

    // Classic sleek white Collie muzzle + nose blaze
    c.fillStyle = whiteFur;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(headX + 1.0, headY - 0.2);
    c.quadraticCurveTo(headX + 7.2, headY - 0.4, headX + 11.0, headY + 2.4);
    c.quadraticCurveTo(headX + 9.2, headY + 5.2, headX + 2.0, headY + 4.8);
    c.closePath();
    c.fill();
    c.stroke();

    // White forehead blaze stripe
    c.fillStyle = whiteFur;
    c.beginPath();
    c.ellipse(headX + 3.8, headY - 1.2, 1.5, 3.3, -0.18, 0, Math.PI * 2);
    c.fill();

    // Near semi-tipped Collie ear with snowy inner tuft
    c.fillStyle = coat;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(headX - 4.0, headY - 4.0 + earBounce * 0.4);
    c.lineTo(headX - 4.8, headY - 10.6 + earBounce);
    c.lineTo(headX + 0.8, headY - 4.6 + earBounce * 0.4);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = whiteFur;
    c.beginPath();
    c.moveTo(headX - 3.6, headY - 6.8 + earBounce * 0.7);
    c.lineTo(headX - 4.8, headY - 10.6 + earBounce);
    c.lineTo(headX - 1.8, headY - 8.2 + earBounce * 0.8);
    c.closePath();
    c.fill();

    drawMouthAndTongue(c, headX + 6.4, headY + 3.8, isSleeping, isJoyful, showTongue, animPhase);
    drawGlossyNose(c, headX + 10.6, headY + 2.2, 1.75, 1.35);
    drawDogEye(c, headX + 3.5, headY - 0.6, { isSleeping, isBlinking, isJoyful, irisColor: '#4a2f1b' });
  } else if (breed === 'golden') {
    const coatTop = sc('#f7b731', 0.16);
    const coatBase = sc('#e8991a', -0.02);
    const coatShade = sc('#c9760d', -0.22);
    const creamFeather = isShiny ? shadeHex(shinyColor, 0.54) : '#fff1be';

    const legs: FourLegsConfig = {
      backX: -9.6,
      frontX: 8.2,
      yTop: -3.0,
      w: 4.6,
      h: legH,
      swing: legSwing,
      legCol: coatBase,
      pawCol: creamFeather,
      pawH,
      isSleeping,
      opts: { featherColor: creamFeather }
    };

    drawFarPairLegs(c, legs);

    // Lush feathered Golden Retriever tail plume
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 2.1) * 3.6 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = coatBase;
    c.lineWidth = 6.8;
    c.beginPath();
    c.moveTo(-14.2, isSleeping ? -6.2 : -9.0);
    c.quadraticCurveTo(isSleeping ? -19.0 : -23.2, (isSleeping ? -8.0 : -14.8) + wag, isSleeping ? -21.2 : -26.8, (isSleeping ? -5.0 : -10.2) + wag * 0.6);
    c.stroke();
    c.strokeStyle = creamFeather;
    c.lineWidth = 3.1;
    c.beginPath();
    c.moveTo(isSleeping ? -16.8 : -19.5, (isSleeping ? -6.6 : -12.0) + wag * 0.3);
    c.quadraticCurveTo(isSleeping ? -19.5 : -23.5, (isSleeping ? -7.4 : -13.6) + wag, isSleeping ? -21.2 : -26.8, (isSleeping ? -5.0 : -10.2) + wag * 0.6);
    c.stroke();
    c.restore();

    // Warm sunlit honey torso
    fillShadedEllipse(
      c,
      -1.0,
      (isSleeping ? -6.6 : -9.4) + sleepBreath * 0.16,
      isSleeping ? 14.4 : 15.6,
      (isSleeping ? 7.8 : 9.2) + sleepBreath * 0.22,
      0,
      coatTop,
      coatBase
    );

    // Feathered cream chest ruff & soft underbelly
    fillShadedEllipse(c, 7.2, isSleeping ? -5.6 : -8.2, 5.8, 6.4, 0.14, creamFeather, coatTop, null);
    c.fillStyle = creamFeather;
    c.beginPath();
    c.ellipse(0.0, isSleeping ? -3.0 : -5.0, 9.2, 3.0, 0.02, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 9.8 : 11.2;
    const headY = isSleeping ? -10.4 : -16.6;

    // Far velvety ear
    c.fillStyle = shadeHex(coatShade, -0.15);
    c.beginPath();
    c.ellipse(headX + 3.6, headY + 1.8 + earBounce * 0.5, 2.8, 5.2, -0.22, 0, Math.PI * 2);
    c.fill();

    // Broad warm Golden head
    fillShadedEllipse(c, headX, headY, 7.5, 7.1, 0, coatTop, coatBase);

    // Friendly creamy muzzle
    fillShadedEllipse(c, headX + 5.4, headY + 2.3, 5.1, 3.6, 0.04, creamFeather, coatTop);

    // Near velvety floppy Golden ear with soft wave
    c.fillStyle = coatShade;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(headX - 4.2, headY - 2.6 + earBounce * 0.4);
    c.quadraticCurveTo(headX - 7.4, headY + 2.4 + earBounce * 0.7, headX - 3.6, headY + 6.4 + earBounce * 0.8);
    c.quadraticCurveTo(headX - 0.2, headY + 3.2 + earBounce * 0.5, headX - 0.8, headY - 2.2 + earBounce * 0.4);
    c.closePath();
    c.fill();
    c.stroke();

    drawMouthAndTongue(c, headX + 6.4, headY + 3.8, isSleeping, isJoyful, showTongue, animPhase, '#4a2b10');
    drawGlossyNose(c, headX + 9.8, headY + 1.6, 1.9, 1.45);
    drawDogEye(c, headX + 3.0, headY - 1.0, { isSleeping, isBlinking, isJoyful, irisColor: '#4e2c14' });
  } else if (breed === 'husky') {
    const coatTop = sc('#7c8992', 0.08);
    const coatMid = sc('#5a656d', -0.12);
    const darkTrim = sc('#2b3238', -0.32);
    const snowWhite = isShiny ? shadeHex(shinyColor, 0.72) : '#f9fbfd';

    const legs: FourLegsConfig = {
      backX: -9.4,
      frontX: 8.0,
      yTop: -3.2,
      w: 4.3,
      h: legH + 0.3,
      swing: legSwing,
      legCol: coatMid,
      pawCol: snowWhite,
      pawH: 3.4,
      isSleeping
    };

    drawFarPairLegs(c, legs);

    // Big plush curled sickle Husky tail
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 2.1) * 3.1 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = coatMid;
    c.lineWidth = 7.0;
    c.beginPath();
    c.moveTo(-13.8, isSleeping ? -6.4 : -9.4);
    c.quadraticCurveTo(isSleeping ? -19.2 : -22.5, (isSleeping ? -9.5 : -16.8) + wag, isSleeping ? -16.5 : -19.2, (isSleeping ? -11.5 : -20.8) + wag * 0.7);
    c.stroke();
    c.strokeStyle = snowWhite;
    c.lineWidth = 3.8;
    c.beginPath();
    c.moveTo(isSleeping ? -16.2 : -18.5, (isSleeping ? -7.8 : -13.0) + wag * 0.45);
    c.quadraticCurveTo(isSleeping ? -19.2 : -22.5, (isSleeping ? -9.5 : -16.8) + wag, isSleeping ? -16.5 : -19.2, (isSleeping ? -11.5 : -20.8) + wag * 0.7);
    c.stroke();
    c.restore();

    // Thick winter-coat Husky body
    fillShadedEllipse(
      c,
      -1.0,
      (isSleeping ? -6.6 : -9.8) + sleepBreath * 0.16,
      isSleeping ? 14.0 : 14.8,
      (isSleeping ? 7.4 : 8.6) + sleepBreath * 0.2,
      0,
      coatTop,
      coatMid
    );

    // Crisp snowy belly & plush chest ruff
    c.fillStyle = snowWhite;
    c.beginPath();
    c.ellipse(2.6, isSleeping ? -4.0 : -6.2, 10.4, 4.2, -0.04, 0, Math.PI * 2);
    c.ellipse(8.2, isSleeping ? -6.4 : -9.0, 5.2, 6.2, 0.14, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 9.4 : 10.8;
    const headY = isSleeping ? -10.8 : -17.0;

    // Far upright plush ear
    c.fillStyle = darkTrim;
    c.beginPath();
    c.moveTo(headX + 0.6, headY - 4.4 + earBounce * 0.4);
    c.lineTo(headX + 3.2, headY - 11.4 + earBounce);
    c.lineTo(headX + 5.2, headY - 3.8 + earBounce * 0.4);
    c.closePath();
    c.fill();

    // Sculpted Husky head with dark cap
    fillShadedEllipse(c, headX, headY, 7.3, 6.9, 0, coatTop, coatMid);

    // Iconic white Husky mask + cheek fluff + muzzle
    c.fillStyle = snowWhite;
    c.beginPath();
    c.ellipse(headX + 3.6, headY + 2.2, 6.0, 4.2, 0.04, 0, Math.PI * 2);
    c.arc(headX + 0.8, headY + 1.0, 4.4, 0, Math.PI * 2);
    c.fill();
    // Classic forehead mask widow's peak
    c.fillStyle = darkTrim;
    c.beginPath();
    c.ellipse(headX + 2.8, headY - 4.2, 3.6, 2.0, 0.2, 0, Math.PI * 2);
    c.fill();

    // Near upright plush Husky ear with warm pink-white inner fur
    c.fillStyle = darkTrim;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(headX - 4.2, headY - 4.0 + earBounce * 0.4);
    c.lineTo(headX - 1.4, headY - 11.8 + earBounce);
    c.lineTo(headX + 2.2, headY - 3.6 + earBounce * 0.4);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = snowWhite;
    c.beginPath();
    c.moveTo(headX - 2.8, headY - 4.4 + earBounce * 0.4);
    c.lineTo(headX - 1.2, headY - 9.4 + earBounce * 0.9);
    c.lineTo(headX + 0.8, headY - 4.2 + earBounce * 0.4);
    c.closePath();
    c.fill();

    drawMouthAndTongue(c, headX + 5.8, headY + 3.6, isSleeping, isJoyful, showTongue, animPhase);
    drawGlossyNose(c, headX + 9.2, headY + 1.5, 1.8, 1.35);
    // Signature icy blue Husky eye!
    drawDogEye(c, headX + 3.9, headY - 0.5, {
      isSleeping,
      isBlinking,
      isJoyful,
      irisColor: '#29b6f6',
      radius: 1.75
    });
  } else if (breed === 'shiba') {
    const coatTop = sc('#e8751a', 0.14);
    const coatBase = sc('#cf5908', -0.04);
    const warmShade = sc('#a34004', -0.24);
    const creamFur = isShiny ? shadeHex(shinyColor, 0.66) : '#fff9ee';

    const legs: FourLegsConfig = {
      backX: -9.0,
      frontX: 7.6,
      yTop: -3.0,
      w: 4.0,
      h: legH - 0.2,
      swing: legSwing,
      legCol: coatBase,
      pawCol: creamFur,
      pawH,
      isSleeping
    };

    drawFarPairLegs(c, legs);

    // Iconic plush curled Shiba donut tail
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 2.4) * 2.1 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = coatBase;
    c.lineWidth = 5.2;
    c.beginPath();
    c.moveTo(-13.2, isSleeping ? -6.2 : -9.4);
    c.quadraticCurveTo(isSleeping ? -17.2 : -19.8, (isSleeping ? -8.5 : -14.8) + wag, isSleeping ? -14.6 : -16.2, (isSleeping ? -11.4 : -19.4) + wag);
    c.arc(isSleeping ? -13.2 : -14.4, (isSleeping ? -9.8 : -17.4) + wag, 2.5, 0.55 * Math.PI, 2.15 * Math.PI);
    c.stroke();
    // Cream underside of curled tail
    c.strokeStyle = creamFur;
    c.lineWidth = 2.0;
    c.beginPath();
    c.arc(isSleeping ? -13.6 : -14.8, (isSleeping ? -9.6 : -17.2) + wag, 2.2, 0.7 * Math.PI, 1.65 * Math.PI);
    c.stroke();
    c.restore();

    // Compact fox-like Shiba torso
    fillShadedEllipse(
      c,
      -0.6,
      (isSleeping ? -6.4 : -9.0) + sleepBreath * 0.15,
      isSleeping ? 13.8 : 14.5,
      (isSleeping ? 7.2 : 8.4) + sleepBreath * 0.2,
      0,
      coatTop,
      coatBase
    );

    // Warm dorsal saddle shading
    c.fillStyle = warmShade;
    c.beginPath();
    c.ellipse(-3.6, isSleeping ? -8.4 : -11.4, 7.6, 3.6, -0.06, 0, Math.PI * 2);
    c.fill();

    // Classic Shiba Urajiro (plush cream chest & belly)
    c.fillStyle = creamFur;
    c.beginPath();
    c.ellipse(1.8, isSleeping ? -3.6 : -5.6, 10.2, 3.8, 0.02, 0, Math.PI * 2);
    c.ellipse(7.8, isSleeping ? -6.0 : -8.4, 5.2, 5.8, 0.14, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 9.2 : 10.6;
    const headY = isSleeping ? -10.5 : -16.5;

    // Far perky triangular ear
    c.fillStyle = warmShade;
    c.beginPath();
    c.moveTo(headX + 0.8, headY - 4.4 + earBounce * 0.4);
    c.lineTo(headX + 3.4, headY - 11.2 + earBounce);
    c.lineTo(headX + 5.2, headY - 3.6 + earBounce * 0.4);
    c.closePath();
    c.fill();

    // Plush round Shiba head & chubby cream cheeks
    fillShadedEllipse(c, headX, headY, 7.3, 6.8, 0, coatTop, coatBase);
    c.fillStyle = creamFur;
    c.beginPath();
    c.ellipse(headX + 2.8, headY + 2.4, 6.0, 3.8, 0.05, 0, Math.PI * 2);
    c.fill();

    // Cream eyebrow maro-dots
    c.fillStyle = creamFur;
    c.beginPath();
    c.ellipse(headX + 3.2, headY - 2.4, 1.35, 0.9, -0.1, 0, Math.PI * 2);
    c.fill();

    // Near thick upright Shiba ear
    c.fillStyle = warmShade;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(headX - 4.2, headY - 4.0 + earBounce * 0.4);
    c.lineTo(headX - 1.2, headY - 11.8 + earBounce);
    c.lineTo(headX + 2.6, headY - 3.2 + earBounce * 0.4);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = creamFur;
    c.beginPath();
    c.moveTo(headX - 2.6, headY - 4.4 + earBounce * 0.4);
    c.lineTo(headX - 1.0, headY - 9.2 + earBounce * 0.9);
    c.lineTo(headX + 1.0, headY - 3.8 + earBounce * 0.4);
    c.closePath();
    c.fill();

    drawMouthAndTongue(c, headX + 5.6, headY + 3.6, isSleeping, isJoyful, showTongue, animPhase, '#3e210e');
    drawGlossyNose(c, headX + 8.8, headY + 1.8, 1.65, 1.3);
    drawDogEye(c, headX + 3.6, headY - 0.5, { isSleeping, isBlinking, isJoyful, irisColor: '#3a2210', almond: true });
  } else if (breed === 'shepherd') {
    const tanCoat = sc('#d6994c', 0.06);
    const tanChest = sc('#ebc383', 0.34);
    const saddleBlack = sc('#1c2028', -0.45);
    const darkTrim = sc('#2f3542', -0.28);
    const earInner = sc('#be7c3f', 0.22);

    const legs: FourLegsConfig = {
      backX: -10.2,
      frontX: 8.8,
      yTop: -3.2,
      w: 4.4,
      h: legH + 0.6,
      swing: legSwing,
      legCol: tanCoat,
      pawCol: tanChest,
      pawH,
      isSleeping,
      opts: { bandColor: darkTrim, bandStartRatio: 0.0, bandEndRatio: 0.38 }
    };

    drawFarPairLegs(c, legs);

    // Low-sweeping bushy black-tipped sable tail
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 2.0) * 3.0 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = tanCoat;
    c.lineWidth = 5.8;
    c.beginPath();
    c.moveTo(-14.5, isSleeping ? -6.2 : -9.2);
    c.quadraticCurveTo(isSleeping ? -19.5 : -22.5, (isSleeping ? -5.8 : -8.5) + wag * 0.8, isSleeping ? -22.0 : -26.2, (isSleeping ? -3.0 : -4.2) + wag * 0.5);
    c.stroke();
    c.strokeStyle = saddleBlack;
    c.lineWidth = 4.4;
    c.beginPath();
    c.moveTo(-16.8, isSleeping ? -6.4 : -9.3);
    c.quadraticCurveTo(isSleeping ? -20.2 : -23.2, (isSleeping ? -6.2 : -9.0) + wag * 0.8, isSleeping ? -22.2 : -26.4, (isSleeping ? -3.2 : -4.5) + wag * 0.5);
    c.stroke();
    c.restore();

    // Athletic sloped German Shepherd torso
    fillShadedEllipse(
      c,
      -1.0,
      (isSleeping ? -6.8 : -10.2) + sleepBreath * 0.16,
      isSleeping ? 14.8 : 16.0,
      (isSleeping ? 7.6 : 8.9) + sleepBreath * 0.2,
      -0.09,
      tanChest,
      tanCoat
    );

    // Warm tan chest ruff & lighter belly
    c.fillStyle = tanChest;
    c.beginPath();
    c.ellipse(8.2, isSleeping ? -6.0 : -9.2, 5.6, 6.2, 0.16, 0, Math.PI * 2);
    c.ellipse(-0.5, isSleeping ? -3.4 : -6.0, 10.5, 3.2, -0.04, 0, Math.PI * 2);
    c.fill();

    // Iconic broad jet-black saddle blanket
    c.fillStyle = saddleBlack;
    c.beginPath();
    c.ellipse(-2.5, isSleeping ? -9.2 : -13.2, isSleeping ? 11.4 : 12.6, isSleeping ? 4.8 : 5.6, -0.09, 0, Math.PI * 2);
    c.ellipse(-1.5, isSleeping ? -7.2 : -10.6, 8.2, 4.4, -0.06, 0, Math.PI * 2);
    c.ellipse(5.5, isSleeping ? -9.8 : -14.2, 5.2, 3.2, 0.28, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 10.0 : 11.4;
    const headY = isSleeping ? -11.0 : -17.8;

    // Far tall pointed ear
    c.fillStyle = darkTrim;
    c.beginPath();
    c.moveTo(headX - 0.6, headY - 3.4 + earBounce * 0.4);
    c.lineTo(headX + 2.4, headY - 13.4 + earBounce);
    c.lineTo(headX + 4.4, headY - 2.8 + earBounce * 0.4);
    c.closePath();
    c.fill();

    // Noble sculpted head
    fillShadedEllipse(c, headX, headY, 7.2, 6.9, 0, tanChest, tanCoat);

    // Warm cheek fluff & dark widow's peak
    c.fillStyle = tanChest;
    c.beginPath();
    c.ellipse(headX + 0.4, headY + 2.5, 5.2, 3.2, 0.1, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = saddleBlack;
    c.beginPath();
    c.ellipse(headX + 2.0, headY - 3.0, 4.8, 2.6, 0.22, 0, Math.PI * 2);
    c.fill();

    // Near tall proud upright German Shepherd ear
    c.fillStyle = saddleBlack;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(headX - 5.4, headY - 3.4 + earBounce * 0.4);
    c.lineTo(headX - 3.2, headY - 14.4 + earBounce);
    c.lineTo(headX + 1.2, headY - 3.0 + earBounce * 0.4);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = earInner;
    c.beginPath();
    c.moveTo(headX - 4.0, headY - 4.0 + earBounce * 0.4);
    c.lineTo(headX - 2.7, headY - 11.2 + earBounce * 0.9);
    c.lineTo(headX - 0.3, headY - 3.6 + earBounce * 0.4);
    c.closePath();
    c.fill();

    // Classic strong tapered black German Shepherd muzzle mask
    c.fillStyle = saddleBlack;
    c.beginPath();
    c.moveTo(headX + 2.4, headY - 1.0);
    c.lineTo(headX + 11.4, headY + 1.6);
    c.lineTo(headX + 10.4, headY + 4.6);
    c.lineTo(headX + 2.2, headY + 4.2);
    c.closePath();
    c.fill();
    c.fillStyle = tanChest;
    c.beginPath();
    c.ellipse(headX + 6.2, headY + 4.3, 3.4, 1.35, 0.05, 0, Math.PI * 2);
    c.fill();

    drawMouthAndTongue(c, headX + 7.4, headY + 4.4, isSleeping, isJoyful, showTongue, animPhase, '#11141a');
    drawGlossyNose(c, headX + 11.4, headY + 2.1, 1.85, 1.4, '#0c0e12');
    drawDogEye(c, headX + 3.5, headY - 0.5, {
      isSleeping,
      isBlinking,
      isJoyful,
      irisColor: '#7a451c',
      radius: 1.75
    });
  } else if (breed === 'beagle') {
    const tanTop = sc('#eb9234', 0.14);
    const tanBase = sc('#d4751c', -0.04);
    const earBrown = sc('#6e4838', -0.24);
    const saddleDark = sc('#3b251e', -0.38);
    const whiteFur = isShiny ? shadeHex(shinyColor, 0.72) : '#fafaf8';

    const legs: FourLegsConfig = {
      backX: -9.0,
      frontX: 7.4,
      yTop: -2.8,
      w: 4.2,
      h: 8.6,
      swing: legSwing,
      legCol: tanBase,
      pawCol: whiteFur,
      pawH,
      isSleeping
    };

    drawFarPairLegs(c, legs);

    // Cheerful upright white-tipped hound stern tail
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 2.3) * 3.8 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = tanBase;
    c.lineWidth = 4.5;
    c.beginPath();
    c.moveTo(-13.2, isSleeping ? -6.2 : -8.8);
    c.quadraticCurveTo(isSleeping ? -17.2 : -19.6, (isSleeping ? -9.2 : -16.2) + wag, isSleeping ? -16.2 : -18.5, (isSleeping ? -11.4 : -21.2) + wag);
    c.stroke();
    c.strokeStyle = whiteFur;
    c.lineWidth = 3.5;
    c.beginPath();
    c.moveTo(isSleeping ? -16.4 : -18.8, (isSleeping ? -10.4 : -18.5) + wag);
    c.lineTo(isSleeping ? -16.2 : -18.5, (isSleeping ? -12.0 : -22.2) + wag);
    c.stroke();
    c.restore();

    // Compact tricolor Beagle body
    fillShadedEllipse(
      c,
      -0.6,
      (isSleeping ? -6.2 : -8.4) + sleepBreath * 0.15,
      isSleeping ? 13.8 : 14.6,
      (isSleeping ? 7.2 : 8.2) + sleepBreath * 0.2,
      0,
      tanTop,
      tanBase
    );

    // Rich dark chocolate saddle blanket
    c.fillStyle = saddleDark;
    c.beginPath();
    c.ellipse(-3.2, isSleeping ? -8.0 : -10.6, 8.2, 4.2, -0.05, 0, Math.PI * 2);
    c.fill();

    // Crisp white hound chest & belly
    c.fillStyle = whiteFur;
    c.beginPath();
    c.ellipse(3.6, isSleeping ? -3.8 : -5.6, 8.6, 4.2, 0.04, 0, Math.PI * 2);
    c.ellipse(7.8, isSleeping ? -5.8 : -7.8, 4.8, 5.2, 0.14, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 9.2 : 10.6;
    const headY = isSleeping ? -10.2 : -15.4;

    // Far velvety hound ear
    c.fillStyle = shadeHex(earBrown, -0.2);
    c.beginPath();
    c.ellipse(headX + 3.4, headY + 2.4 + earBounce * 0.5, 2.8, 5.4, -0.2, 0, Math.PI * 2);
    c.fill();

    // Warm tan Beagle head
    fillShadedEllipse(c, headX, headY, 7.1, 6.7, 0, tanTop, tanBase);

    // Crisp white muzzle & blaze
    fillShadedEllipse(c, headX + 4.8, headY + 2.6, 5.1, 3.4, 0.04, whiteFur, '#e6e8ec');
    c.fillStyle = whiteFur;
    c.beginPath();
    c.ellipse(headX + 2.8, headY - 0.6, 1.5, 2.9, -0.14, 0, Math.PI * 2);
    c.fill();

    // Long velvety rounded near Beagle ear
    fillShadedEllipse(
      c,
      headX - 3.2,
      headY + 3.4 + earBounce * 0.7,
      3.7,
      6.8,
      0.16,
      earBrown,
      shadeHex(earBrown, -0.22)
    );

    drawMouthAndTongue(c, headX + 5.6, headY + 4.0, isSleeping, isJoyful, showTongue, animPhase, '#3e2723');
    drawGlossyNose(c, headX + 9.0, headY + 2.1, 1.7, 1.35);
    drawDogEye(c, headX + 3.1, headY - 0.7, { isSleeping, isBlinking, isJoyful, irisColor: '#4e2f1a' });
  } else if (breed === 'labrador') {
    // Full artistic overhaul for Labrador Retriever!
    const coatTop = sc('#f4c459', 0.18);
    const coatBase = sc('#dfa133', 0.0);
    const coatShade = sc('#bc7f1c', -0.2);
    const earCol = sc('#c58420', -0.18);
    const creamChest = isShiny ? shadeHex(shinyColor, 0.48) : '#fce6a6';

    const legs: FourLegsConfig = {
      backX: -9.6,
      frontX: 8.2,
      yTop: -3.0,
      w: 4.7,
      h: legH,
      swing: legSwing,
      legCol: coatBase,
      pawCol: creamChest,
      pawH,
      isSleeping
    };

    drawFarPairLegs(c, legs);

    // Sturdy, thick Labrador "otter tail" with sunlit upper edge
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 2.2) * 3.5 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = coatShade;
    c.lineWidth = 6.2;
    c.beginPath();
    c.moveTo(-13.8, isSleeping ? -6.2 : -9.0);
    c.quadraticCurveTo(isSleeping ? -18.8 : -22.2, (isSleeping ? -7.6 : -13.2) + wag, isSleeping ? -21.2 : -25.6, (isSleeping ? -5.0 : -9.2) + wag * 0.55);
    c.stroke();
    c.strokeStyle = coatTop;
    c.lineWidth = 3.8;
    c.stroke();
    c.restore();

    // Athletic warm yellow-gold Lab torso with smooth top-to-bottom shading
    fillShadedEllipse(
      c,
      -1.0,
      (isSleeping ? -6.5 : -9.0) + sleepBreath * 0.16,
      isSleeping ? 14.4 : 15.2,
      (isSleeping ? 7.8 : 9.0) + sleepBreath * 0.22,
      0,
      coatTop,
      coatBase
    );

    // Soft creamy chest & athletic shoulder contour
    c.fillStyle = creamChest;
    c.beginPath();
    c.ellipse(7.6, isSleeping ? -5.6 : -8.0, 5.4, 5.8, 0.14, 0, Math.PI * 2);
    c.ellipse(0.4, isSleeping ? -3.2 : -5.0, 8.6, 2.8, 0.02, 0, Math.PI * 2);
    c.fill();

    // Subtle sunlit back sheen
    c.fillStyle = 'rgba(255, 250, 224, 0.28)';
    c.beginPath();
    c.ellipse(-2.5, isSleeping ? -10.2 : -13.0, 8.8, 2.6, -0.04, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 9.8 : 11.2;
    const headY = isSleeping ? -10.5 : -16.6;

    // Far folded Lab ear
    c.fillStyle = shadeHex(earCol, -0.2);
    c.beginPath();
    c.ellipse(headX + 3.5, headY + 1.4 + earBounce * 0.5, 2.6, 4.8, -0.22, 0, Math.PI * 2);
    c.fill();

    // Broad, gentle Labrador head
    fillShadedEllipse(c, headX, headY, 7.5, 7.1, 0, coatTop, coatBase);

    // Soft broad friendly Lab muzzle
    fillShadedEllipse(c, headX + 5.6, headY + 2.3, 5.3, 3.8, 0.04, creamChest, coatTop);

    // Near folded triangular Labrador ear
    c.fillStyle = earCol;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(headX - 4.0, headY - 3.2 + earBounce * 0.4);
    c.quadraticCurveTo(headX - 6.8, headY + 1.8 + earBounce * 0.7, headX - 2.8, headY + 5.6 + earBounce * 0.7);
    c.quadraticCurveTo(headX + 0.4, headY + 2.2 + earBounce * 0.5, headX - 0.2, headY - 2.8 + earBounce * 0.4);
    c.closePath();
    c.fill();
    c.stroke();

    drawMouthAndTongue(c, headX + 6.6, headY + 4.0, isSleeping, isJoyful, showTongue, animPhase, '#4f3312');
    drawGlossyNose(c, headX + 10.2, headY + 1.6, 1.95, 1.45);
    drawDogEye(c, headX + 3.2, headY - 1.2, { isSleeping, isBlinking, isJoyful, irisColor: '#563315', radius: 1.7 });
  } else if (breed === 'corgi') {
    const coatTop = sc('#f29944', 0.15);
    const coatBase = sc('#df7c29', -0.04);
    const saddle = sc('#bd5c16', -0.24);
    const whiteFur = isShiny ? shadeHex(shinyColor, 0.72) : '#fffdf8';
    const earInner = isShiny ? shadeHex(shinyColor, 0.45) : '#f8c3b3';

    const legs: FourLegsConfig = {
      backX: -9.0,
      frontX: 7.8,
      yTop: -1.8,
      w: 4.3,
      h: 6.4,
      swing: legSwing * 0.7,
      legCol: coatBase,
      pawCol: whiteFur,
      pawH: 2.8,
      isSleeping
    };

    drawFarPairLegs(c, legs);

    // Fluffy Corgi bobtail nub
    c.fillStyle = coatBase;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.8;
    c.beginPath();
    c.arc(isSleeping ? -13.4 : -15.4, (isSleeping ? -5.4 : -8.2) + tailWag * 0.9, 3.8, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = whiteFur;
    c.beginPath();
    c.arc(isSleeping ? -14.6 : -16.8, (isSleeping ? -5.0 : -7.6) + tailWag * 0.9, 2.3, 0, Math.PI * 2);
    c.fill();

    // Iconic Corgi loaf torso
    fillShadedEllipse(
      c,
      -0.5,
      (isSleeping ? -5.4 : -7.4) + sleepBreath * 0.14,
      isSleeping ? 14.4 : 15.2,
      (isSleeping ? 6.8 : 7.8) + sleepBreath * 0.2,
      0,
      coatTop,
      coatBase
    );

    // Warm back saddle shading
    c.fillStyle = saddle;
    c.beginPath();
    c.ellipse(-2.8, isSleeping ? -7.4 : -9.6, 9.6, 4.0, -0.05, 0, Math.PI * 2);
    c.fill();

    // Fluffy snowy belly & chest ruff
    c.fillStyle = whiteFur;
    c.beginPath();
    c.ellipse(1.2, isSleeping ? -2.6 : -4.2, 10.6, 3.6, 0.04, 0, Math.PI * 2);
    c.ellipse(8.2, isSleeping ? -5.6 : -7.6, 5.5, 5.8, 0.14, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 9.6 : 11.0;
    const headY = isSleeping ? -9.6 : -14.8;

    // Far oversized Corgi radar ear
    c.fillStyle = saddle;
    c.beginPath();
    c.moveTo(headX - 0.4, headY - 4.0 + earBounce * 0.4);
    c.quadraticCurveTo(headX + 2.8, headY - 13.6 + earBounce, headX + 4.8, headY - 3.6 + earBounce * 0.4);
    c.closePath();
    c.fill();

    // Round foxy head
    fillShadedEllipse(c, headX, headY, 7.3, 6.9, 0, coatTop, coatBase);

    // Near oversized upright Corgi radar ear
    c.fillStyle = coatBase;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(headX - 5.2, headY - 3.4 + earBounce * 0.4);
    c.quadraticCurveTo(headX - 4.2, headY - 14.8 + earBounce, headX + 1.2, headY - 4.0 + earBounce * 0.4);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = earInner;
    c.beginPath();
    c.moveTo(headX - 3.8, headY - 4.2 + earBounce * 0.4);
    c.quadraticCurveTo(headX - 3.2, headY - 11.6 + earBounce * 0.9, headX - 0.2, headY - 4.4 + earBounce * 0.4);
    c.closePath();
    c.fill();

    // White cheek & muzzle blaze
    fillShadedEllipse(c, headX + 5.0, headY + 2.0, 5.2, 3.5, 0.05, whiteFur, '#ece7df');
    c.fillStyle = whiteFur;
    c.beginPath();
    c.ellipse(headX + 2.8, headY - 0.4, 2.2, 3.4, -0.1, 0, Math.PI * 2);
    c.fill();

    drawMouthAndTongue(c, headX + 6.0, headY + 3.4, isSleeping, isJoyful, showTongue, animPhase, '#4a2910');
    drawGlossyNose(c, headX + 9.5, headY + 1.4, 1.7, 1.35);
    drawDogEye(c, headX + 3.2, headY - 0.8, { isSleeping, isBlinking, isJoyful, irisColor: '#4e2c14' });
  } else if (breed === 'dachshund') {
    const coatTop = sc('#54352a', 0.08);
    const coatBase = sc('#38221b', -0.12);
    const sheen = isShiny ? shadeHex(shinyColor, 0.34) : '#6f483a';
    const tanPts = isShiny ? shadeHex(shinyColor, 0.44) : '#d8823c';
    const earCol = sc('#261611', -0.32);

    const legs: FourLegsConfig = {
      backX: -11.4,
      frontX: 9.8,
      yTop: -1.8,
      w: 3.9,
      h: 6.2,
      swing: legSwing * 0.7,
      legCol: coatBase,
      pawCol: tanPts,
      pawH: 2.8,
      isSleeping
    };

    drawFarPairLegs(c, legs);

    // Sleek tapered wagging whip tail
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 2.5) * 3.4 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = coatBase;
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(-16.2, isSleeping ? -5.2 : -7.4);
    c.quadraticCurveTo(isSleeping ? -20.0 : -22.5, (isSleeping ? -7.0 : -11.5) + wag, isSleeping ? -21.5 : -24.5, (isSleeping ? -8.2 : -14.2) + wag);
    c.stroke();
    c.restore();

    // Extra-long sleek Dachshund torso
    fillShadedEllipse(
      c,
      -1.4,
      (isSleeping ? -5.0 : -7.0) + sleepBreath * 0.14,
      isSleeping ? 16.4 : 17.6,
      (isSleeping ? 5.6 : 6.3) + sleepBreath * 0.18,
      0,
      coatTop,
      coatBase
    );

    // Glossy back coat highlight
    c.fillStyle = sheen;
    c.beginPath();
    c.ellipse(-3.0, isSleeping ? -7.2 : -9.4, 11.2, 2.3, -0.02, 0, Math.PI * 2);
    c.fill();

    // Warm tan chest & belly point
    c.fillStyle = tanPts;
    c.beginPath();
    c.ellipse(10.2, isSleeping ? -4.6 : -6.6, 4.6, 4.4, 0.12, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 11.4 : 13.0;
    const headY = isSleeping ? -9.2 : -13.4;

    // Far hound ear
    c.fillStyle = shadeHex(earCol, -0.15);
    c.beginPath();
    c.ellipse(headX + 2.4, headY + 2.6 + earBounce * 0.5, 2.4, 5.2, -0.22, 0, Math.PI * 2);
    c.fill();

    // Sleek Dachshund head
    fillShadedEllipse(c, headX, headY, 6.3, 6.0, 0, coatTop, coatBase);

    // Distinctively long tapered snout
    fillShadedEllipse(c, headX + 5.8, headY + 1.2, 5.4, 2.7, 0.08, coatTop, coatBase);

    // Tan muzzle & cheek trim
    c.fillStyle = tanPts;
    c.beginPath();
    c.ellipse(headX + 4.6, headY + 2.3, 4.1, 1.75, 0.06, 0, Math.PI * 2);
    c.fill();

    // Long velvety sweeping Dachshund ear
    fillShadedEllipse(c, headX - 2.6, headY + 3.6 + earBounce * 0.7, 3.5, 6.9, 0.18, earCol, shadeHex(earCol, -0.2));

    // Signature tan eyebrow dot
    c.fillStyle = tanPts;
    c.beginPath();
    c.ellipse(headX + 2.5, headY - 2.3, 1.3, 0.9, -0.1, 0, Math.PI * 2);
    c.fill();

    drawMouthAndTongue(c, headX + 6.4, headY + 2.8, isSleeping, isJoyful, showTongue, animPhase, '#140c0a');
    drawGlossyNose(c, headX + 10.8, headY + 1.3, 1.6, 1.25);
    drawDogEye(c, headX + 2.6, headY - 0.5, {
      isSleeping,
      isBlinking,
      isJoyful,
      irisColor: '#4e2912',
      lidColor: '#f4e6da',
      radius: 1.55
    });
  } else if (breed === 'samoyed') {
    const coat = isShiny ? shadeHex(shinyColor, 0.22) : '#fbfdff';
    const fluffShade = isShiny ? shadeHex(shinyColor, -0.12) : '#d0dff0';
    const brightFluff = isShiny ? shadeHex(shinyColor, 0.52) : '#ffffff';
    const earInner = isShiny ? shadeHex(shinyColor, 0.42) : '#f8c8d0';

    const legs: FourLegsConfig = {
      backX: -9.4,
      frontX: 8.2,
      yTop: -3.0,
      w: 4.8,
      h: legH,
      swing: legSwing,
      legCol: coat,
      pawCol: brightFluff,
      pawH,
      isSleeping,
      farLegCol: fluffShade,
      farPawCol: fluffShade,
      opts: { featherColor: brightFluff, outlineColor: 'rgba(110, 130, 160, 0.35)' }
    };

    drawFarPairLegs(c, legs);

    // Big curled snowy plume tail
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 2.1) * 2.8 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = fluffShade;
    c.lineWidth = 7.8;
    c.beginPath();
    c.moveTo(-13.5, isSleeping ? -6.6 : -10.0);
    c.quadraticCurveTo(isSleeping ? -18.5 : -21.2, (isSleeping ? -10.2 : -17.0) + wag, isSleeping ? -14.2 : -14.6, (isSleeping ? -12.6 : -21.2) + wag);
    c.stroke();
    c.strokeStyle = coat;
    c.lineWidth = 5.8;
    c.stroke();
    c.fillStyle = brightFluff;
    c.beginPath();
    c.arc(isSleeping ? -14.5 : -15.0, (isSleeping ? -12.4 : -20.6) + wag, 3.8, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Cloud-like plush body with soft pearlescent-blue under-shading
    fillShadedEllipse(
      c,
      -1.0,
      (isSleeping ? -6.6 : -9.8) + sleepBreath * 0.16,
      isSleeping ? 14.6 : 15.6,
      (isSleeping ? 8.2 : 9.6) + sleepBreath * 0.24,
      0,
      brightFluff,
      fluffShade,
      'rgba(108, 128, 158, 0.32)'
    );

    // Scalloped cloud fluff tufts along back & thick neck ruff
    c.fillStyle = brightFluff;
    c.beginPath();
    c.arc(-7.5, isSleeping ? -9.0 : -12.6, 5.2, 0, Math.PI * 2);
    c.arc(-1.0, isSleeping ? -10.0 : -13.8, 5.6, 0, Math.PI * 2);
    c.arc(6.6, isSleeping ? -7.6 : -11.0, 6.8, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 9.6 : 11.0;
    const headY = isSleeping ? -10.8 : -16.8;

    // Far ear
    c.fillStyle = fluffShade;
    c.beginPath();
    c.moveTo(headX - 0.2, headY - 3.6 + earBounce * 0.4);
    c.lineTo(headX + 2.4, headY - 10.2 + earBounce);
    c.lineTo(headX + 4.4, headY - 3.2 + earBounce * 0.4);
    c.closePath();
    c.fill();

    // Plush round Samoyed head & fluffy cheeks
    fillShadedEllipse(c, headX, headY, 7.8, 7.4, 0, brightFluff, fluffShade, 'rgba(108, 128, 158, 0.32)');
    c.fillStyle = brightFluff;
    c.beginPath();
    c.arc(headX - 1.2, headY + 1.0, 5.0, 0, Math.PI * 2);
    c.fill();

    // Perky triangular near ear with blush pink inside
    c.fillStyle = coat;
    c.strokeStyle = 'rgba(108, 128, 158, 0.35)';
    c.lineWidth = 0.85;
    c.beginPath();
    c.moveTo(headX - 4.8, headY - 3.6 + earBounce * 0.4);
    c.lineTo(headX - 2.2, headY - 11.0 + earBounce);
    c.lineTo(headX + 1.2, headY - 3.4 + earBounce * 0.4);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = earInner;
    c.beginPath();
    c.moveTo(headX - 3.5, headY - 4.2 + earBounce * 0.4);
    c.lineTo(headX - 2.0, headY - 8.8 + earBounce * 0.9);
    c.lineTo(headX, headY - 4.0 + earBounce * 0.4);
    c.closePath();
    c.fill();

    // Neat snowy muzzle
    fillShadedEllipse(c, headX + 5.4, headY + 2.2, 4.9, 3.4, 0, brightFluff, fluffShade, 'rgba(108, 128, 158, 0.28)');

    // Iconic Samoyed "Sammy Smile" + joyful pink tongue
    drawMouthAndTongue(c, headX + 6.4, headY + 3.2, isSleeping, true, showTongue, animPhase, '#2d3436');
    drawGlossyNose(c, headX + 9.7, headY + 1.5, 1.75, 1.35);
    drawDogEye(c, headX + 3.5, headY - 0.6, { isSleeping, isBlinking, isJoyful, irisColor: '#2d231d' });
  } else if (breed === 'bernese') {
    const coatTop = sc('#343b48', 0.04);
    const coatBase = sc('#1e222a', -0.24);
    const rust = isShiny ? shadeHex(shinyColor, 0.32) : '#cf6026';
    const whiteFur = isShiny ? shadeHex(shinyColor, 0.74) : '#f9fafc';

    const legs: FourLegsConfig = {
      backX: -9.8,
      frontX: 8.6,
      yTop: -3.2,
      w: 5.0,
      h: legH + 0.4,
      swing: legSwing,
      legCol: coatBase,
      pawCol: whiteFur,
      pawH: 3.2,
      isSleeping,
      opts: { bandColor: rust, bandStartRatio: 0.45, bandEndRatio: 0.8 }
    };

    drawFarPairLegs(c, legs);

    // Lush sweeping black tail with crisp white tip
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 1.9) * 3.4 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = coatBase;
    c.lineWidth = 6.8;
    c.beginPath();
    c.moveTo(-15.2, isSleeping ? -6.6 : -9.8);
    c.quadraticCurveTo(isSleeping ? -20.0 : -24.0, (isSleeping ? -7.2 : -12.5) + wag, isSleeping ? -22.5 : -27.5, (isSleeping ? -4.2 : -7.5) + wag * 0.55);
    c.stroke();
    c.strokeStyle = whiteFur;
    c.lineWidth = 3.4;
    c.beginPath();
    c.moveTo(isSleeping ? -20.5 : -24.5, (isSleeping ? -5.8 : -9.6) + wag * 0.7);
    c.lineTo(isSleeping ? -22.5 : -27.5, (isSleeping ? -4.2 : -7.5) + wag * 0.55);
    c.stroke();
    c.restore();

    // Broad noble Alpine Bernese torso
    fillShadedEllipse(
      c,
      -1.0,
      (isSleeping ? -7.0 : -10.2) + sleepBreath * 0.16,
      isSleeping ? 15.0 : 16.2,
      (isSleeping ? 8.3 : 9.7) + sleepBreath * 0.24,
      0,
      coatTop,
      coatBase
    );

    // Warm rust shoulder & flank points
    c.fillStyle = rust;
    c.beginPath();
    c.ellipse(-8.5, isSleeping ? -4.2 : -6.6, 4.2, 3.4, -0.1, 0, Math.PI * 2);
    c.ellipse(5.5, isSleeping ? -4.2 : -6.5, 4.4, 3.8, 0.15, 0, Math.PI * 2);
    c.fill();

    // Crisp snowy white Swiss chest blaze
    fillShadedEllipse(c, 8.2, isSleeping ? -6.4 : -9.4, 5.6, 6.8, 0.14, whiteFur, '#dde3ec', null);

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 10.2 : 11.6;
    const headY = isSleeping ? -11.4 : -18.0;

    // Far floppy ear
    c.fillStyle = shadeHex(coatBase, -0.18);
    c.beginPath();
    c.ellipse(headX + 3.6, headY + 2.2 + earBounce * 0.5, 2.6, 4.8, -0.2, 0, Math.PI * 2);
    c.fill();

    // Noble round head
    fillShadedEllipse(c, headX, headY, 7.9, 7.5, 0, coatTop, coatBase);

    // Warm rust cheek spot & eyebrow pip
    c.fillStyle = rust;
    c.beginPath();
    c.ellipse(headX + 2.4, headY + 2.4, 3.4, 2.6, 0.1, 0, Math.PI * 2);
    c.ellipse(headX + 3.6, headY - 2.5, 1.5, 1.1, -0.1, 0, Math.PI * 2);
    c.fill();

    // White muzzle blaze & subtle forehead stripe
    fillShadedEllipse(c, headX + 5.9, headY + 2.8, 5.2, 3.5, 0, whiteFur, '#dfe5ed');
    c.fillStyle = whiteFur;
    c.beginPath();
    c.ellipse(headX + 4.0, headY - 0.4, 1.3, 2.8, -0.16, 0, Math.PI * 2);
    c.fill();

    // Soft triangular floppy near Bernese ear
    c.fillStyle = shadeHex(coatBase, -0.22);
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.8;
    c.beginPath();
    c.moveTo(headX - 4.8, headY - 2.5 + earBounce * 0.4);
    c.quadraticCurveTo(headX - 7.4, headY + 3.2 + earBounce * 0.7, headX - 4.0, headY + 6.0 + earBounce * 0.7);
    c.quadraticCurveTo(headX - 0.8, headY + 3.2 + earBounce * 0.5, headX - 1.0, headY - 2.2 + earBounce * 0.4);
    c.closePath();
    c.fill();
    c.stroke();

    drawMouthAndTongue(c, headX + 7.0, headY + 4.3, isSleeping, isJoyful, showTongue, animPhase, '#14171c');
    drawGlossyNose(c, headX + 10.5, headY + 2.0, 1.95, 1.45, '#0f1217');
    drawDogEye(c, headX + 3.6, headY - 0.2, {
      isSleeping,
      isBlinking,
      isJoyful,
      irisColor: '#583318',
      lidColor: '#f8f9fa',
      radius: 1.7
    });
  } else if (breed === 'dalmatian') {
    const coatTop = isShiny ? shadeHex(shinyColor, 0.3) : '#ffffff';
    const coatBase = isShiny ? shadeHex(shinyColor, 0.08) : '#eef3f9';
    const spot = isShiny ? shadeHex(shinyColor, -0.56) : '#181c24';

    const legs: FourLegsConfig = {
      backX: -9.6,
      frontX: 8.2,
      yTop: -3.4,
      w: 4.1,
      h: 11.2,
      swing: legSwing,
      legCol: coatTop,
      pawCol: coatBase,
      pawH: 2.8,
      isSleeping,
      farLegCol: isShiny ? shadeHex(shinyColor, -0.14) : '#d4dde9',
      farPawCol: isShiny ? shadeHex(shinyColor, -0.18) : '#c8d3e2',
      opts: { spotColor: spot, outlineColor: 'rgba(60, 72, 92, 0.34)' }
    };

    drawFarPairLegs(c, legs);

    // Tapered whip-like spotted tail
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 2.5) * 3.6 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(60, 72, 92, 0.28)';
    c.lineWidth = 4.6;
    c.beginPath();
    c.moveTo(-14.2, isSleeping ? -6.8 : -10.2);
    c.quadraticCurveTo(isSleeping ? -19.0 : -22.2, (isSleeping ? -8.6 : -14.8) + wag, isSleeping ? -21.2 : -25.2, (isSleeping ? -9.6 : -16.8) + wag * 0.7);
    c.stroke();
    c.strokeStyle = coatTop;
    c.lineWidth = 3.4;
    c.stroke();
    c.fillStyle = spot;
    c.beginPath();
    c.arc(isSleeping ? -18.2 : -21.2, (isSleeping ? -8.2 : -14.0) + wag * 0.8, 1.35, 0, Math.PI * 2);
    c.arc(isSleeping ? -20.5 : -24.2, (isSleeping ? -9.2 : -16.2) + wag * 0.72, 1.15, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Sleek athletic Dalmatian torso
    fillShadedEllipse(
      c,
      -1.0,
      (isSleeping ? -6.8 : -10.2) + sleepBreath * 0.16,
      isSleeping ? 14.4 : 15.6,
      (isSleeping ? 7.2 : 8.2) + sleepBreath * 0.2,
      -0.04,
      coatTop,
      coatBase,
      'rgba(60, 72, 92, 0.32)'
    );

    // Organic polka-dot Dalmatian spots
    c.fillStyle = spot;
    const bodySpots: Array<[number, number, number]> = [
      [-10.2, isSleeping ? -8.0 : -11.8, 2.2],
      [-6.4, isSleeping ? -5.2 : -8.2, 1.7],
      [-4.2, isSleeping ? -10.0 : -14.0, 2.4],
      [-0.8, isSleeping ? -6.6 : -9.8, 1.9],
      [2.8, isSleeping ? -9.4 : -13.2, 2.1],
      [4.2, isSleeping ? -5.0 : -8.0, 1.5],
      [-9.0, isSleeping ? -4.8 : -7.6, 1.35],
      [7.4, isSleeping ? -7.4 : -10.8, 1.65]
    ];
    bodySpots.forEach(([sx, sy, sr]) => {
      c.beginPath();
      c.arc(sx, sy, sr, 0, Math.PI * 2);
      c.fill();
    });

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 10.0 : 11.4;
    const headY = isSleeping ? -11.2 : -17.6;

    // Far spotted floppy ear
    c.fillStyle = shadeHex(coatBase, -0.14);
    c.beginPath();
    c.ellipse(headX + 3.4, headY + 1.8 + earBounce * 0.5, 2.5, 4.8, -0.2, 0, Math.PI * 2);
    c.fill();

    // Sculpted white head & clean tapered snout
    fillShadedEllipse(c, headX, headY, 6.9, 6.6, 0, coatTop, coatBase, 'rgba(60, 72, 92, 0.32)');
    fillShadedEllipse(c, headX + 5.8, headY + 2.2, 5.2, 3.2, 0.04, coatTop, coatBase, 'rgba(60, 72, 92, 0.28)');

    // Forehead & cheek spots
    c.fillStyle = spot;
    c.beginPath();
    c.arc(headX + 1.8, headY - 3.6, 1.5, 0, Math.PI * 2);
    c.arc(headX + 6.0, headY + 3.6, 1.05, 0, Math.PI * 2);
    c.fill();

    // High-set spotted velvety floppy Dalmatian ear
    c.fillStyle = coatTop;
    c.strokeStyle = 'rgba(60, 72, 92, 0.35)';
    c.lineWidth = 0.85;
    c.beginPath();
    c.moveTo(headX - 4.8, headY - 3.0 + earBounce * 0.4);
    c.quadraticCurveTo(headX - 7.4, headY + 2.6 + earBounce * 0.7, headX - 4.2, headY + 5.8 + earBounce * 0.7);
    c.quadraticCurveTo(headX - 0.8, headY + 2.8 + earBounce * 0.5, headX - 1.2, headY - 2.6 + earBounce * 0.4);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = spot;
    c.beginPath();
    c.arc(headX - 4.0, headY - 0.2 + earBounce * 0.5, 1.9, 0, Math.PI * 2);
    c.arc(headX - 4.6, headY + 3.6 + earBounce * 0.7, 1.45, 0, Math.PI * 2);
    c.fill();

    drawMouthAndTongue(c, headX + 6.8, headY + 3.7, isSleeping, isJoyful, showTongue, animPhase, '#1c222b');
    drawGlossyNose(c, headX + 10.4, headY + 1.8, 1.75, 1.35, '#0f1217');
    drawDogEye(c, headX + 3.0, headY - 0.4, { isSleeping, isBlinking, isJoyful, irisColor: '#3f2818' });
  } else {
    // Borzoi (graceful sighthound with long aristocratic snout & silky feathered coat)
    const coatTop = isShiny ? shadeHex(shinyColor, 0.36) : '#fffbf3';
    const coatBase = isShiny ? shadeHex(shinyColor, 0.14) : '#f3e7d6';
    const fawn = isShiny ? shadeHex(shinyColor, -0.14) : '#d4a36d';
    const deepFawn = isShiny ? shadeHex(shinyColor, -0.3) : '#b37d44';
    const silkBright = isShiny ? shadeHex(shinyColor, 0.58) : '#fffefa';

    const legs: FourLegsConfig = {
      backX: -10.2,
      frontX: 8.4,
      yTop: -3.6,
      w: 3.4,
      h: 12.2,
      swing: legSwing,
      legCol: coatBase,
      pawCol: silkBright,
      pawH: 2.6,
      isSleeping,
      farLegCol: isShiny ? shadeHex(shinyColor, -0.1) : '#d8cab6',
      farPawCol: isShiny ? shadeHex(shinyColor, -0.12) : '#cfc0ab',
      opts: { featherColor: silkBright, outlineColor: 'rgba(92, 74, 54, 0.32)' }
    };

    drawFarPairLegs(c, legs);

    // Long, low, silky feathered Borzoi S-curve tail
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 1.8) * 2.8 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = coatBase;
    c.lineWidth = 5.0;
    c.beginPath();
    c.moveTo(-14.6, isSleeping ? -6.4 : -10.0);
    c.bezierCurveTo(
      isSleeping ? -19.5 : -21.8, (isSleeping ? -5.1 : -7.0) + wag * 0.6,
      isSleeping ? -21.8 : -25.2, (isSleeping ? -1.8 : -1.5) + wag * 0.8,
      isSleeping ? -24.5 : -28.6, (isSleeping ? -3.0 : -4.2) + wag * 0.5
    );
    c.stroke();
    c.strokeStyle = silkBright;
    c.lineWidth = 2.4;
    c.stroke();
    c.restore();

    // Graceful arched sighthound torso
    fillShadedEllipse(
      c,
      -1.2,
      (isSleeping ? -7.2 : -11.0) + sleepBreath * 0.16,
      isSleeping ? 14.8 : 16.0,
      (isSleeping ? 6.8 : 7.8) + sleepBreath * 0.2,
      -0.08,
      coatTop,
      coatBase,
      'rgba(92, 74, 54, 0.3)'
    );

    // Deep sighthound ribcage & silky chest plume
    c.fillStyle = silkBright;
    c.beginPath();
    c.ellipse(5.8, isSleeping ? -6.0 : -9.4, 6.2, 7.0, 0.18, 0, Math.PI * 2);
    c.ellipse(8.8, isSleeping ? -8.1 : -12.6, 4.4, 6.2, 0.25, 0, Math.PI * 2);
    c.fill();

    // Champagne-fawn silky saddle patches across arched back
    c.fillStyle = fawn;
    c.beginPath();
    c.ellipse(-4.5, isSleeping ? -9.4 : -13.8, 8.6, 4.4, -0.1, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = deepFawn;
    c.beginPath();
    c.ellipse(-5.8, isSleeping ? -10.2 : -14.8, 5.4, 2.4, -0.1, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 10.0 : 11.4;
    const headY = isSleeping ? -11.4 : -18.2;

    // Slender aristocratic head + fawn crown
    fillShadedEllipse(c, headX, headY, 5.7, 5.1, -0.12, coatTop, coatBase, 'rgba(92, 74, 54, 0.28)');
    c.fillStyle = fawn;
    c.beginPath();
    c.ellipse(headX - 0.8, headY - 1.6, 4.2, 2.7, -0.15, 0, Math.PI * 2);
    c.fill();

    // Swept-back silky rose ear
    c.fillStyle = deepFawn;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.75;
    c.beginPath();
    c.moveTo(headX - 3.8, headY - 2.2 + earBounce * 0.4);
    c.quadraticCurveTo(headX - 8.8, headY + 0.6 + earBounce * 0.6, headX - 5.8, headY + 4.0 + earBounce * 0.7);
    c.quadraticCurveTo(headX - 2.4, headY + 2.0 + earBounce * 0.5, headX - 1.4, headY - 1.6 + earBounce * 0.4);
    c.closePath();
    c.fill();
    c.stroke();

    // Iconic ultra-long gently arched Borzoi Roman snout
    c.fillStyle = coatTop;
    c.strokeStyle = 'rgba(92, 74, 54, 0.28)';
    c.lineWidth = 0.85;
    c.beginPath();
    c.moveTo(headX + 2.2, headY - 3.0);
    c.quadraticCurveTo(headX + 10.4, headY - 2.4, headX + 16.6, headY + 2.8);
    c.lineTo(headX + 15.4, headY + 4.6);
    c.quadraticCurveTo(headX + 8.8, headY + 3.4, headX + 1.8, headY + 3.0);
    c.closePath();
    c.fill();
    c.stroke();

    // Silky highlight along bridge of the long snoot
    c.strokeStyle = silkBright;
    c.lineWidth = 1.3;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(headX + 4.4, headY - 2.0);
    c.quadraticCurveTo(headX + 10.0, headY - 1.3, headX + 14.6, headY + 2.2);
    c.stroke();

    drawMouthAndTongue(c, headX + 11.4, headY + 4.2, isSleeping, isJoyful, showTongue, animPhase, '#3d2c20');
    drawGlossyNose(c, headX + 16.6, headY + 3.2, 1.7, 1.3, '#11141a');
    drawDogEye(c, headX + 3.0, headY - 0.6, {
      isSleeping,
      isBlinking,
      isJoyful,
      irisColor: '#2c1e16',
      almond: true,
      radius: 1.6
    });
  }
}
