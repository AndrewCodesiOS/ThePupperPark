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
  isDrinking?: boolean;
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
  strokeColor = '#2a2224',
  isDrinking = false,
  tongueFill = '#ff7696',
  tongueStroke = '#c84b6b'
): void {
  if (isSleeping) return;

  if (isDrinking) {
    // Open drinking mouth with rhythmic animated lapping tongue dipping into the water
    const lapRaw = Math.sin(animPhase * 2.6);
    const lapExtend = Math.max(0, lapRaw);
    const tipX = x + 1.1 + lapExtend * 2.4;
    const tipY = y + 1.5 + lapExtend * 2.15;

    // Subtle open mouth interior behind tongue
    c.fillStyle = '#5a2230';
    c.beginPath();
    c.ellipse(x + 0.65, y + 0.55, 1.9, 1.15 + lapExtend * 0.25, 0.12, 0, Math.PI * 2);
    c.fill();

    // Soft mouth line along upper lip
    c.strokeStyle = strokeColor;
    c.lineWidth = 1.05;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x - 1.7, y - 0.05);
    c.quadraticCurveTo(x + 0.3, y + 0.85, x + 2.35, y - 0.25);
    c.stroke();

    // Lapping dog tongue scooping forward-and-down into the bowl
    c.fillStyle = tongueFill;
    c.strokeStyle = tongueStroke;
    c.lineWidth = 0.6;
    c.beginPath();
    c.moveTo(x - 0.35, y + 0.5);
    c.quadraticCurveTo(x - 0.5 + lapExtend * 0.4, tipY + 0.35, tipX, tipY + 0.55);
    c.quadraticCurveTo(tipX + 1.55, tipY - 0.1, x + 2.05, y + 0.35);
    c.closePath();
    c.fill();
    c.stroke();

    // Center tongue groove & glossy wet specular sheen
    c.strokeStyle = 'rgba(196, 58, 92, 0.45)';
    c.lineWidth = 0.5;
    c.beginPath();
    c.moveTo(x + 0.65, y + 0.85);
    c.quadraticCurveTo(x + 0.8 + lapExtend * 0.9, (y + tipY) * 0.55, tipX - 0.15, tipY - 0.1);
    c.stroke();

    c.fillStyle = 'rgba(255, 232, 238, 0.82)';
    c.beginPath();
    c.ellipse(
      x + 0.75 + lapExtend * 0.9,
      y + 1.2 + lapExtend * 0.85,
      0.55,
      0.9 + lapExtend * 0.45,
      -0.45,
      0,
      Math.PI * 2
    );
    c.fill();

    // Tiny sparkling water droplet clinging to tongue tip mid-lap
    if (lapExtend > 0.5) {
      c.fillStyle = `rgba(165, 245, 255, ${0.55 + (lapExtend - 0.5) * 0.8})`;
      c.beginPath();
      c.arc(tipX + 0.45, tipY + 0.5, 0.75, 0, Math.PI * 2);
      c.fill();
    }
    return;
  }

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
    c.fillStyle = tongueFill;
    c.strokeStyle = tongueStroke;
    c.lineWidth = 0.55;
    c.beginPath();
    c.moveTo(x - 0.5, y + 0.55);
    c.quadraticCurveTo(x - 0.7, y + 3.4 + pantBob, x + 0.85, y + 3.55 + pantBob);
    c.quadraticCurveTo(x + 2.25, y + 3.25 + pantBob, x + 1.85, y + 0.45);
    c.closePath();
    c.fill();
    c.stroke();

    // Subtle tongue highlight
    c.fillStyle = 'rgba(255, 224, 232, 0.45)';
    c.beginPath();
    c.ellipse(x + 0.65, y + 1.9 + pantBob * 0.6, 0.45, 0.85, 0.1, 0, Math.PI * 2);
    c.fill();
  }
}

interface DrinkHeadPoseOpts {
  dipAngle?: number;
  dipTx?: number;
  dipTy?: number;
  neckRx?: number;
  neckRy?: number;
  outlineColor?: string;
}

function withDrinkingHeadPose(
  c: CanvasRenderingContext2D,
  headX: number,
  headY: number,
  isDrinking: boolean,
  animPhase: number,
  neckTopCol: string,
  neckBotCol: string,
  drawHead: () => void,
  opts: DrinkHeadPoseOpts = {}
): void {
  if (!isDrinking) {
    drawHead();
    return;
  }

  const lapPulse = Math.max(0, Math.sin(animPhase * 2.6));
  const pivotX = headX - 2.0;
  const pivotY = headY + 4.5;
  const dipTx = opts.dipTx ?? Math.max(1.8, 15.0 - headX);
  const dipTy = opts.dipTy ?? Math.max(0.2, -headY - 14.5);
  const dipAngle = (opts.dipAngle ?? 0.56) + lapPulse * 0.085;

  // Seamless shaded neck bridge connecting shoulders/chest to the dipped head
  const neckMidX = headX - 1.6 + dipTx * 0.55;
  const neckMidY = headY + 3.8 + dipTy * 0.55 + lapPulse * 0.45;
  fillShadedEllipse(
    c,
    neckMidX,
    neckMidY,
    opts.neckRx ?? 5.6,
    opts.neckRy ?? 4.3,
    0.42,
    neckTopCol,
    neckBotCol,
    opts.outlineColor ?? SOFT_OUTLINE
  );

  c.save();
  c.translate(pivotX + dipTx, pivotY + dipTy + lapPulse * 0.85);
  c.rotate(dipAngle);
  c.translate(-pivotX, -pivotY);
  drawHead();
  c.restore();
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
    earBounce,
    isDrinking = false
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
    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, whiteFur, shadeHex('#e6e2dc', 0), () => {
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

      drawMouthAndTongue(c, headX + 6.4, headY + 3.4, isSleeping, isJoyful, showTongue, animPhase, '#2a2224', isDrinking);
      drawGlossyNose(c, headX + 9.5, headY + 1.4, 1.85, 1.4);
      drawDogEye(c, headX + 3.5, headY - 0.3, { isSleeping, isBlinking, isJoyful, irisColor: '#5c3a21' });
    });
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

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, whiteFur, '#dfe5ec', () => {
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

      drawMouthAndTongue(c, headX + 6.4, headY + 3.8, isSleeping, isJoyful, showTongue, animPhase, '#2a2224', isDrinking);
      drawGlossyNose(c, headX + 10.6, headY + 2.2, 1.75, 1.35);
      drawDogEye(c, headX + 3.5, headY - 0.6, { isSleeping, isBlinking, isJoyful, irisColor: '#4a2f1b' });
    });
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

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
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

      drawMouthAndTongue(c, headX + 6.4, headY + 3.8, isSleeping, isJoyful, showTongue, animPhase, '#4a2b10', isDrinking);
      drawGlossyNose(c, headX + 9.8, headY + 1.6, 1.9, 1.45);
      drawDogEye(c, headX + 3.0, headY - 1.0, { isSleeping, isBlinking, isJoyful, irisColor: '#4e2c14' });
    });
  } else if (breed === 'husky') {
    const coatDark = sc('#262e38', -0.34);
    const coatMantle = sc('#465261', -0.14);
    const silverMist = sc('#7c8c9e', 0.14);
    const snowWhite = isShiny ? shadeHex(shinyColor, 0.76) : '#fbfdff';
    const frostShade = isShiny ? shadeHex(shinyColor, 0.46) : '#dce5f0';
    const earInner = isShiny ? shadeHex(shinyColor, 0.54) : '#f3e3e6';
    const huskyOutline = 'rgba(34, 44, 58, 0.34)';

    const legs: FourLegsConfig = {
      backX: -9.5,
      frontX: 8.2,
      yTop: -3.2,
      w: 4.4,
      h: legH + 0.4,
      swing: legSwing,
      legCol: snowWhite,
      pawCol: snowWhite,
      pawH: 3.3,
      isSleeping,
      farLegCol: frostShade,
      farPawCol: frostShade,
      opts: {
        bandColor: coatMantle,
        bandStartRatio: 0.0,
        bandEndRatio: 0.34,
        featherColor: snowWhite,
        outlineColor: huskyOutline
      }
    };

    drawFarPairLegs(c, legs);

    // Big plush two-tone Arctic brush sickle tail curling proudly over back
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 2.1) * 3.0 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = coatDark;
    c.lineWidth = 8.0;
    c.beginPath();
    c.moveTo(-13.8, isSleeping ? -6.4 : -9.6);
    c.quadraticCurveTo(
      isSleeping ? -19.8 : -23.2,
      (isSleeping ? -10.0 : -17.6) + wag,
      isSleeping ? -16.2 : -18.4,
      (isSleeping ? -12.2 : -22.0) + wag * 0.7
    );
    c.stroke();
    c.strokeStyle = silverMist;
    c.lineWidth = 6.0;
    c.beginPath();
    c.moveTo(-14.6, isSleeping ? -6.8 : -10.4);
    c.quadraticCurveTo(
      isSleeping ? -19.4 : -22.6,
      (isSleeping ? -9.8 : -17.0) + wag,
      isSleeping ? -16.4 : -18.8,
      (isSleeping ? -11.8 : -21.2) + wag * 0.7
    );
    c.stroke();
    c.strokeStyle = snowWhite;
    c.lineWidth = 3.8;
    c.beginPath();
    c.moveTo(isSleeping ? -16.0 : -18.6, (isSleeping ? -7.8 : -12.6) + wag * 0.42);
    c.quadraticCurveTo(
      isSleeping ? -18.6 : -21.4,
      (isSleeping ? -9.4 : -16.2) + wag * 0.9,
      isSleeping ? -15.8 : -17.6,
      (isSleeping ? -11.6 : -21.0) + wag * 0.7
    );
    c.stroke();
    c.restore();

    // Plush snow-white Arctic double-coat base torso
    fillShadedEllipse(
      c,
      -1.0,
      (isSleeping ? -6.6 : -9.8) + sleepBreath * 0.16,
      isSleeping ? 14.3 : 15.2,
      (isSleeping ? 7.6 : 8.9) + sleepBreath * 0.22,
      -0.02,
      snowWhite,
      frostShade,
      huskyOutline
    );

    // High-contrast wolf-like charcoal & silver dorsal mantle sweeping across back & haunches
    c.fillStyle = coatMantle;
    c.beginPath();
    c.ellipse(-2.4, isSleeping ? -8.8 : -12.6, isSleeping ? 12.6 : 13.4, isSleeping ? 4.9 : 5.7, -0.05, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = coatDark;
    c.beginPath();
    c.ellipse(-3.6, isSleeping ? -9.8 : -13.9, isSleeping ? 10.4 : 11.2, isSleeping ? 3.2 : 3.7, -0.06, 0, Math.PI * 2);
    c.fill();
    // Soft silver-mist shoulder highlight & flank transition
    c.fillStyle = silverMist;
    c.beginPath();
    c.ellipse(2.6, isSleeping ? -8.6 : -12.2, 5.2, 2.8, 0.22, 0, Math.PI * 2);
    c.ellipse(-8.6, isSleeping ? -7.4 : -10.8, 4.4, 2.5, -0.18, 0, Math.PI * 2);
    c.fill();

    // Lush snowy Arctic chest ruff & scalloped neck fluff
    fillShadedEllipse(c, 8.0, isSleeping ? -6.2 : -9.2, 5.8, 6.8, 0.16, snowWhite, frostShade, null);
    c.fillStyle = snowWhite;
    c.beginPath();
    c.arc(10.2, isSleeping ? -5.6 : -8.2, 3.6, 0, Math.PI * 2);
    c.arc(7.2, isSleeping ? -4.0 : -6.2, 3.8, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 9.6 : 11.0;
    const headY = isSleeping ? -10.8 : -17.4;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, snowWhite, frostShade, () => {
      // Far plush upright Arctic ear
      c.fillStyle = coatDark;
      c.beginPath();
      c.moveTo(headX + 0.4, headY - 4.4 + earBounce * 0.4);
      c.quadraticCurveTo(headX + 2.6, headY - 12.6 + earBounce, headX + 4.8, headY - 3.8 + earBounce * 0.4);
      c.closePath();
      c.fill();

      // Sculpted wolf-like Husky head with crisp snowy under-base
      fillShadedEllipse(c, headX, headY, 7.5, 7.0, 0, coatMantle, coatDark, huskyOutline);

      // Iconic snowy cheek ruff & clean trefoil face mask
      c.fillStyle = snowWhite;
      c.beginPath();
      c.ellipse(headX + 0.6, headY + 2.0, 6.2, 4.4, 0.04, 0, Math.PI * 2);
      c.arc(headX - 1.6, headY + 1.6, 3.8, 0, Math.PI * 2);
      c.fill();

      // Crisp dark cap & signature Husky widow's peak mask framing the brow
      c.fillStyle = coatDark;
      c.beginPath();
      c.ellipse(headX - 0.8, headY - 4.2, 5.6, 2.7, -0.08, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.moveTo(headX + 0.6, headY - 5.2);
      c.lineTo(headX + 5.8, headY - 2.6);
      c.quadraticCurveTo(headX + 4.4, headY - 1.1, headX + 1.4, headY - 2.0);
      c.closePath();
      c.fill();

      // Classic white eyebrow pip ("Arctic spectacle" highlight above eye)
      c.fillStyle = snowWhite;
      c.beginPath();
      c.ellipse(headX + 3.2, headY - 3.0, 1.35, 0.75, -0.18, 0, Math.PI * 2);
      c.fill();

      // Refined tapered snowy wolf-like muzzle with subtle bridge contour
      c.fillStyle = snowWhite;
      c.strokeStyle = huskyOutline;
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(headX + 2.4, headY - 0.6);
      c.quadraticCurveTo(headX + 7.4, headY - 0.5, headX + 10.6, headY + 1.8);
      c.quadraticCurveTo(headX + 9.4, headY + 4.8, headX + 3.2, headY + 4.5);
      c.closePath();
      c.fill();
      c.stroke();

      // Subtle silver bridge shading on top of snout
      c.fillStyle = silverMist;
      c.beginPath();
      c.ellipse(headX + 6.4, headY + 0.3, 2.4, 0.8, 0.14, 0, Math.PI * 2);
      c.fill();

      // Near thick triangular upright Husky ear with plush frosted inner fur
      c.fillStyle = coatDark;
      c.strokeStyle = huskyOutline;
      c.lineWidth = 0.85;
      c.beginPath();
      c.moveTo(headX - 4.4, headY - 3.8 + earBounce * 0.4);
      c.quadraticCurveTo(headX - 2.2, headY - 13.4 + earBounce, headX + 1.6, headY - 3.8 + earBounce * 0.4);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = earInner;
      c.beginPath();
      c.moveTo(headX - 3.0, headY - 4.4 + earBounce * 0.4);
      c.quadraticCurveTo(headX - 1.6, headY - 10.4 + earBounce * 0.9, headX + 0.4, headY - 4.2 + earBounce * 0.4);
      c.closePath();
      c.fill();

      drawMouthAndTongue(c, headX + 6.2, headY + 3.5, isSleeping, isJoyful, showTongue, animPhase, '#1e242c', isDrinking);
      drawGlossyNose(c, headX + 10.2, headY + 1.6, 1.8, 1.35, '#11161e');
      // Piercing icy-blue almond Husky eye!
      drawDogEye(c, headX + 3.8, headY - 0.7, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#38d9ff',
        almond: true,
        radius: 1.85
      });
    }, { outlineColor: huskyOutline });
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

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
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

      drawMouthAndTongue(c, headX + 5.6, headY + 3.6, isSleeping, isJoyful, showTongue, animPhase, '#3e210e', isDrinking);
      drawGlossyNose(c, headX + 8.8, headY + 1.8, 1.65, 1.3);
      drawDogEye(c, headX + 3.6, headY - 0.5, { isSleeping, isBlinking, isJoyful, irisColor: '#3a2210', almond: true });
    });
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

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, tanChest, tanCoat, () => {
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

      drawMouthAndTongue(c, headX + 7.4, headY + 4.4, isSleeping, isJoyful, showTongue, animPhase, '#11141a', isDrinking);
      drawGlossyNose(c, headX + 11.4, headY + 2.1, 1.85, 1.4, '#0c0e12');
      drawDogEye(c, headX + 3.5, headY - 0.5, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#7a451c',
        radius: 1.75
      });
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

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, tanTop, tanBase, () => {
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

      drawMouthAndTongue(c, headX + 5.6, headY + 4.0, isSleeping, isJoyful, showTongue, animPhase, '#3e2723', isDrinking);
      drawGlossyNose(c, headX + 9.0, headY + 2.1, 1.7, 1.35);
      drawDogEye(c, headX + 3.1, headY - 0.7, { isSleeping, isBlinking, isJoyful, irisColor: '#4e2f1a' });
    });
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

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
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

      drawMouthAndTongue(c, headX + 6.6, headY + 4.0, isSleeping, isJoyful, showTongue, animPhase, '#4f3312', isDrinking);
      drawGlossyNose(c, headX + 10.2, headY + 1.6, 1.95, 1.45);
      drawDogEye(c, headX + 3.2, headY - 1.2, { isSleeping, isBlinking, isJoyful, irisColor: '#563315', radius: 1.7 });
    });
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

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
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

      drawMouthAndTongue(c, headX + 6.0, headY + 3.4, isSleeping, isJoyful, showTongue, animPhase, '#4a2910', isDrinking);
      drawGlossyNose(c, headX + 9.5, headY + 1.4, 1.7, 1.35);
      drawDogEye(c, headX + 3.2, headY - 0.8, { isSleeping, isBlinking, isJoyful, irisColor: '#4e2c14' });
    }, { dipAngle: 0.5 });
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

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
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

      drawMouthAndTongue(c, headX + 6.4, headY + 2.8, isSleeping, isJoyful, showTongue, animPhase, '#140c0a', isDrinking);
      drawGlossyNose(c, headX + 10.8, headY + 1.3, 1.6, 1.25);
      drawDogEye(c, headX + 2.6, headY - 0.5, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#4e2912',
        lidColor: '#f4e6da',
        radius: 1.55
      });
    }, { dipAngle: 0.46, dipTy: 0 });
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

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, brightFluff, fluffShade, () => {
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
      drawMouthAndTongue(c, headX + 6.4, headY + 3.2, isSleeping, true, showTongue, animPhase, '#2d3436', isDrinking);
      drawGlossyNose(c, headX + 9.7, headY + 1.5, 1.75, 1.35);
      drawDogEye(c, headX + 3.5, headY - 0.6, { isSleeping, isBlinking, isJoyful, irisColor: '#2d231d' });
    }, { outlineColor: 'rgba(108, 128, 158, 0.30)' });
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

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
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

      drawMouthAndTongue(c, headX + 7.0, headY + 4.3, isSleeping, isJoyful, showTongue, animPhase, '#14171c', isDrinking);
      drawGlossyNose(c, headX + 10.5, headY + 2.0, 1.95, 1.45, '#0f1217');
      drawDogEye(c, headX + 3.6, headY - 0.2, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#583318',
        lidColor: '#f8f9fa',
        radius: 1.7
      });
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

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
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

      drawMouthAndTongue(c, headX + 6.8, headY + 3.7, isSleeping, isJoyful, showTongue, animPhase, '#1c222b', isDrinking);
      drawGlossyNose(c, headX + 10.4, headY + 1.8, 1.75, 1.35, '#0f1217');
      drawDogEye(c, headX + 3.0, headY - 0.4, { isSleeping, isBlinking, isJoyful, irisColor: '#3f2818' });
    }, { outlineColor: 'rgba(60, 72, 92, 0.30)' });
  } else if (breed === 'chihuahua') {
    const coatTop = sc('#ebb97e', 0.16);
    const coatBase = sc('#d0924c', -0.04);
    const coatShade = sc('#ad6e30', -0.24);
    const cream = isShiny ? shadeHex(shinyColor, 0.68) : '#fff6e4';
    const earPink = isShiny ? shadeHex(shinyColor, 0.46) : '#f8b9b7';

    const legs: FourLegsConfig = {
      backX: -6.4,
      frontX: 5.4,
      yTop: -1.6,
      w: 2.8,
      h: 6.4,
      swing: legSwing * 0.72,
      legCol: coatBase,
      pawCol: cream,
      pawH: 2.2,
      isSleeping
    };

    drawFarPairLegs(c, legs);

    // Perky thin curved Chihuahua sickle tail
    const wag = isSleeping ? tailWag * 0.8 : Math.sin(wagPhase * 2.8) * 2.8 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = coatShade;
    c.lineWidth = 2.8;
    c.beginPath();
    c.moveTo(-9.8, isSleeping ? -4.8 : -7.0);
    c.quadraticCurveTo(
      isSleeping ? -13.2 : -14.8,
      (isSleeping ? -7.2 : -12.6) + wag,
      isSleeping ? -11.4 : -11.8,
      (isSleeping ? -8.6 : -15.4) + wag * 0.8
    );
    c.stroke();
    c.restore();

    // Petite compact Chihuahua torso
    fillShadedEllipse(
      c,
      -0.6,
      (isSleeping ? -4.4 : -6.2) + sleepBreath * 0.12,
      isSleeping ? 9.4 : 9.9,
      (isSleeping ? 4.5 : 5.1) + sleepBreath * 0.16,
      -0.04,
      coatTop,
      coatBase
    );

    // Creamy chest & soft underbelly
    c.fillStyle = cream;
    c.beginPath();
    c.ellipse(5.2, isSleeping ? -4.0 : -5.6, 3.8, 4.2, 0.14, 0, Math.PI * 2);
    c.ellipse(0.6, isSleeping ? -2.2 : -3.5, 6.2, 2.0, 0.04, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 6.4 : 7.6;
    const headY = isSleeping ? -8.2 : -12.8;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
      // Far giant flared Chihuahua bat ear
      c.fillStyle = coatShade;
      c.beginPath();
      c.moveTo(headX + 0.6, headY - 3.6 + earBounce * 0.4);
      c.quadraticCurveTo(headX + 6.2, headY - 13.4 + earBounce, headX + 7.2, headY - 4.2 + earBounce * 0.5);
      c.closePath();
      c.fill();
      c.fillStyle = shadeHex(earPink, -0.14);
      c.beginPath();
      c.moveTo(headX + 1.8, headY - 4.0 + earBounce * 0.4);
      c.quadraticCurveTo(headX + 5.2, headY - 10.6 + earBounce * 0.9, headX + 5.8, headY - 4.6 + earBounce * 0.5);
      c.closePath();
      c.fill();

      // Signature rounded apple-dome Chihuahua skull
      fillShadedEllipse(c, headX, headY, 6.1, 5.8, 0, coatTop, coatBase);

      // Creamy cheek & dainty pointed snout
      fillShadedEllipse(c, headX + 4.4, headY + 1.7, 3.5, 2.3, 0.06, cream, coatTop);
      c.fillStyle = cream;
      c.beginPath();
      c.ellipse(headX + 2.2, headY + 2.2, 3.4, 2.2, 0.06, 0, Math.PI * 2);
      c.fill();

      // Near HUGE flared Chihuahua bat/radar ear with warm pink interior
      c.fillStyle = coatBase;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(headX - 4.2, headY - 2.0 + earBounce * 0.4);
      c.quadraticCurveTo(headX - 9.8, headY - 12.2 + earBounce, headX - 0.6, headY - 5.2 + earBounce * 0.4);
      c.quadraticCurveTo(headX - 0.2, headY - 2.2 + earBounce * 0.4, headX - 4.2, headY - 2.0 + earBounce * 0.4);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = earPink;
      c.beginPath();
      c.moveTo(headX - 3.6, headY - 2.8 + earBounce * 0.4);
      c.quadraticCurveTo(headX - 7.8, headY - 9.8 + earBounce * 0.9, headX - 1.4, headY - 4.6 + earBounce * 0.4);
      c.closePath();
      c.fill();

      drawMouthAndTongue(c, headX + 4.8, headY + 2.8, isSleeping, isJoyful, showTongue, animPhase, '#4a2b14', isDrinking);
      drawGlossyNose(c, headX + 7.4, headY + 1.2, 1.35, 1.05, '#1b1719');
      // Big expressive glossy round Chihuahua eye
      drawDogEye(c, headX + 2.5, headY - 0.4, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#3a2212',
        radius: 2.05
      });
    }, { dipAngle: 0.44, dipTx: 2.6, dipTy: 0.6, neckRx: 3.5, neckRy: 2.7 });
  } else if (breed === 'yorkie') {
    const steelTop = sc('#687b92', 0.1);
    const steelBase = sc('#445468', -0.14);
    const steelDeep = sc('#2b3645', -0.34);
    const goldBright = isShiny ? shadeHex(shinyColor, 0.58) : '#f6bc62';
    const goldBase = isShiny ? shadeHex(shinyColor, 0.26) : '#dc9134';
    const goldDeep = isShiny ? shadeHex(shinyColor, 0.02) : '#b36818';

    const legs: FourLegsConfig = {
      backX: -6.8,
      frontX: 5.8,
      yTop: -1.6,
      w: 3.1,
      h: 6.4,
      swing: legSwing * 0.72,
      legCol: goldBase,
      pawCol: goldBright,
      pawH: 2.2,
      isSleeping,
      opts: { featherColor: goldBright }
    };

    drawFarPairLegs(c, legs);

    // Perky upright feathered Yorkie terrier tail
    const wag = isSleeping ? tailWag * 0.8 : Math.sin(wagPhase * 2.7) * 2.7 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = steelDeep;
    c.lineWidth = 4.2;
    c.beginPath();
    c.moveTo(-10.2, isSleeping ? -5.0 : -7.4);
    c.quadraticCurveTo(
      isSleeping ? -13.0 : -14.2,
      (isSleeping ? -7.6 : -12.6) + wag,
      isSleeping ? -11.6 : -12.4,
      (isSleeping ? -9.2 : -15.6) + wag
    );
    c.stroke();
    c.strokeStyle = steelTop;
    c.lineWidth = 2.0;
    c.stroke();
    c.restore();

    // Petite golden underbody
    fillShadedEllipse(
      c,
      -0.6,
      (isSleeping ? -4.5 : -6.4) + sleepBreath * 0.12,
      isSleeping ? 10.2 : 10.7,
      (isSleeping ? 5.0 : 5.7) + sleepBreath * 0.16,
      0,
      goldBright,
      goldBase
    );

    // Iconic silky steel-blue Yorkie mantle cascading over back with feathered skirt edge
    fillShadedEllipse(
      c,
      -1.8,
      (isSleeping ? -5.5 : -7.6) + sleepBreath * 0.12,
      isSleeping ? 9.4 : 9.9,
      (isSleeping ? 4.2 : 4.8) + sleepBreath * 0.14,
      -0.03,
      steelTop,
      steelBase
    );
    c.fillStyle = steelDeep;
    c.beginPath();
    c.ellipse(-2.8, isSleeping ? -6.8 : -9.0, 7.6, 2.2, -0.04, 0, Math.PI * 2);
    c.fill();
    // Silky feathered coat scallops along flank
    c.fillStyle = steelBase;
    c.beginPath();
    c.arc(-7.0, isSleeping ? -3.2 : -4.8, 2.2, 0, Math.PI * 2);
    c.arc(-3.2, isSleeping ? -2.8 : -4.4, 2.4, 0, Math.PI * 2);
    c.arc(0.8, isSleeping ? -3.0 : -4.6, 2.3, 0, Math.PI * 2);
    c.fill();

    // Warm golden chest plume
    fillShadedEllipse(c, 5.4, isSleeping ? -4.4 : -6.4, 4.2, 4.6, 0.14, goldBright, goldBase, null);

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 6.8 : 8.0;
    const headY = isSleeping ? -8.6 : -13.2;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, goldBright, goldBase, () => {
      // Far neat upright V-shaped Yorkie ear
      c.fillStyle = goldDeep;
      c.beginPath();
      c.moveTo(headX + 0.6, headY - 3.6 + earBounce * 0.4);
      c.lineTo(headX + 2.8, headY - 10.6 + earBounce);
      c.lineTo(headX + 4.4, headY - 3.2 + earBounce * 0.4);
      c.closePath();
      c.fill();

      // Round silky golden-tan Yorkie head
      fillShadedEllipse(c, headX, headY, 6.2, 5.8, 0, goldBright, goldBase);

      // Swept silky forehead bangs & fluffy feathered golden terrier cheeks/beard
      c.fillStyle = goldBright;
      c.beginPath();
      c.ellipse(headX + 0.2, headY - 4.2, 3.6, 2.0, -0.1, 0, Math.PI * 2);
      c.ellipse(headX + 2.6, headY + 2.4, 5.2, 3.2, 0.08, 0, Math.PI * 2);
      c.arc(headX - 1.8, headY + 2.0, 2.8, 0, Math.PI * 2);
      c.fill();

      // Near neat upright V-shaped pointed terrier ear
      c.fillStyle = goldDeep;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(headX - 4.0, headY - 3.4 + earBounce * 0.4);
      c.lineTo(headX - 1.8, headY - 11.2 + earBounce);
      c.lineTo(headX + 1.0, headY - 3.4 + earBounce * 0.4);
      c.closePath();
      c.fill();
      c.stroke();
      c.fillStyle = goldBright;
      c.beginPath();
      c.moveTo(headX - 2.8, headY - 4.0 + earBounce * 0.4);
      c.lineTo(headX - 1.6, headY - 8.6 + earBounce * 0.9);
      c.lineTo(headX - 0.1, headY - 3.8 + earBounce * 0.4);
      c.closePath();
      c.fill();

      drawMouthAndTongue(c, headX + 4.8, headY + 2.8, isSleeping, isJoyful, showTongue, animPhase, '#4a2910', isDrinking);
      drawGlossyNose(c, headX + 7.2, headY + 1.2, 1.35, 1.05, '#14161c');
      drawDogEye(c, headX + 2.5, headY - 0.6, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#2c1b10',
        radius: 1.75
      });
    }, { dipAngle: 0.45, dipTx: 2.5, dipTy: 0.5, neckRx: 3.8, neckRy: 3.0 });
  } else if (breed === 'shihTzu') {
    const whiteTop = isShiny ? shadeHex(shinyColor, 0.72) : '#fffefb';
    const whiteShade = isShiny ? shadeHex(shinyColor, 0.42) : '#e6dfd6';
    const goldTop = sc('#d69755', 0.12);
    const goldBase = sc('#b27135', -0.08);
    const earTip = sc('#5e3b22', -0.34);
    const shihOutline = 'rgba(84, 62, 48, 0.34)';

    const legs: FourLegsConfig = {
      backX: -7.4,
      frontX: 6.2,
      yTop: -1.4,
      w: 3.9,
      h: 6.0,
      swing: legSwing * 0.62,
      legCol: whiteShade,
      pawCol: whiteTop,
      pawH: 2.5,
      isSleeping,
      opts: { outlineColor: shihOutline }
    };

    drawFarPairLegs(c, legs);

    // Iconic plush chrysanthemum plume tail curled high & forward over the back
    const wag = isSleeping ? tailWag * 0.7 : Math.sin(wagPhase * 2.1) * 2.2 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = goldBase;
    c.lineWidth = 6.2;
    c.beginPath();
    c.moveTo(-10.8, isSleeping ? -5.6 : -8.2);
    c.quadraticCurveTo(
      isSleeping ? -15.4 : -17.2,
      (isSleeping ? -9.6 : -14.8) + wag,
      isSleeping ? -10.2 : -10.8,
      (isSleeping ? -11.4 : -17.4) + wag
    );
    c.stroke();
    c.fillStyle = whiteTop;
    c.strokeStyle = shihOutline;
    c.lineWidth = 0.8;
    c.beginPath();
    c.arc(isSleeping ? -11.0 : -11.6, (isSleeping ? -11.2 : -16.8) + wag, 4.4, 0, Math.PI * 2);
    c.arc(isSleeping ? -8.4 : -8.6, (isSleeping ? -10.4 : -15.6) + wag * 0.85, 3.4, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.restore();

    // Compact low imperial torso draped in luxurious long flowing coat skirt
    fillShadedEllipse(
      c,
      -0.8,
      (isSleeping ? -5.0 : -7.0) + sleepBreath * 0.14,
      isSleeping ? 11.4 : 12.0,
      (isSleeping ? 6.0 : 6.9) + sleepBreath * 0.18,
      0,
      whiteTop,
      whiteShade,
      shihOutline
    );

    // Warm honey-gold back saddle
    c.fillStyle = goldBase;
    c.beginPath();
    c.ellipse(-2.2, isSleeping ? -7.2 : -9.8, 8.2, 3.8, -0.05, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = goldTop;
    c.beginPath();
    c.ellipse(-1.4, isSleeping ? -8.0 : -10.6, 5.8, 2.2, -0.04, 0, Math.PI * 2);
    c.fill();

    // Long flowing scalloped snowy-white floor-draping skirt puffs
    c.fillStyle = whiteTop;
    c.strokeStyle = shihOutline;
    c.lineWidth = 0.75;
    c.beginPath();
    c.arc(-7.6, isSleeping ? -2.2 : -3.4, 3.3, 0, Math.PI * 2);
    c.arc(-3.0, isSleeping ? -1.8 : -3.0, 3.6, 0, Math.PI * 2);
    c.arc(1.8, isSleeping ? -1.9 : -3.1, 3.5, 0, Math.PI * 2);
    c.arc(6.0, isSleeping ? -3.0 : -4.4, 3.8, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 7.4 : 8.6;
    const headY = isSleeping ? -8.6 : -13.4;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, whiteTop, whiteShade, () => {
      // Far heavy furry drop ear
      c.fillStyle = earTip;
      c.beginPath();
      c.ellipse(headX + 3.6, headY + 2.4 + earBounce * 0.5, 2.8, 5.2, -0.18, 0, Math.PI * 2);
      c.fill();

      // Round plush chrysanthemum head
      fillShadedEllipse(c, headX, headY, 6.9, 6.4, 0, whiteTop, whiteShade, shihOutline);

      // Warm gold mask around eye & forehead sides
      c.fillStyle = goldBase;
      c.beginPath();
      c.ellipse(headX + 1.8, headY - 1.2, 4.6, 3.0, 0.08, 0, Math.PI * 2);
      c.fill();

      // Crisp snowy white forehead blaze
      c.fillStyle = whiteTop;
      c.beginPath();
      c.ellipse(headX + 3.8, headY - 2.4, 1.6, 2.6, -0.1, 0, Math.PI * 2);
      c.fill();

      // Fluffy snowy-white mustache cheek puffs & imperial beard
      fillShadedEllipse(c, headX + 3.8, headY + 2.4, 5.4, 3.3, 0.04, whiteTop, whiteShade, shihOutline);
      c.fillStyle = whiteTop;
      c.beginPath();
      c.arc(headX + 0.6, headY + 2.8, 3.0, 0, Math.PI * 2);
      c.arc(headX + 6.4, headY + 2.2, 2.7, 0, Math.PI * 2);
      c.fill();

      // Long luxurious furry gold-and-sable near drop ear
      fillShadedEllipse(
        c,
        headX - 3.6,
        headY + 3.0 + earBounce * 0.65,
        3.6,
        6.5,
        0.14,
        goldTop,
        earTip,
        shihOutline
      );

      // Natural fluffy crown tuft
      c.fillStyle = whiteTop;
      c.strokeStyle = shihOutline;
      c.lineWidth = 0.75;
      c.beginPath();
      c.ellipse(headX + 0.4, headY - 7.0, 2.7, 2.1, -0.06, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      drawMouthAndTongue(c, headX + 5.2, headY + 3.4, isSleeping, isJoyful, showTongue, animPhase, '#3e2723', isDrinking);
      // Short button nose set close to the big sweet eyes
      drawGlossyNose(c, headX + 6.9, headY + 1.1, 1.45, 1.1, '#14161c');
      drawDogEye(c, headX + 3.0, headY - 0.6, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#2d1c12',
        radius: 1.9
      });
    }, { dipAngle: 0.44, dipTx: 2.4, dipTy: 0.5, neckRx: 4.2, neckRy: 3.4, outlineColor: shihOutline });
  } else if (breed === 'pitbull') {
    const coatTop = sc('#8698ad', 0.14);
    const coatBase = sc('#5f7288', -0.06);
    const coatDeep = sc('#455569', -0.24);
    const sheen = isShiny ? shadeHex(shinyColor, 0.38) : '#a8b9cc';
    const whiteFur = isShiny ? shadeHex(shinyColor, 0.76) : '#fafcff';
    const noseCol = isShiny ? shadeHex(shinyColor, -0.42) : '#323d4d';

    const legs: FourLegsConfig = {
      backX: -9.2,
      frontX: 8.2,
      yTop: -2.8,
      w: 4.7,
      h: 9.5,
      swing: legSwing,
      legCol: coatBase,
      pawCol: whiteFur,
      pawH: 3.1,
      isSleeping
    };

    drawFarPairLegs(c, legs);

    // Smooth sleek tapered whip tail wagging happily
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 2.5) * 3.8 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = coatDeep;
    c.lineWidth = 4.0;
    c.beginPath();
    c.moveTo(-13.8, isSleeping ? -6.2 : -9.2);
    c.quadraticCurveTo(
      isSleeping ? -18.5 : -21.8,
      (isSleeping ? -7.4 : -12.6) + wag,
      isSleeping ? -20.8 : -24.8,
      (isSleeping ? -8.4 : -15.4) + wag * 0.75
    );
    c.stroke();
    c.strokeStyle = coatTop;
    c.lineWidth = 2.1;
    c.stroke();
    c.restore();

    // Compact muscular broad-chested Pitbull torso
    fillShadedEllipse(
      c,
      -0.8,
      (isSleeping ? -6.4 : -9.0) + sleepBreath * 0.16,
      isSleeping ? 14.2 : 15.0,
      (isSleeping ? 7.6 : 8.7) + sleepBreath * 0.22,
      -0.03,
      coatTop,
      coatBase
    );

    // Sleek athletic shoulder & back coat sheen
    c.fillStyle = sheen;
    c.beginPath();
    c.ellipse(-2.0, isSleeping ? -9.8 : -12.6, 8.2, 2.3, -0.04, 0, Math.PI * 2);
    c.fill();

    // Crisp bright white chest blaze & underbelly strip
    fillShadedEllipse(c, 7.6, isSleeping ? -5.8 : -8.4, 5.4, 6.2, 0.16, whiteFur, '#dde5ef', null);
    c.fillStyle = whiteFur;
    c.beginPath();
    c.ellipse(1.4, isSleeping ? -2.9 : -4.8, 7.4, 2.4, 0.04, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 9.6 : 11.2;
    const headY = isSleeping ? -10.6 : -16.4;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
      // Far half-folded "rose" ear
      c.fillStyle = coatDeep;
      c.beginPath();
      c.moveTo(headX + 0.6, headY - 4.4 + earBounce * 0.4);
      c.quadraticCurveTo(headX + 5.6, headY - 8.4 + earBounce, headX + 6.4, headY - 2.6 + earBounce * 0.5);
      c.closePath();
      c.fill();

      // Broad sculpted blocky Pitbull head
      fillShadedEllipse(c, headX, headY, 7.6, 6.9, 0, coatTop, coatBase);

      // Subtle white forehead blaze stripe
      c.fillStyle = whiteFur;
      c.beginPath();
      c.ellipse(headX + 3.6, headY - 2.2, 1.35, 3.0, -0.14, 0, Math.PI * 2);
      c.fill();

      // Broad squared-off Pitbull muzzle with crisp white lower muzzle/chin
      fillShadedEllipse(c, headX + 5.6, headY + 2.0, 5.1, 3.7, 0.03, coatTop, coatBase);
      c.fillStyle = whiteFur;
      c.beginPath();
      c.ellipse(headX + 5.8, headY + 3.5, 4.4, 2.0, 0.02, 0, Math.PI * 2);
      c.fill();

      // Near classic half-pricked / folded Pitbull rose ear
      c.fillStyle = coatDeep;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.85;
      c.beginPath();
      c.moveTo(headX - 4.8, headY - 3.6 + earBounce * 0.4);
      c.quadraticCurveTo(headX - 8.6, headY - 7.8 + earBounce, headX - 6.6, headY - 0.6 + earBounce * 0.6);
      c.quadraticCurveTo(headX - 3.2, headY - 1.2 + earBounce * 0.5, headX - 0.8, headY - 4.4 + earBounce * 0.4);
      c.closePath();
      c.fill();
      c.stroke();

      // Signature warm wide Pibble smile!
      drawMouthAndTongue(c, headX + 6.4, headY + 3.7, isSleeping, true, showTongue, animPhase, '#242c36', isDrinking);
      drawGlossyNose(c, headX + 9.8, headY + 1.3, 2.0, 1.5, noseCol);
      drawDogEye(c, headX + 3.2, headY - 0.8, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#b37b36',
        radius: 1.7
      });
    });
  } else if (breed === 'poodle') {
    const curlBright = isShiny ? shadeHex(shinyColor, 0.58) : '#fffdf8';
    const curlTop = isShiny ? shadeHex(shinyColor, 0.3) : '#f7efe3';
    const curlBase = isShiny ? shadeHex(shinyColor, 0.04) : '#e3d2bc';
    const curlShade = isShiny ? shadeHex(shinyColor, -0.2) : '#c8b296';
    const poodleOutline = 'rgba(92, 74, 58, 0.34)';

    const legs: FourLegsConfig = {
      backX: -9.4,
      frontX: 8.2,
      yTop: -3.6,
      w: 3.0,
      h: 11.4,
      swing: legSwing,
      legCol: curlBase,
      pawCol: curlBright,
      pawH: 2.5,
      isSleeping,
      farLegCol: curlShade,
      farPawCol: curlBase,
      opts: { outlineColor: poodleOutline }
    };

    drawFarPairLegs(c, legs);

    // Far curly ankle pom-pom cuffs
    if (!isSleeping) {
      c.fillStyle = curlTop;
      c.strokeStyle = poodleOutline;
      c.lineWidth = 0.75;
      const farBackX = legs.backX + 2.2 + legSwing * 0.85;
      const farFrontX = legs.frontX + 1.8 - legSwing * 0.85;
      c.beginPath();
      c.arc(farBackX, 4.4, 2.6, 0, Math.PI * 2);
      c.arc(farFrontX, 4.4, 2.6, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    // Iconic shaved Poodle tail stem topped with a big fluffy round pom-pom ball!
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 2.3) * 3.0 * moodWagAmp;
    const pomX = isSleeping ? -18.4 : -21.2;
    const pomY = (isSleeping ? -9.4 : -17.6) + wag;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = curlShade;
    c.lineWidth = 2.6;
    c.beginPath();
    c.moveTo(-13.6, isSleeping ? -6.8 : -10.6);
    c.quadraticCurveTo(isSleeping ? -16.4 : -18.2, (isSleeping ? -8.2 : -14.2) + wag * 0.6, pomX, pomY);
    c.stroke();
    // Fluffy multi-lobe tail pom-pom
    c.fillStyle = curlBright;
    c.strokeStyle = poodleOutline;
    c.lineWidth = 0.85;
    c.beginPath();
    c.arc(pomX, pomY, 4.3, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = curlTop;
    c.beginPath();
    c.arc(pomX - 1.5, pomY + 1.2, 2.3, 0, Math.PI * 2);
    c.arc(pomX + 1.5, pomY - 1.1, 2.1, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Sleek sculpted shaved hindquarters & tapered athletic waist
    fillShadedEllipse(
      c,
      -2.8,
      (isSleeping ? -6.6 : -10.2) + sleepBreath * 0.14,
      isSleeping ? 11.8 : 12.8,
      (isSleeping ? 5.6 : 6.4) + sleepBreath * 0.18,
      -0.06,
      curlTop,
      curlBase,
      poodleOutline
    );

    // Classic hip rosette puff
    c.fillStyle = curlBright;
    c.strokeStyle = poodleOutline;
    c.lineWidth = 0.75;
    c.beginPath();
    c.arc(-9.2, isSleeping ? -7.2 : -11.4, 3.4, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Iconic big sculpted Continental/Lion-clip curly cloud chest & shoulder mane!
    fillShadedEllipse(
      c,
      5.4,
      (isSleeping ? -7.0 : -10.8) + sleepBreath * 0.16,
      7.4,
      (isSleeping ? 7.0 : 8.4) + sleepBreath * 0.2,
      0.08,
      curlBright,
      curlBase,
      poodleOutline
    );
    // Scalloped curly cloud tufts along the mane
    c.fillStyle = curlBright;
    c.beginPath();
    c.arc(1.2, isSleeping ? -9.6 : -14.2, 4.2, 0, Math.PI * 2);
    c.arc(6.0, isSleeping ? -10.2 : -15.0, 4.4, 0, Math.PI * 2);
    c.arc(9.8, isSleeping ? -7.2 : -11.0, 4.1, 0, Math.PI * 2);
    c.arc(6.8, isSleeping ? -4.2 : -7.2, 4.0, 0, Math.PI * 2);
    c.arc(1.8, isSleeping ? -5.0 : -8.0, 3.6, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    // Near curly ankle pom-pom cuffs!
    if (!isSleeping) {
      c.fillStyle = curlBright;
      c.strokeStyle = poodleOutline;
      c.lineWidth = 0.8;
      const nearBackX = legs.backX - legSwing;
      const nearFrontX = legs.frontX + legSwing;
      c.beginPath();
      c.arc(nearBackX, 4.8, 2.9, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.beginPath();
      c.arc(nearFrontX, 4.8, 2.9, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }

    const headX = isSleeping ? 9.6 : 11.0;
    const headY = isSleeping ? -11.2 : -18.2;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, curlBright, curlBase, () => {
      // Far curly pendulous ear
      c.fillStyle = curlShade;
      c.beginPath();
      c.ellipse(headX + 3.4, headY + 2.4 + earBounce * 0.5, 2.7, 5.2, -0.16, 0, Math.PI * 2);
      c.fill();

      // Refined Poodle head & sleek clipped aristocratic muzzle
      fillShadedEllipse(c, headX, headY, 6.4, 6.0, 0, curlTop, curlBase, poodleOutline);
      fillShadedEllipse(c, headX + 6.2, headY + 1.6, 5.0, 2.6, 0.04, curlBright, curlBase, poodleOutline);

      // Iconic tall puffy curly Poodle topknot crown!
      c.fillStyle = curlBright;
      c.strokeStyle = poodleOutline;
      c.lineWidth = 0.85;
      c.beginPath();
      c.arc(headX - 1.6, headY - 6.4, 3.6, 0, Math.PI * 2);
      c.arc(headX + 1.8, headY - 6.6, 3.4, 0, Math.PI * 2);
      c.arc(headX + 0.1, headY - 8.2, 3.5, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      // Soft curl crown fill blend
      c.fillStyle = curlBright;
      c.beginPath();
      c.ellipse(headX + 0.1, headY - 6.2, 4.6, 2.6, 0, 0, Math.PI * 2);
      c.fill();

      // Near long scalloped curly pendulous Poodle ear
      c.fillStyle = curlTop;
      c.strokeStyle = poodleOutline;
      c.lineWidth = 0.85;
      c.beginPath();
      c.arc(headX - 3.6, headY - 0.6 + earBounce * 0.45, 3.2, 0, Math.PI * 2);
      c.arc(headX - 4.2, headY + 2.6 + earBounce * 0.6, 3.4, 0, Math.PI * 2);
      c.arc(headX - 3.4, headY + 5.6 + earBounce * 0.75, 3.0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = curlBright;
      c.beginPath();
      c.ellipse(headX - 3.6, headY + 2.4 + earBounce * 0.6, 2.2, 4.6, 0.06, 0, Math.PI * 2);
      c.fill();

      drawMouthAndTongue(c, headX + 7.2, headY + 3.0, isSleeping, isJoyful, showTongue, animPhase, '#3d2c20', isDrinking);
      drawGlossyNose(c, headX + 10.6, headY + 1.3, 1.65, 1.25, '#14161c');
      drawDogEye(c, headX + 3.2, headY - 0.7, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#2d1f16',
        almond: true,
        radius: 1.65
      });
    }, { outlineColor: poodleOutline });
  } else if (breed === 'rottweiler') {
    const coatTop = sc('#2b313c', -0.16);
    const coatBase = sc('#15181f', -0.44);
    const sheen = isShiny ? shadeHex(shinyColor, 0.14) : '#3d4656';
    const mahogany = isShiny ? shadeHex(shinyColor, 0.36) : '#d46b24';
    const mahoganyDeep = isShiny ? shadeHex(shinyColor, 0.14) : '#ab4a12';

    const legs: FourLegsConfig = {
      backX: -9.6,
      frontX: 8.4,
      yTop: -3.0,
      w: 5.2,
      h: legH + 0.2,
      swing: legSwing,
      legCol: coatBase,
      pawCol: mahogany,
      pawH: 3.4,
      isSleeping,
      opts: { bandColor: mahogany, bandStartRatio: 0.46, bandEndRatio: 1.0 }
    };

    drawFarPairLegs(c, legs);

    // Classic short sturdy bobbed Rottweiler tail
    c.fillStyle = coatBase;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.85;
    c.beginPath();
    c.ellipse(
      isSleeping ? -14.6 : -16.2,
      (isSleeping ? -6.8 : -10.2) + tailWag * 0.75,
      3.3,
      2.3,
      -0.35,
      0,
      Math.PI * 2
    );
    c.fill();
    c.stroke();

    // Heavy broad muscular Rottweiler torso
    fillShadedEllipse(
      c,
      -0.8,
      (isSleeping ? -6.8 : -9.8) + sleepBreath * 0.16,
      isSleeping ? 14.8 : 15.8,
      (isSleeping ? 8.2 : 9.6) + sleepBreath * 0.24,
      0,
      coatTop,
      coatBase
    );

    // Glossy jet-black muscular back sheen
    c.fillStyle = sheen;
    c.beginPath();
    c.ellipse(-2.0, isSleeping ? -10.8 : -14.2, 9.2, 2.5, -0.04, 0, Math.PI * 2);
    c.fill();

    // Iconic bold mahogany-rust twin chest patches (no white!)
    c.fillStyle = mahogany;
    c.beginPath();
    c.ellipse(8.2, isSleeping ? -5.8 : -8.4, 4.4, 5.2, 0.18, 0, Math.PI * 2);
    c.ellipse(5.8, isSleeping ? -4.0 : -6.2, 3.0, 2.6, 0.1, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = mahoganyDeep;
    c.beginPath();
    c.ellipse(-8.6, isSleeping ? -4.2 : -6.4, 3.2, 2.4, -0.12, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 10.0 : 11.4;
    const headY = isSleeping ? -11.0 : -17.2;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
      // Far folded triangular Rottie ear
      c.fillStyle = shadeHex(coatBase, -0.15);
      c.beginPath();
      c.ellipse(headX + 3.6, headY + 1.0 + earBounce * 0.5, 2.6, 4.4, -0.22, 0, Math.PI * 2);
      c.fill();

      // Broad, blocky powerful Rottweiler skull
      fillShadedEllipse(c, headX, headY, 7.9, 7.5, 0, coatTop, coatBase);

      // Strong squared-off black muzzle with vivid mahogany-rust cheek & underjaw markings
      fillShadedEllipse(c, headX + 5.6, headY + 2.2, 5.0, 3.8, 0.04, coatTop, coatBase);
      c.fillStyle = mahogany;
      c.beginPath();
      c.ellipse(headX + 2.6, headY + 2.8, 3.6, 2.7, 0.12, 0, Math.PI * 2);
      c.ellipse(headX + 6.4, headY + 3.9, 3.9, 1.85, 0.04, 0, Math.PI * 2);
      c.fill();

      // Unmistakable bright mahogany eyebrow pip!
      c.fillStyle = mahogany;
      c.beginPath();
      c.ellipse(headX + 3.5, headY - 2.9, 1.75, 1.2, -0.12, 0, Math.PI * 2);
      c.fill();

      // Medium high-set folded triangular glossy black Rottie ear
      c.fillStyle = coatBase;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.85;
      c.beginPath();
      c.moveTo(headX - 4.4, headY - 3.6 + earBounce * 0.4);
      c.quadraticCurveTo(headX - 7.4, headY + 1.4 + earBounce * 0.65, headX - 3.4, headY + 4.4 + earBounce * 0.7);
      c.quadraticCurveTo(headX - 0.2, headY + 1.4 + earBounce * 0.5, headX - 0.6, headY - 3.2 + earBounce * 0.4);
      c.closePath();
      c.fill();
      c.stroke();

      drawMouthAndTongue(c, headX + 6.8, headY + 4.2, isSleeping, isJoyful, showTongue, animPhase, '#0f1217', isDrinking);
      drawGlossyNose(c, headX + 10.1, headY + 1.5, 2.05, 1.55, '#0c0e13');
      drawDogEye(c, headX + 3.5, headY - 0.5, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#6b3b16',
        lidColor: mahogany,
        radius: 1.7
      });
    });
  } else if (breed === 'greatDane') {
    const fawnTop = sc('#e4ae68', 0.16);
    const fawnBase = sc('#c98c42', -0.02);
    const fawnShade = sc('#a46a28', -0.22);
    const maskBlack = sc('#1c2028', -0.44);
    const earDark = sc('#2b303b', -0.32);
    const chestCream = isShiny ? shadeHex(shinyColor, 0.56) : '#f7dfb8';

    const legs: FourLegsConfig = {
      backX: -11.4,
      frontX: 9.6,
      yTop: -4.4,
      w: 4.5,
      h: 13.0,
      swing: legSwing * 1.08,
      legCol: fawnBase,
      pawCol: fawnTop,
      pawH: 3.2,
      isSleeping
    };

    drawFarPairLegs(c, legs);

    // Long, sleek tapered Great Dane tail held low-to-level with gentle upturned tip
    const wag = isSleeping ? tailWag : Math.sin(wagPhase * 1.8) * 3.0 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = fawnShade;
    c.lineWidth = 4.5;
    c.beginPath();
    c.moveTo(-16.0, isSleeping ? -7.4 : -12.0);
    c.quadraticCurveTo(
      isSleeping ? -21.2 : -24.2,
      (isSleeping ? -5.8 : -9.0) + wag * 0.7,
      isSleeping ? -24.2 : -28.4,
      (isSleeping ? -4.4 : -6.6) + wag * 0.6
    );
    c.stroke();
    c.strokeStyle = fawnTop;
    c.lineWidth = 2.2;
    c.stroke();
    c.restore();

    // Towering, deep-chested, athletic giant torso
    fillShadedEllipse(
      c,
      -1.0,
      (isSleeping ? -7.6 : -12.2) + sleepBreath * 0.16,
      isSleeping ? 16.0 : 17.4,
      (isSleeping ? 7.8 : 9.2) + sleepBreath * 0.22,
      -0.06,
      fawnTop,
      fawnBase
    );

    // Deep noble ribcage keel & slender cream sternum streak
    c.fillStyle = fawnBase;
    c.beginPath();
    c.ellipse(6.2, isSleeping ? -6.4 : -10.6, 7.6, 7.6, 0.12, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = chestCream;
    c.beginPath();
    c.ellipse(10.8, isSleeping ? -6.2 : -10.8, 3.2, 5.2, 0.18, 0, Math.PI * 2);
    c.fill();

    // Sunlit muscular coat highlight
    c.fillStyle = 'rgba(255, 244, 218, 0.24)';
    c.beginPath();
    c.ellipse(-2.8, isSleeping ? -11.4 : -16.4, 10.2, 2.6, -0.06, 0, Math.PI * 2);
    c.fill();

    // Proud tall arched Great Dane neck (when awake and not dipping to drink)
    if (!isSleeping && !isDrinking) {
      fillShadedEllipse(c, 10.4, -16.4, 5.2, 6.8, 0.24, fawnTop, fawnBase);
    }

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 11.4 : 13.2;
    const headY = isSleeping ? -11.6 : -22.2;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, fawnTop, fawnBase, () => {
      // Far large dark velvety folded Dane ear
      c.fillStyle = shadeHex(earDark, -0.18);
      c.beginPath();
      c.ellipse(headX + 3.4, headY + 2.4 + earBounce * 0.5, 2.7, 5.4, -0.2, 0, Math.PI * 2);
      c.fill();

      // Noble sculpted rectangular Great Dane skull
      fillShadedEllipse(c, headX, headY, 7.3, 6.6, -0.04, fawnTop, fawnBase);

      // Iconic broad deep squared-off jet-black Dane muzzle mask & flews
      c.fillStyle = maskBlack;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.85;
      c.beginPath();
      c.moveTo(headX + 2.4, headY - 1.6);
      c.lineTo(headX + 12.0, headY - 0.2);
      c.quadraticCurveTo(headX + 12.8, headY + 3.8, headX + 10.6, headY + 5.2);
      c.quadraticCurveTo(headX + 6.4, headY + 5.8, headX + 2.2, headY + 4.6);
      c.closePath();
      c.fill();
      c.stroke();

      // Subtle dark mask shading framing the eye
      c.fillStyle = earDark;
      c.beginPath();
      c.ellipse(headX + 3.4, headY - 0.8, 2.8, 2.2, 0.1, 0, Math.PI * 2);
      c.fill();

      // Near large high-set dark velvety folded Great Dane ear
      c.fillStyle = earDark;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.85;
      c.beginPath();
      c.moveTo(headX - 4.4, headY - 3.4 + earBounce * 0.4);
      c.quadraticCurveTo(headX - 8.0, headY + 2.4 + earBounce * 0.7, headX - 3.6, headY + 6.8 + earBounce * 0.8);
      c.quadraticCurveTo(headX - 0.2, headY + 2.8 + earBounce * 0.5, headX - 0.6, headY - 2.8 + earBounce * 0.4);
      c.closePath();
      c.fill();
      c.stroke();

      drawMouthAndTongue(c, headX + 7.6, headY + 4.6, isSleeping, isJoyful, showTongue, animPhase, '#0c0f14', isDrinking);
      drawGlossyNose(c, headX + 11.8, headY + 1.0, 2.1, 1.55, '#0b0d12');
      drawDogEye(c, headX + 3.4, headY - 0.9, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#5c3718',
        lidColor: fawnTop,
        radius: 1.75
      });
    }, { dipAngle: 0.62, dipTx: 2.6, dipTy: 7.4, neckRx: 6.0, neckRy: 4.6 });
  } else if (breed === 'pomeranian') {
    // Pomeranian (plush round foxy puffball with lush neck ruff & curled plumed tail)
    const coatTop = isShiny ? shadeHex(shinyColor, 0.28) : '#f7a549';
    const coatBase = isShiny ? shadeHex(shinyColor, -0.02) : '#de7c27';
    const cream = isShiny ? shadeHex(shinyColor, 0.56) : '#fff1d4';
    const earTip = isShiny ? shadeHex(shinyColor, -0.22) : '#b55a14';

    const legs: FourLegsConfig = {
      backX: -5.4,
      frontX: 4.8,
      yTop: -1.4,
      w: 2.6,
      h: 6.4,
      swing: legSwing,
      legCol: coatBase,
      pawCol: cream,
      pawH: 1.8,
      isSleeping,
      farLegCol: shadeHex(coatBase, -0.22),
      farPawCol: shadeHex(cream, -0.18),
      opts: { featherColor: cream }
    };

    drawFarPairLegs(c, legs);

    // Lavish plumed Pomeranian tail curled right over the back
    const plumeWag = isSleeping ? tailWag * 0.4 : Math.sin(wagPhase * 2.2) * 1.9 * moodWagAmp;
    c.save();
    c.fillStyle = cream;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.8;
    c.beginPath();
    c.ellipse(-8.6 + plumeWag * 0.35, (isSleeping ? -7.8 : -11.6) + plumeWag * 0.25, 5.2, 4.0, -0.45, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = coatTop;
    c.beginPath();
    c.ellipse(-6.2 + plumeWag * 0.3, (isSleeping ? -9.0 : -13.2) + plumeWag * 0.2, 4.4, 3.0, -0.2, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Compact cloud-like round torso
    fillShadedEllipse(
      c,
      -0.8,
      (isSleeping ? -4.8 : -7.6) + sleepBreath * 0.14,
      isSleeping ? 9.4 : 9.8,
      (isSleeping ? 5.8 : 6.8) + sleepBreath * 0.18,
      -0.05,
      coatTop,
      coatBase
    );

    // Big plush cream neck & chest ruff
    c.fillStyle = cream;
    c.beginPath();
    c.ellipse(4.8, isSleeping ? -5.0 : -8.2, 5.6, 5.8, 0.14, 0, Math.PI * 2);
    c.ellipse(2.0, isSleeping ? -4.2 : -6.8, 4.6, 4.4, 0.08, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 6.0 : 6.8;
    const headY = isSleeping ? -8.6 : -12.6;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, cream, coatTop, () => {
      // Far tiny pointed spitz ear
      c.fillStyle = earTip;
      c.beginPath();
      c.moveTo(headX + 1.0, headY - 3.6);
      c.lineTo(headX + 3.2, headY - 8.2 + earBounce * 0.3);
      c.lineTo(headX + 4.4, headY - 2.6);
      c.closePath();
      c.fill();

      // Plush round foxy head
      fillShadedEllipse(c, headX, headY, 5.8, 5.4, 0, coatTop, coatBase);

      // Cream cheek fluffs
      c.fillStyle = cream;
      c.beginPath();
      c.ellipse(headX - 1.0, headY + 2.2, 3.8, 2.5, 0.1, 0, Math.PI * 2);
      c.ellipse(headX + 3.4, headY + 1.6, 3.0, 2.1, -0.08, 0, Math.PI * 2);
      c.fill();

      // Near tiny pointed ear with warm pink inner ear
      c.fillStyle = coatTop;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.75;
      c.beginPath();
      c.moveTo(headX - 3.6, headY - 2.6);
      c.lineTo(headX - 2.8, headY - 8.4 + earBounce * 0.35);
      c.lineTo(headX + 0.2, headY - 3.8);
      c.closePath();
      c.fill();
      c.stroke();

      c.fillStyle = '#f5a9b8';
      c.beginPath();
      c.moveTo(headX - 2.8, headY - 3.6);
      c.lineTo(headX - 2.4, headY - 6.8 + earBounce * 0.3);
      c.lineTo(headX - 0.8, headY - 4.0);
      c.closePath();
      c.fill();

      // Dainty foxy snout
      fillShadedEllipse(c, headX + 5.2, headY + 1.1, 2.6, 2.0, 0.05, cream, coatTop);
      drawMouthAndTongue(c, headX + 5.0, headY + 2.2, isSleeping, isJoyful, showTongue, animPhase, '#2c1e18', isDrinking);
      drawGlossyNose(c, headX + 7.4, headY + 0.7, 1.35, 1.0, '#17151a');
      drawDogEye(c, headX + 2.4, headY - 0.6, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#2b1b12',
        lidColor: coatTop,
        radius: 1.65
      });
    }, { dipAngle: 0.56, dipTx: 1.4, dipTy: 3.4, neckRx: 4.8, neckRy: 3.6 });
  } else if (breed === 'frenchBulldog') {
    // French Bulldog (compact stocky fawn pup with iconic oversized bat ears & flat dark mask)
    const coatTop = isShiny ? shadeHex(shinyColor, 0.28) : '#e9cda3';
    const coatBase = isShiny ? shadeHex(shinyColor, 0.0) : '#cfad7c';
    const mask = isShiny ? shadeHex(shinyColor, -0.58) : '#2a2426';
    const chest = isShiny ? shadeHex(shinyColor, 0.52) : '#faf2e4';

    const legs: FourLegsConfig = {
      backX: -6.6,
      frontX: 5.8,
      yTop: -1.8,
      w: 3.4,
      h: 7.4,
      swing: legSwing,
      legCol: coatBase,
      pawCol: chest,
      pawH: 2.0,
      isSleeping,
      farLegCol: shadeHex(coatBase, -0.22),
      farPawCol: shadeHex(chest, -0.18)
    };

    drawFarPairLegs(c, legs);

    // Tiny cute Frenchie stub tail
    c.save();
    c.fillStyle = coatBase;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.75;
    c.beginPath();
    c.ellipse(-10.8, (isSleeping ? -5.0 : -8.0) + tailWag * 0.18, 2.0, 1.5, -0.3, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.restore();

    // Compact muscular barrel chest & cobby body
    fillShadedEllipse(
      c,
      -0.8,
      (isSleeping ? -5.4 : -8.4) + sleepBreath * 0.14,
      isSleeping ? 10.6 : 10.8,
      (isSleeping ? 6.0 : 6.8) + sleepBreath * 0.18,
      0.06,
      coatTop,
      coatBase
    );

    // Broad cream chest
    c.fillStyle = chest;
    c.beginPath();
    c.ellipse(5.8, isSleeping ? -4.8 : -7.8, 4.4, 5.2, 0.12, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 6.8 : 7.6;
    const headY = isSleeping ? -9.2 : -13.6;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
      // Far iconic oversized rounded bat ear
      c.fillStyle = mask;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.8;
      c.beginPath();
      c.ellipse(headX + 3.0, headY - 7.6 + earBounce * 0.25, 3.0, 5.4, 0.28, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = '#d99aa6';
      c.beginPath();
      c.ellipse(headX + 3.2, headY - 7.2 + earBounce * 0.25, 1.7, 3.6, 0.28, 0, Math.PI * 2);
      c.fill();

      // Broad square Frenchie head
      fillShadedEllipse(c, headX, headY, 6.4, 6.0, 0, coatTop, coatBase);

      // Near iconic oversized rounded bat ear
      c.fillStyle = coatBase;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.85;
      c.beginPath();
      c.ellipse(headX - 3.6, headY - 7.8 + earBounce * 0.3, 3.2, 5.8, -0.22, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = '#e8aeb8';
      c.beginPath();
      c.ellipse(headX - 3.2, headY - 7.4 + earBounce * 0.3, 1.8, 3.8, -0.22, 0, Math.PI * 2);
      c.fill();

      // Dark brachycephalic mask & adorable rounded jowls
      c.fillStyle = mask;
      c.beginPath();
      c.ellipse(headX + 4.8, headY + 1.4, 3.8, 3.5, 0.04, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = shadeHex(mask, 0.14);
      c.beginPath();
      c.ellipse(headX + 4.0, headY + 3.2, 2.7, 2.0, 0.1, 0, Math.PI * 2);
      c.fill();

      drawMouthAndTongue(c, headX + 4.8, headY + 3.4, isSleeping, isJoyful, showTongue, animPhase, '#141114', isDrinking);
      drawGlossyNose(c, headX + 7.2, headY + 0.6, 1.8, 1.3, '#100e12');
      drawDogEye(c, headX + 2.5, headY - 0.8, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#2c1e16',
        lidColor: coatTop,
        radius: 1.8
      });
    }, { dipAngle: 0.52, dipTx: 1.4, dipTy: 3.6, neckRx: 5.2, neckRy: 4.0 });
  } else if (breed === 'cockerSpaniel') {
    // Cocker Spaniel (golden-buff silky coat with long wavy drooping ears & feathered paws)
    const coatTop = isShiny ? shadeHex(shinyColor, 0.28) : '#f0c47a';
    const coatBase = isShiny ? shadeHex(shinyColor, -0.02) : '#d49a4c';
    const earCol = isShiny ? shadeHex(shinyColor, -0.18) : '#b57830';
    const feather = isShiny ? shadeHex(shinyColor, 0.5) : '#fce8be';

    const legs: FourLegsConfig = {
      backX: -7.8,
      frontX: 6.4,
      yTop: -2.4,
      w: 3.3,
      h: 8.8,
      swing: legSwing,
      legCol: coatBase,
      pawCol: feather,
      pawH: 2.5,
      isSleeping,
      farLegCol: shadeHex(coatBase, -0.22),
      farPawCol: shadeHex(feather, -0.18),
      opts: { featherColor: feather }
    };

    drawFarPairLegs(c, legs);

    // Merry feathered spaniel wagging tail
    const wag = isSleeping ? tailWag * 0.4 : Math.sin(wagPhase * 2.8) * 3.0 * moodWagAmp;
    c.save();
    c.strokeStyle = coatBase;
    c.lineWidth = 4.2;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-11.4, isSleeping ? -5.8 : -9.4);
    c.quadraticCurveTo(-14.6, (isSleeping ? -7.8 : -12.0) + wag * 0.5, -16.8, (isSleeping ? -9.6 : -14.2) + wag);
    c.stroke();
    c.strokeStyle = feather;
    c.lineWidth = 2.0;
    c.stroke();
    c.restore();

    // Silky balanced spaniel torso
    fillShadedEllipse(
      c,
      -0.8,
      (isSleeping ? -6.0 : -9.2) + sleepBreath * 0.14,
      isSleeping ? 11.8 : 12.2,
      (isSleeping ? 6.0 : 6.9) + sleepBreath * 0.18,
      -0.04,
      coatTop,
      coatBase
    );

    // Silky feathered chest & belly fringe
    c.fillStyle = feather;
    c.beginPath();
    c.ellipse(5.8, isSleeping ? -5.2 : -8.4, 4.8, 5.4, 0.18, 0, Math.PI * 2);
    c.ellipse(-1.2, isSleeping ? -3.4 : -5.6, 8.6, 2.5, 0, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 7.6 : 8.6;
    const headY = isSleeping ? -10.0 : -15.2;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
      // Far long wavy ear peeking behind cheek
      c.fillStyle = shadeHex(earCol, -0.18);
      c.beginPath();
      c.ellipse(headX + 3.6, headY + 4.2 + earBounce * 0.55, 2.6, 6.8, -0.12, 0, Math.PI * 2);
      c.fill();

      // Domed classic spaniel skull
      fillShadedEllipse(c, headX, headY, 6.2, 5.8, -0.04, coatTop, coatBase);

      // Gentle rounded spaniel muzzle
      fillShadedEllipse(c, headX + 5.6, headY + 1.4, 3.8, 2.9, 0.06, feather, coatTop);

      // Iconic long lush wavy Cocker Spaniel ear sweeping down past chin
      c.fillStyle = earCol;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.85;
      c.beginPath();
      c.moveTo(headX - 3.6, headY - 2.6 + earBounce * 0.35);
      c.bezierCurveTo(
        headX - 8.2, headY + 1.6 + earBounce * 0.55,
        headX - 7.8, headY + 9.2 + earBounce * 0.8,
        headX - 3.4, headY + 11.4 + earBounce * 0.85
      );
      c.bezierCurveTo(
        headX + 0.2, headY + 10.6 + earBounce * 0.75,
        headX + 0.8, headY + 4.4 + earBounce * 0.55,
        headX - 0.6, headY - 1.6 + earBounce * 0.35
      );
      c.closePath();
      c.fill();
      c.stroke();

      // Silky wave highlight on ear
      c.strokeStyle = coatTop;
      c.lineWidth = 1.25;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(headX - 4.4, headY + 1.0 + earBounce * 0.5);
      c.quadraticCurveTo(headX - 5.4, headY + 5.2 + earBounce * 0.7, headX - 3.6, headY + 8.6 + earBounce * 0.8);
      c.stroke();

      drawMouthAndTongue(c, headX + 5.8, headY + 3.2, isSleeping, isJoyful, showTongue, animPhase, '#3b2416', isDrinking);
      drawGlossyNose(c, headX + 9.0, headY + 0.8, 1.65, 1.25, '#2b1810');
      drawDogEye(c, headX + 2.6, headY - 0.8, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#4e2b14',
        lidColor: coatTop,
        radius: 1.75
      });
    }, { dipAngle: 0.54, dipTx: 1.6, dipTy: 4.2, neckRx: 5.0, neckRy: 3.8 });
  } else if (breed === 'bassetHound') {
    // Basset Hound (long low tricolor body, short sturdy legs, sweeping velvety droopy ears)
    const white = isShiny ? shadeHex(shinyColor, 0.55) : '#fffaf2';
    const tanTop = isShiny ? shadeHex(shinyColor, 0.14) : '#cf7f3e';
    const tanBase = isShiny ? shadeHex(shinyColor, -0.08) : '#ae6227';
    const saddle = isShiny ? shadeHex(shinyColor, -0.52) : '#2a262c';

    const legs: FourLegsConfig = {
      backX: -10.8,
      frontX: 8.8,
      yTop: -1.2,
      w: 3.8,
      h: 5.6,
      swing: legSwing * 0.75,
      legCol: white,
      pawCol: white,
      pawH: 2.0,
      isSleeping,
      farLegCol: shadeHex(white, -0.16),
      farPawCol: shadeHex(white, -0.2)
    };

    drawFarPairLegs(c, legs);

    // Classic upright white-tipped hound tail
    const wag = isSleeping ? tailWag * 0.45 : Math.sin(wagPhase * 1.9) * 2.5 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = tanBase;
    c.lineWidth = 3.8;
    c.beginPath();
    c.moveTo(-14.8, isSleeping ? -4.8 : -7.4);
    c.quadraticCurveTo(-18.6, (isSleeping ? -7.8 : -11.4) + wag * 0.4, -17.6, (isSleeping ? -11.2 : -15.6) + wag);
    c.stroke();
    c.strokeStyle = white;
    c.lineWidth = 3.0;
    c.beginPath();
    c.moveTo(-18.0, (isSleeping ? -9.8 : -13.6) + wag * 0.75);
    c.lineTo(-17.6, (isSleeping ? -11.5 : -16.0) + wag);
    c.stroke();
    c.restore();

    // Long low-slung Basset torso
    fillShadedEllipse(
      c,
      -0.8,
      (isSleeping ? -4.8 : -7.0) + sleepBreath * 0.14,
      isSleeping ? 15.2 : 16.0,
      (isSleeping ? 5.6 : 6.4) + sleepBreath * 0.18,
      -0.02,
      white,
      shadeHex(white, -0.08)
    );

    // Warm tan haunch & shoulder patches
    c.fillStyle = tanTop;
    c.beginPath();
    c.ellipse(-10.8, isSleeping ? -5.8 : -8.2, 5.2, 4.4, -0.1, 0, Math.PI * 2);
    c.ellipse(6.2, isSleeping ? -5.6 : -8.0, 5.2, 4.4, 0.12, 0, Math.PI * 2);
    c.fill();

    // Iconic black hound saddle across long back
    c.fillStyle = saddle;
    c.beginPath();
    c.ellipse(-2.2, isSleeping ? -6.8 : -9.4, 8.8, 4.3, -0.03, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 11.2 : 12.4;
    const headY = isSleeping ? -8.4 : -11.6;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, tanTop, tanBase, () => {
      // Far sweeping ear
      c.fillStyle = shadeHex(tanBase, -0.24);
      c.beginPath();
      c.ellipse(headX + 3.2, headY + 5.6 + earBounce * 0.5, 2.5, 7.6, -0.08, 0, Math.PI * 2);
      c.fill();

      // Long noble domed Basset head
      fillShadedEllipse(c, headX, headY, 6.4, 5.6, 0.04, tanTop, tanBase);

      // White blaze & long squared-off Basset muzzle
      fillShadedEllipse(c, headX + 6.4, headY + 1.6, 4.6, 3.2, 0.06, white, shadeHex(white, -0.08));
      c.fillStyle = tanTop;
      c.beginPath();
      c.ellipse(headX + 4.4, headY + 0.2, 3.0, 2.2, 0.1, 0, Math.PI * 2);
      c.fill();

      // Iconic extra-long sweeping velvety Basset ear hanging almost to ground
      c.fillStyle = tanBase;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.85;
      c.beginPath();
      c.moveTo(headX - 4.0, headY - 1.8 + earBounce * 0.3);
      c.bezierCurveTo(
        headX - 8.4, headY + 3.4 + earBounce * 0.55,
        headX - 7.2, headY + 12.2 + earBounce * 0.85,
        headX - 2.6, headY + 13.8 + earBounce * 0.9
      );
      c.bezierCurveTo(
        headX + 1.2, headY + 12.6 + earBounce * 0.75,
        headX + 0.8, headY + 4.6 + earBounce * 0.5,
        headX - 0.8, headY - 1.2 + earBounce * 0.3
      );
      c.closePath();
      c.fill();
      c.stroke();

      drawMouthAndTongue(c, headX + 6.8, headY + 3.6, isSleeping, isJoyful, showTongue, animPhase, '#2c1e16', isDrinking);
      drawGlossyNose(c, headX + 10.6, headY + 1.0, 1.85, 1.35, '#151318');
      drawDogEye(c, headX + 2.6, headY - 0.7, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#4c2c16',
        lidColor: tanTop,
        radius: 1.7
      });
    }, { dipAngle: 0.44, dipTx: 1.2, dipTy: 2.6, neckRx: 5.2, neckRy: 3.8 });
  } else if (breed === 'boxer') {
    // Boxer (deep athletic fawn chest, crisp white blaze & socks, dark square mask, bouncy build)
    const fawnTop = isShiny ? shadeHex(shinyColor, 0.22) : '#d98f4a';
    const fawnBase = isShiny ? shadeHex(shinyColor, -0.08) : '#b56c2c';
    const maskBlack = isShiny ? shadeHex(shinyColor, -0.6) : '#231f24';
    const white = isShiny ? shadeHex(shinyColor, 0.58) : '#fffdf8';

    const legs: FourLegsConfig = {
      backX: -8.6,
      frontX: 7.4,
      yTop: -3.2,
      w: 3.7,
      h: 10.8,
      swing: legSwing,
      legCol: fawnBase,
      pawCol: white,
      pawH: 4.0,
      isSleeping,
      farLegCol: shadeHex(fawnBase, -0.22),
      farPawCol: shadeHex(white, -0.18)
    };

    drawFarPairLegs(c, legs);

    // Classic jaunty short upright Boxer tail
    const wag = isSleeping ? tailWag * 0.3 : Math.sin(wagPhase * 2.8) * 2.0 * moodWagAmp;
    c.save();
    c.strokeStyle = fawnBase;
    c.lineWidth = 3.8;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-12.2, isSleeping ? -6.8 : -11.4);
    c.lineTo(-14.6 + wag * 0.4, (isSleeping ? -9.2 : -15.0) + wag * 0.3);
    c.stroke();
    c.restore();

    // Deep muscular athletic Boxer chest with tucked waist
    fillShadedEllipse(
      c,
      -1.2,
      (isSleeping ? -6.6 : -10.8) + sleepBreath * 0.16,
      isSleeping ? 13.0 : 13.6,
      (isSleeping ? 6.6 : 7.6) + sleepBreath * 0.18,
      -0.08,
      fawnTop,
      fawnBase
    );

    // Crisp white Boxer chest blaze
    c.fillStyle = white;
    c.beginPath();
    c.ellipse(7.0, isSleeping ? -6.2 : -10.0, 4.4, 6.2, 0.18, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 8.8 : 9.8;
    const headY = isSleeping ? -11.4 : -18.2;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, fawnTop, fawnBase, () => {
      // Far folded dark ear
      c.fillStyle = shadeHex(maskBlack, 0.08);
      c.beginPath();
      c.ellipse(headX + 2.8, headY + 1.4 + earBounce * 0.45, 2.2, 4.4, -0.22, 0, Math.PI * 2);
      c.fill();

      // Square sculpted Boxer skull
      fillShadedEllipse(c, headX, headY, 6.4, 6.0, -0.04, fawnTop, fawnBase);

      // Thin crisp white forehead stripe
      c.fillStyle = white;
      c.beginPath();
      c.ellipse(headX + 3.6, headY - 2.2, 1.3, 2.8, 0.25, 0, Math.PI * 2);
      c.fill();

      // Iconic broad square black Boxer muzzle & flews
      c.fillStyle = maskBlack;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(headX + 2.8, headY - 1.4);
      c.lineTo(headX + 9.2, headY - 0.6);
      c.quadraticCurveTo(headX + 9.8, headY + 3.4, headX + 7.6, headY + 4.8);
      c.quadraticCurveTo(headX + 4.2, headY + 5.2, headX + 2.0, headY + 3.8);
      c.closePath();
      c.fill();
      c.stroke();

      // Near dark high-set folded ear
      c.fillStyle = maskBlack;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(headX - 3.8, headY - 3.2 + earBounce * 0.35);
      c.quadraticCurveTo(headX - 7.0, headY + 1.4 + earBounce * 0.6, headX - 3.2, headY + 5.2 + earBounce * 0.7);
      c.quadraticCurveTo(headX - 0.4, headY + 2.2 + earBounce * 0.45, headX - 0.6, headY - 2.6 + earBounce * 0.35);
      c.closePath();
      c.fill();
      c.stroke();

      drawMouthAndTongue(c, headX + 6.0, headY + 4.0, isSleeping, isJoyful, showTongue, animPhase, '#100e14', isDrinking);
      drawGlossyNose(c, headX + 8.9, headY + 0.8, 1.85, 1.35, '#0c0d12');
      drawDogEye(c, headX + 2.8, headY - 0.9, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#4d2b14',
        lidColor: fawnTop,
        radius: 1.75
      });
    }, { dipAngle: 0.56, dipTx: 2.0, dipTy: 5.4, neckRx: 5.4, neckRy: 4.2 });
  } else if (breed === 'cattleDog') {
    // Australian Cattle Dog (Blue Heeler — speckled blue-grey coat, tan legs & eyebrow pips, eye patch)
    const blueTop = isShiny ? shadeHex(shinyColor, 0.26) : '#8e9eb4';
    const blueBase = isShiny ? shadeHex(shinyColor, -0.04) : '#65768e';
    const darkPatch = isShiny ? shadeHex(shinyColor, -0.46) : '#2a3444';
    const tan = isShiny ? shadeHex(shinyColor, 0.14) : '#d48745';
    const speckle = isShiny ? shadeHex(shinyColor, 0.54) : '#d9e3f0';

    const legs: FourLegsConfig = {
      backX: -8.4,
      frontX: 6.8,
      yTop: -2.8,
      w: 3.5,
      h: 9.8,
      swing: legSwing,
      legCol: tan,
      pawCol: shadeHex(tan, 0.18),
      pawH: 2.4,
      isSleeping,
      farLegCol: shadeHex(tan, -0.22),
      farPawCol: shadeHex(tan, -0.25)
    };

    drawFarPairLegs(c, legs);

    // Bushy heeler tail with dark base & light tip
    const wag = isSleeping ? tailWag * 0.4 : Math.sin(wagPhase * 2.2) * 2.6 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = blueBase;
    c.lineWidth = 4.4;
    c.beginPath();
    c.moveTo(-12.2, isSleeping ? -6.4 : -10.2);
    c.quadraticCurveTo(-16.2, (isSleeping ? -5.8 : -9.0) + wag * 0.5, -19.2, (isSleeping ? -7.8 : -11.6) + wag);
    c.stroke();
    c.strokeStyle = speckle;
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(-17.4, (isSleeping ? -6.8 : -10.4) + wag * 0.8);
    c.lineTo(-19.5, (isSleeping ? -7.9 : -11.8) + wag);
    c.stroke();
    c.restore();

    // Sturdy compact working heeler torso
    fillShadedEllipse(
      c,
      -0.8,
      (isSleeping ? -6.2 : -9.8) + sleepBreath * 0.14,
      isSleeping ? 12.8 : 13.4,
      (isSleeping ? 6.4 : 7.2) + sleepBreath * 0.18,
      -0.04,
      blueTop,
      blueBase
    );

    // Dark blue-black rump saddle & mottled heeler ticking speckles
    c.fillStyle = darkPatch;
    c.beginPath();
    c.ellipse(-6.8, isSleeping ? -7.6 : -11.4, 5.4, 3.6, -0.15, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = speckle;
    const spots: Array<[number, number, number]> = [
      [-5.2, -10.0, 1.1], [-2.0, -11.6, 1.3], [1.4, -10.4, 1.1],
      [-0.4, -8.2, 1.2], [3.6, -9.2, 1.0], [-8.8, -9.0, 1.0], [5.2, -11.4, 1.1]
    ];
    const yOff = isSleeping ? 3.5 : 0;
    spots.forEach(([sx, sy, sr]) => {
      c.beginPath();
      c.arc(sx, sy + yOff, sr, 0, Math.PI * 2);
      c.fill();
    });

    // Tan chest & belly accents
    c.fillStyle = tan;
    c.beginPath();
    c.ellipse(6.2, isSleeping ? -5.6 : -9.0, 4.4, 5.0, 0.15, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 8.2 : 9.4;
    const headY = isSleeping ? -10.6 : -16.4;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, blueTop, blueBase, () => {
      // Far pointed upright ear
      c.fillStyle = darkPatch;
      c.beginPath();
      c.moveTo(headX + 1.0, headY - 3.6);
      c.lineTo(headX + 4.0, headY - 10.2 + earBounce * 0.25);
      c.lineTo(headX + 4.8, headY - 2.6);
      c.closePath();
      c.fill();

      // Broad alert heeler skull
      fillShadedEllipse(c, headX, headY, 6.2, 5.6, -0.04, blueTop, blueBase);

      // Dark blue eye mask & classic white Bentley star on forehead
      c.fillStyle = darkPatch;
      c.beginPath();
      c.ellipse(headX + 2.2, headY - 1.2, 3.6, 3.0, 0.1, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = speckle;
      c.beginPath();
      c.ellipse(headX + 1.2, headY - 3.6, 1.3, 1.0, 0, 0, Math.PI * 2);
      c.fill();

      // Tan cheek & sturdy muzzle
      fillShadedEllipse(c, headX + 5.8, headY + 1.2, 4.0, 2.7, 0.04, tan, shadeHex(tan, -0.15));
      c.fillStyle = tan;
      c.beginPath();
      c.ellipse(headX + 0.6, headY + 2.2, 3.2, 2.2, 0.08, 0, Math.PI * 2);
      // Warm tan eyebrow pip
      c.ellipse(headX + 3.0, headY - 2.5, 1.2, 0.7, -0.15, 0, Math.PI * 2);
      c.fill();

      // Near pointed upright ear
      c.fillStyle = darkPatch;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(headX - 4.0, headY - 2.6);
      c.lineTo(headX - 3.2, headY - 10.6 + earBounce * 0.3);
      c.lineTo(headX + 0.4, headY - 4.0);
      c.closePath();
      c.fill();
      c.stroke();

      drawMouthAndTongue(c, headX + 6.0, headY + 3.0, isSleeping, isJoyful, showTongue, animPhase, '#1e1918', isDrinking);
      drawGlossyNose(c, headX + 9.4, headY + 0.7, 1.65, 1.25, '#12141a');
      drawDogEye(c, headX + 2.8, headY - 0.8, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#3c2414',
        lidColor: darkPatch,
        radius: 1.65
      });
    }, { dipAngle: 0.54, dipTx: 1.8, dipTy: 4.8, neckRx: 5.2, neckRy: 4.0 });
  } else if (breed === 'chowChow') {
    // Chow Chow (plush cinnamon-red lion mane, tiny rounded upright ears, curled tail, signature blue-black tongue)
    const coatTop = isShiny ? shadeHex(shinyColor, 0.24) : '#d47432';
    const coatBase = isShiny ? shadeHex(shinyColor, -0.06) : '#ad5119';
    const maneLight = isShiny ? shadeHex(shinyColor, 0.42) : '#ea9854';
    const deepShade = isShiny ? shadeHex(shinyColor, -0.26) : '#83370e';

    const legs: FourLegsConfig = {
      backX: -7.8,
      frontX: 6.4,
      yTop: -2.6,
      w: 4.2,
      h: 9.2,
      swing: legSwing * 0.85,
      legCol: coatBase,
      pawCol: maneLight,
      pawH: 2.2,
      isSleeping,
      farLegCol: deepShade,
      farPawCol: shadeHex(maneLight, -0.22),
      opts: { featherColor: maneLight }
    };

    drawFarPairLegs(c, legs);

    // Thick plumed Chow tail curled tight over the back
    const wag = isSleeping ? tailWag * 0.35 : Math.sin(wagPhase * 1.9) * 1.6 * moodWagAmp;
    c.save();
    c.fillStyle = maneLight;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.85;
    c.beginPath();
    c.ellipse(-10.2 + wag * 0.3, (isSleeping ? -9.2 : -14.2) + wag * 0.25, 5.8, 4.4, -0.35, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = coatTop;
    c.beginPath();
    c.ellipse(-7.4 + wag * 0.25, (isSleeping ? -10.4 : -15.6) + wag * 0.2, 4.4, 3.0, -0.15, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Plush broad square Chow body
    fillShadedEllipse(
      c,
      -1.2,
      (isSleeping ? -6.4 : -10.0) + sleepBreath * 0.16,
      isSleeping ? 12.8 : 13.4,
      (isSleeping ? 7.2 : 8.2) + sleepBreath * 0.2,
      -0.02,
      coatTop,
      coatBase
    );

    // Massive iconic layered lion-mane ruff encircling neck and chest
    c.fillStyle = maneLight;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.8;
    c.beginPath();
    c.ellipse(5.8, isSleeping ? -7.2 : -11.6, 7.6, 8.2, 0.1, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = coatTop;
    c.beginPath();
    c.ellipse(4.0, isSleeping ? -8.4 : -13.2, 6.2, 6.4, 0.05, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 7.8 : 8.8;
    const headY = isSleeping ? -10.8 : -16.2;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, maneLight, coatTop, () => {
      // Far tiny thick rounded ear
      c.fillStyle = deepShade;
      c.beginPath();
      c.ellipse(headX + 2.6, headY - 5.8 + earBounce * 0.2, 2.0, 2.6, 0.25, 0, Math.PI * 2);
      c.fill();

      // Broad bear-like plush head framed by mane cheek ruffs
      fillShadedEllipse(c, headX, headY, 6.6, 6.2, 0, coatTop, coatBase);
      c.fillStyle = maneLight;
      c.beginPath();
      c.ellipse(headX - 2.6, headY + 1.4, 3.6, 4.4, 0.12, 0, Math.PI * 2);
      c.fill();

      // Near tiny thick rounded forward-tilted ear
      c.fillStyle = coatBase;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.8;
      c.beginPath();
      c.ellipse(headX - 3.4, headY - 5.6 + earBounce * 0.25, 2.2, 2.9, -0.18, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Broad blunt bear-like Chow muzzle
      fillShadedEllipse(c, headX + 5.2, headY + 1.4, 3.6, 3.0, 0.04, maneLight, coatTop);

      // Signature Chow Chow blue-black panting tongue!
      drawMouthAndTongue(
        c,
        headX + 5.2,
        headY + 3.2,
        isSleeping,
        isJoyful,
        showTongue,
        animPhase,
        '#251b2b',
        isDrinking,
        '#433c66',
        '#251f3d'
      );
      drawGlossyNose(c, headX + 8.4, headY + 0.8, 1.85, 1.35, '#17151f');
      drawDogEye(c, headX + 2.5, headY - 0.8, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#281810',
        lidColor: coatTop,
        almond: true,
        radius: 1.55
      });
    }, { dipAngle: 0.5, dipTx: 1.6, dipTy: 4.4, neckRx: 6.4, neckRy: 5.0 });
  } else if (breed === 'malinois') {
    // Belgian Malinois (sleek mahogany-fawn athlete with razor-sharp black facial mask & tall dark ears)
    const fawnTop = isShiny ? shadeHex(shinyColor, 0.24) : '#d59348';
    const fawnBase = isShiny ? shadeHex(shinyColor, -0.06) : '#ae6b28';
    const overlay = isShiny ? shadeHex(shinyColor, -0.34) : '#6b411c';
    const maskBlack = isShiny ? shadeHex(shinyColor, -0.62) : '#1d1c22';

    const legs: FourLegsConfig = {
      backX: -9.4,
      frontX: 7.8,
      yTop: -3.4,
      w: 3.4,
      h: 11.2,
      swing: legSwing * 1.08,
      legCol: fawnBase,
      pawCol: maskBlack,
      pawH: 2.4,
      isSleeping,
      farLegCol: shadeHex(fawnBase, -0.22),
      farPawCol: '#121218'
    };

    drawFarPairLegs(c, legs);

    // Sweeping dark-tipped Malinois tail
    const wag = isSleeping ? tailWag * 0.45 : Math.sin(wagPhase * 2.5) * 2.8 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = fawnBase;
    c.lineWidth = 4.2;
    c.beginPath();
    c.moveTo(-13.6, isSleeping ? -6.6 : -10.8);
    c.quadraticCurveTo(-18.2, (isSleeping ? -5.0 : -8.0) + wag * 0.6, -21.6, (isSleeping ? -6.2 : -9.4) + wag);
    c.stroke();
    c.strokeStyle = maskBlack;
    c.lineWidth = 3.2;
    c.beginPath();
    c.moveTo(-19.2, (isSleeping ? -5.6 : -8.7) + wag * 0.8);
    c.lineTo(-22.0, (isSleeping ? -6.3 : -9.6) + wag);
    c.stroke();
    c.restore();

    // Lean aerodynamic athletic torso
    fillShadedEllipse(
      c,
      -1.0,
      (isSleeping ? -6.8 : -11.0) + sleepBreath * 0.15,
      isSleeping ? 14.0 : 14.6,
      (isSleeping ? 6.4 : 7.2) + sleepBreath * 0.18,
      -0.06,
      fawnTop,
      fawnBase
    );

    // Subtle dark mahogany spine overlay
    c.fillStyle = overlay;
    c.beginPath();
    c.ellipse(-2.8, isSleeping ? -8.8 : -13.6, 8.8, 3.0, -0.06, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 9.2 : 10.4;
    const headY = isSleeping ? -11.6 : -18.8;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, fawnTop, fawnBase, () => {
      // Far tall rigid jet-black ear
      c.fillStyle = maskBlack;
      c.beginPath();
      c.moveTo(headX + 0.8, headY - 3.6);
      c.lineTo(headX + 4.4, headY - 12.2 + earBounce * 0.25);
      c.lineTo(headX + 5.0, headY - 2.6);
      c.closePath();
      c.fill();

      // Sleek chiseled Malinois head
      fillShadedEllipse(c, headX, headY, 6.1, 5.4, -0.08, fawnTop, fawnBase);

      // Iconic jet-black full facial mask across muzzle & eye
      c.fillStyle = maskBlack;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(headX + 1.8, headY - 2.8);
      c.lineTo(headX + 10.8, headY - 0.6);
      c.quadraticCurveTo(headX + 11.4, headY + 2.4, headX + 9.6, headY + 3.6);
      c.lineTo(headX + 2.0, headY + 3.4);
      c.closePath();
      c.fill();
      c.stroke();

      // Near tall rigid jet-black pointed ear
      c.fillStyle = maskBlack;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(headX - 4.0, headY - 2.8);
      c.lineTo(headX - 3.0, headY - 12.6 + earBounce * 0.3);
      c.lineTo(headX + 0.8, headY - 4.0);
      c.closePath();
      c.fill();
      c.stroke();

      drawMouthAndTongue(c, headX + 6.8, headY + 3.2, isSleeping, isJoyful, showTongue, animPhase, '#0c0b10', isDrinking);
      drawGlossyNose(c, headX + 10.8, headY + 0.4, 1.7, 1.25, '#09090d');
      drawDogEye(c, headX + 3.2, headY - 0.9, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#5c3314',
        lidColor: maskBlack,
        almond: true,
        radius: 1.65
      });
    }, { dipAngle: 0.56, dipTx: 2.0, dipTy: 5.6, neckRx: 5.0, neckRy: 4.0 });
  } else if (breed === 'doberman') {
    // Doberman (sleek jet-black & crisp rust-tan aerodynamic silhouette, tall pointed ears)
    const coatTop = isShiny ? shadeHex(shinyColor, -0.18) : '#2a2b36';
    const coatBase = isShiny ? shadeHex(shinyColor, -0.44) : '#16171f';
    const rust = isShiny ? shadeHex(shinyColor, 0.32) : '#c86a2b';
    const rustBright = isShiny ? shadeHex(shinyColor, 0.48) : '#df843d';

    const legs: FourLegsConfig = {
      backX: -9.4,
      frontX: 8.0,
      yTop: -3.6,
      w: 3.3,
      h: 11.8,
      swing: legSwing * 1.06,
      legCol: coatBase,
      pawCol: rust,
      pawH: 5.0,
      isSleeping,
      farLegCol: '#0d0e14',
      farPawCol: shadeHex(rust, -0.22)
    };

    drawFarPairLegs(c, legs);

    // Sleek crisp upright Doberman tail
    const wag = isSleeping ? tailWag * 0.25 : Math.sin(wagPhase * 2.4) * 1.8 * moodWagAmp;
    c.save();
    c.strokeStyle = coatBase;
    c.lineWidth = 3.4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-13.4, isSleeping ? -7.0 : -11.8);
    c.lineTo(-15.6 + wag * 0.35, (isSleeping ? -9.6 : -15.4) + wag * 0.25);
    c.stroke();
    c.restore();

    // Sculpted deep-chested Doberman torso with sleek waist tuck
    fillShadedEllipse(
      c,
      -1.2,
      (isSleeping ? -7.0 : -11.6) + sleepBreath * 0.14,
      isSleeping ? 14.0 : 14.6,
      (isSleeping ? 6.4 : 7.4) + sleepBreath * 0.18,
      -0.09,
      coatTop,
      coatBase
    );

    // Classic crisp rust-tan chest triangles
    c.fillStyle = rust;
    c.beginPath();
    c.ellipse(7.2, isSleeping ? -6.4 : -10.8, 3.6, 5.2, 0.22, 0, Math.PI * 2);
    c.fill();

    // Subtle glossy blue-slate athletic highlight along back
    c.strokeStyle = 'rgba(186, 198, 224, 0.24)';
    c.lineWidth = 1.6;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-10.0, isSleeping ? -10.2 : -15.4);
    c.quadraticCurveTo(-1.0, isSleeping ? -11.6 : -17.2, 6.4, isSleeping ? -10.4 : -16.0);
    c.stroke();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 9.4 : 10.6;
    const headY = isSleeping ? -11.8 : -20.0;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
      // Far tall pointed sculpted ear
      c.fillStyle = coatBase;
      c.beginPath();
      c.moveTo(headX + 0.6, headY - 3.6);
      c.lineTo(headX + 3.6, headY - 12.6 + earBounce * 0.2);
      c.lineTo(headX + 4.4, headY - 2.6);
      c.closePath();
      c.fill();

      // Long chiseled wedge Doberman head
      fillShadedEllipse(c, headX, headY, 5.8, 5.2, -0.1, coatTop, coatBase);

      // Long sleek muzzle with crisp rust cheek & lower jaw markings
      fillShadedEllipse(c, headX + 6.8, headY + 1.2, 5.0, 2.7, 0.04, coatTop, coatBase);
      c.fillStyle = rust;
      c.beginPath();
      c.ellipse(headX + 6.4, headY + 2.6, 4.0, 1.5, 0.04, 0, Math.PI * 2);
      c.ellipse(headX + 2.2, headY + 2.2, 2.1, 1.5, 0.1, 0, Math.PI * 2);
      c.fill();
      // Signature crisp rust eyebrow pip
      c.fillStyle = rustBright;
      c.beginPath();
      c.ellipse(headX + 3.2, headY - 2.3, 1.25, 0.72, -0.18, 0, Math.PI * 2);
      c.fill();

      // Near tall pointed sculpted ear
      c.fillStyle = coatTop;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(headX - 3.6, headY - 2.8);
      c.lineTo(headX - 2.4, headY - 13.0 + earBounce * 0.25);
      c.lineTo(headX + 0.6, headY - 4.0);
      c.closePath();
      c.fill();
      c.stroke();

      drawMouthAndTongue(c, headX + 7.6, headY + 3.3, isSleeping, isJoyful, showTongue, animPhase, '#0c0d12', isDrinking);
      drawGlossyNose(c, headX + 11.4, headY + 0.6, 1.75, 1.25, '#090a0e');
      drawDogEye(c, headX + 3.0, headY - 0.8, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#5c2d12',
        lidColor: coatTop,
        almond: true,
        radius: 1.65
      });
    }, { dipAngle: 0.58, dipTx: 2.2, dipTy: 6.2, neckRx: 4.8, neckRy: 4.0 });
  } else if (breed === 'akita') {
    // Akita (noble plush Japanese spitz with red-fawn coat, cream urajiro cheeks/chest, curled tail)
    const coatTop = isShiny ? shadeHex(shinyColor, 0.24) : '#d7843c';
    const coatBase = isShiny ? shadeHex(shinyColor, -0.04) : '#b36120';
    const cream = isShiny ? shadeHex(shinyColor, 0.56) : '#fff5e4';
    const deepFawn = isShiny ? shadeHex(shinyColor, -0.26) : '#8b4613';

    const legs: FourLegsConfig = {
      backX: -9.2,
      frontX: 7.6,
      yTop: -3.2,
      w: 4.2,
      h: 10.8,
      swing: legSwing * 0.94,
      legCol: cream,
      pawCol: cream,
      pawH: 2.4,
      isSleeping,
      farLegCol: shadeHex(cream, -0.16),
      farPawCol: shadeHex(cream, -0.2),
      opts: { featherColor: cream }
    };

    drawFarPairLegs(c, legs);

    // Massive plush curled Akita tail resting over the back
    const wag = isSleeping ? tailWag * 0.35 : Math.sin(wagPhase * 1.9) * 1.8 * moodWagAmp;
    c.save();
    c.fillStyle = cream;
    c.strokeStyle = SOFT_OUTLINE;
    c.lineWidth = 0.85;
    c.beginPath();
    c.ellipse(-11.8 + wag * 0.3, (isSleeping ? -10.0 : -15.6) + wag * 0.25, 6.2, 4.8, -0.4, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = coatTop;
    c.beginPath();
    c.ellipse(-9.0 + wag * 0.25, (isSleeping ? -11.4 : -17.0) + wag * 0.2, 4.8, 3.2, -0.2, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Broad muscular plush Akita torso
    fillShadedEllipse(
      c,
      -1.2,
      (isSleeping ? -7.0 : -11.2) + sleepBreath * 0.16,
      isSleeping ? 14.6 : 15.2,
      (isSleeping ? 7.4 : 8.4) + sleepBreath * 0.2,
      -0.04,
      coatTop,
      coatBase
    );

    // Cream urajiro chest ruff & belly undercoat
    c.fillStyle = cream;
    c.beginPath();
    c.ellipse(7.2, isSleeping ? -6.4 : -10.6, 5.8, 7.0, 0.15, 0, Math.PI * 2);
    c.ellipse(-1.4, isSleeping ? -3.4 : -6.6, 10.6, 3.2, 0, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 9.4 : 10.6;
    const headY = isSleeping ? -11.8 : -18.4;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, cream, () => {
      // Far thick forward-tilted Akita ear
      c.fillStyle = deepFawn;
      c.beginPath();
      c.moveTo(headX + 1.0, headY - 4.0);
      c.lineTo(headX + 4.4, headY - 10.0 + earBounce * 0.22);
      c.lineTo(headX + 5.0, headY - 2.6);
      c.closePath();
      c.fill();

      // Broad noble bear-spitz head
      fillShadedEllipse(c, headX, headY, 6.8, 6.2, -0.02, coatTop, coatBase);

      // Iconic white urajiro cheeks & broad muzzle
      c.fillStyle = cream;
      c.beginPath();
      c.ellipse(headX + 0.4, headY + 2.4, 5.4, 3.3, 0.06, 0, Math.PI * 2);
      c.ellipse(headX + 5.8, headY + 1.6, 4.0, 3.0, 0.04, 0, Math.PI * 2);
      c.fill();

      // Near thick forward-tilted triangular ear
      c.fillStyle = coatTop;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.85;
      c.beginPath();
      c.moveTo(headX - 4.0, headY - 2.8);
      c.lineTo(headX - 2.4, headY - 10.4 + earBounce * 0.25);
      c.lineTo(headX + 1.0, headY - 4.2);
      c.closePath();
      c.fill();
      c.stroke();

      drawMouthAndTongue(c, headX + 6.0, headY + 3.4, isSleeping, isJoyful, showTongue, animPhase, '#2a1c14', isDrinking);
      drawGlossyNose(c, headX + 9.4, headY + 0.9, 1.85, 1.35, '#141318');
      drawDogEye(c, headX + 2.8, headY - 0.8, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#3a2214',
        lidColor: coatTop,
        almond: true,
        radius: 1.55
      });
    }, { dipAngle: 0.54, dipTx: 2.0, dipTy: 5.4, neckRx: 6.2, neckRy: 4.6 });
  } else if (breed === 'newfoundland') {
    // Newfoundland (massive gentle bear-like water giant, glossy jet-black shaggy coat & white chest star)
    const coatTop = isShiny ? shadeHex(shinyColor, -0.16) : '#2a2e3b';
    const coatBase = isShiny ? shadeHex(shinyColor, -0.44) : '#141720';
    const feather = isShiny ? shadeHex(shinyColor, -0.06) : '#383e50';
    const starWhite = isShiny ? shadeHex(shinyColor, 0.56) : '#f8f9fc';

    const legs: FourLegsConfig = {
      backX: -10.2,
      frontX: 8.6,
      yTop: -3.4,
      w: 4.8,
      h: 11.2,
      swing: legSwing * 0.88,
      legCol: coatBase,
      pawCol: '#1b1f2b',
      pawH: 2.8,
      isSleeping,
      farLegCol: '#0d0f16',
      farPawCol: '#0f121a',
      opts: { featherColor: feather }
    };

    drawFarPairLegs(c, legs);

    // Wide feathered Newfoundland rudder tail
    const wag = isSleeping ? tailWag * 0.4 : Math.sin(wagPhase * 1.7) * 2.4 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = coatBase;
    c.lineWidth = 6.2;
    c.beginPath();
    c.moveTo(-15.0, isSleeping ? -7.2 : -11.4);
    c.quadraticCurveTo(-20.2, (isSleeping ? -5.8 : -8.6) + wag * 0.5, -23.8, (isSleeping ? -7.2 : -9.6) + wag);
    c.stroke();
    c.strokeStyle = feather;
    c.lineWidth = 2.6;
    c.stroke();
    c.restore();

    // Massive bear-like shaggy torso
    fillShadedEllipse(
      c,
      -1.0,
      (isSleeping ? -7.6 : -12.0) + sleepBreath * 0.18,
      isSleeping ? 16.0 : 16.6,
      (isSleeping ? 8.4 : 9.6) + sleepBreath * 0.22,
      -0.03,
      coatTop,
      coatBase
    );

    // Shaggy chest ruff + crisp white Newfoundland chest star
    c.fillStyle = feather;
    c.beginPath();
    c.ellipse(8.2, isSleeping ? -6.8 : -11.2, 6.6, 7.6, 0.14, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = starWhite;
    c.beginPath();
    c.ellipse(10.6, isSleeping ? -6.2 : -10.6, 2.6, 3.6, 0.2, 0, Math.PI * 2);
    c.fill();

    // Glossy dark coat sheen along massive back
    c.strokeStyle = 'rgba(182, 200, 232, 0.22)';
    c.lineWidth = 2.2;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-11.2, isSleeping ? -11.8 : -17.4);
    c.quadraticCurveTo(-1.0, isSleeping ? -13.6 : -19.6, 7.4, isSleeping ? -12.2 : -18.0);
    c.stroke();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 10.6 : 12.0;
    const headY = isSleeping ? -12.4 : -19.6;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
      // Far soft heavy floppy ear
      c.fillStyle = '#0f1119';
      c.beginPath();
      c.ellipse(headX + 3.4, headY + 2.4 + earBounce * 0.45, 2.8, 5.4, -0.16, 0, Math.PI * 2);
      c.fill();

      // Massive broad gentle Newfie skull
      fillShadedEllipse(c, headX, headY, 7.8, 7.2, -0.02, coatTop, coatBase);

      // Broad deep square gentle muzzle
      fillShadedEllipse(c, headX + 6.4, headY + 1.8, 4.6, 3.8, 0.04, feather, coatBase);

      // Near soft heavy velvety floppy ear
      c.fillStyle = coatBase;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.85;
      c.beginPath();
      c.moveTo(headX - 4.6, headY - 3.2 + earBounce * 0.35);
      c.quadraticCurveTo(headX - 8.6, headY + 2.2 + earBounce * 0.65, headX - 4.2, headY + 6.8 + earBounce * 0.75);
      c.quadraticCurveTo(headX - 0.6, headY + 3.4 + earBounce * 0.45, headX - 0.8, headY - 2.6 + earBounce * 0.35);
      c.closePath();
      c.fill();
      c.stroke();

      drawMouthAndTongue(c, headX + 6.8, headY + 4.2, isSleeping, isJoyful, showTongue, animPhase, '#090b10', isDrinking);
      drawGlossyNose(c, headX + 10.4, headY + 1.0, 2.1, 1.55, '#07080c');
      drawDogEye(c, headX + 3.0, headY - 0.9, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#523018',
        lidColor: coatTop,
        radius: 1.7
      });
    }, { dipAngle: 0.56, dipTx: 2.2, dipTy: 6.2, neckRx: 6.8, neckRy: 5.2 });
  } else if (breed === 'saintBernard') {
    // Saint Bernard (giant mahogany-and-white alpine rescuer with dark mask)
    const white = isShiny ? shadeHex(shinyColor, 0.58) : '#fffaf2';
    const whiteShade = isShiny ? shadeHex(shinyColor, 0.35) : '#eae0d0';
    const mahogTop = isShiny ? shadeHex(shinyColor, 0.14) : '#b55628';
    const mahogBase = isShiny ? shadeHex(shinyColor, -0.14) : '#873814';
    const maskDark = isShiny ? shadeHex(shinyColor, -0.56) : '#2a1d19';

    const legs: FourLegsConfig = {
      backX: -10.4,
      frontX: 8.8,
      yTop: -3.6,
      w: 4.8,
      h: 11.4,
      swing: legSwing * 0.86,
      legCol: white,
      pawCol: white,
      pawH: 2.8,
      isSleeping,
      farLegCol: shadeHex(whiteShade, -0.14),
      farPawCol: shadeHex(whiteShade, -0.18),
      opts: { featherColor: white }
    };

    drawFarPairLegs(c, legs);

    // Broad feathered Saint Bernard tail
    const wag = isSleeping ? tailWag * 0.4 : Math.sin(wagPhase * 1.65) * 2.4 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = mahogBase;
    c.lineWidth = 6.0;
    c.beginPath();
    c.moveTo(-15.2, isSleeping ? -7.4 : -11.6);
    c.quadraticCurveTo(-20.4, (isSleeping ? -5.6 : -8.4) + wag * 0.5, -24.0, (isSleeping ? -7.0 : -9.4) + wag);
    c.stroke();
    c.strokeStyle = white;
    c.lineWidth = 4.2;
    c.beginPath();
    c.moveTo(-21.2, (isSleeping ? -6.3 : -8.9) + wag * 0.78);
    c.lineTo(-24.2, (isSleeping ? -7.1 : -9.5) + wag);
    c.stroke();
    c.restore();

    // Giant alpine rescue torso
    fillShadedEllipse(
      c,
      -1.0,
      (isSleeping ? -7.8 : -12.2) + sleepBreath * 0.18,
      isSleeping ? 16.2 : 16.8,
      (isSleeping ? 8.6 : 9.8) + sleepBreath * 0.22,
      -0.03,
      white,
      whiteShade
    );

    // Rich mahogany saddle mantle across back and flank
    c.fillStyle = mahogTop;
    c.beginPath();
    c.ellipse(-3.2, isSleeping ? -10.2 : -15.2, 12.2, 6.2, -0.05, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = mahogBase;
    c.beginPath();
    c.ellipse(-5.2, isSleeping ? -11.0 : -16.4, 8.2, 3.4, -0.06, 0, Math.PI * 2);
    c.fill();

    // Lush snow-white alpine chest ruff
    c.fillStyle = white;
    c.beginPath();
    c.ellipse(8.2, isSleeping ? -6.8 : -11.2, 6.6, 7.8, 0.15, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 10.8 : 12.2;
    const headY = isSleeping ? -12.6 : -20.0;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, white, mahogTop, () => {
      // Far dark velvety floppy ear
      c.fillStyle = maskDark;
      c.beginPath();
      c.ellipse(headX + 3.4, headY + 2.6 + earBounce * 0.45, 2.8, 5.6, -0.18, 0, Math.PI * 2);
      c.fill();

      // Massive broad Saint Bernard skull (mahogany with white blaze & muzzle)
      fillShadedEllipse(c, headX, headY, 7.8, 7.2, -0.02, mahogTop, mahogBase);

      // Dark alpine eye mask
      c.fillStyle = maskDark;
      c.beginPath();
      c.ellipse(headX + 2.8, headY - 0.8, 3.6, 2.8, 0.08, 0, Math.PI * 2);
      c.fill();

      // Broad white muzzle & white blaze running up between eyes
      fillShadedEllipse(c, headX + 6.4, headY + 1.8, 4.8, 3.8, 0.04, white, whiteShade);
      c.fillStyle = white;
      c.beginPath();
      c.ellipse(headX + 4.4, headY - 2.6, 1.8, 3.4, 0.25, 0, Math.PI * 2);
      c.fill();

      // Near dark velvety floppy ear
      c.fillStyle = maskDark;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.85;
      c.beginPath();
      c.moveTo(headX - 4.6, headY - 3.2 + earBounce * 0.35);
      c.quadraticCurveTo(headX - 8.6, headY + 2.4 + earBounce * 0.65, headX - 4.2, headY + 7.2 + earBounce * 0.75);
      c.quadraticCurveTo(headX - 0.4, headY + 3.4 + earBounce * 0.45, headX - 0.6, headY - 2.6 + earBounce * 0.35);
      c.closePath();
      c.fill();
      c.stroke();

      drawMouthAndTongue(c, headX + 6.8, headY + 4.4, isSleeping, isJoyful, showTongue, animPhase, '#241714', isDrinking);
      drawGlossyNose(c, headX + 10.6, headY + 1.0, 2.15, 1.55, '#121014');
      drawDogEye(c, headX + 3.0, headY - 0.9, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#543018',
        lidColor: mahogTop,
        radius: 1.7
      });
    }, { dipAngle: 0.56, dipTx: 2.4, dipTy: 6.4, neckRx: 6.8, neckRy: 5.2 });
  } else if (breed === 'irishWolfhound') {
    // Irish Wolfhound (tallest gentle giant — shaggy wheaten-grey wiry coat, tufted brows & scruffy beard)
    const coatTop = isShiny ? shadeHex(shinyColor, 0.28) : '#b7b1a6';
    const coatBase = isShiny ? shadeHex(shinyColor, -0.04) : '#898276';
    const darkWire = isShiny ? shadeHex(shinyColor, -0.34) : '#59544b';
    const beardLight = isShiny ? shadeHex(shinyColor, 0.5) : '#ded8cc';

    const legs: FourLegsConfig = {
      backX: -11.4,
      frontX: 9.6,
      yTop: -4.2,
      w: 3.9,
      h: 13.6,
      swing: legSwing * 0.96,
      legCol: coatBase,
      pawCol: beardLight,
      pawH: 2.8,
      isSleeping,
      farLegCol: shadeHex(coatBase, -0.22),
      farPawCol: shadeHex(beardLight, -0.2),
      opts: { featherColor: beardLight }
    };

    drawFarPairLegs(c, legs);

    // Long gently curved shaggy sweeping hound tail
    const wag = isSleeping ? tailWag * 0.45 : Math.sin(wagPhase * 1.7) * 2.8 * moodWagAmp;
    c.save();
    c.lineCap = 'round';
    c.strokeStyle = coatBase;
    c.lineWidth = 4.6;
    c.beginPath();
    c.moveTo(-16.2, isSleeping ? -7.4 : -12.6);
    c.bezierCurveTo(
      -21.8, (isSleeping ? -5.2 : -9.0) + wag * 0.5,
      -25.8, (isSleeping ? -3.0 : -4.4) + wag * 0.8,
      -29.0, (isSleeping ? -5.0 : -6.6) + wag
    );
    c.stroke();
    c.strokeStyle = darkWire;
    c.lineWidth = 2.0;
    c.stroke();
    c.restore();

    // Long deep-chested commanding Wolfhound sighthound torso
    fillShadedEllipse(
      c,
      -1.2,
      (isSleeping ? -8.0 : -13.2) + sleepBreath * 0.16,
      isSleeping ? 16.8 : 17.6,
      (isSleeping ? 7.6 : 8.6) + sleepBreath * 0.2,
      -0.07,
      coatTop,
      coatBase
    );

    // Shaggy wiry chest & dorsal ruff strokes
    c.fillStyle = beardLight;
    c.beginPath();
    c.ellipse(8.2, isSleeping ? -7.2 : -12.2, 6.2, 7.6, 0.2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = darkWire;
    c.beginPath();
    c.ellipse(-4.6, isSleeping ? -10.6 : -16.8, 9.8, 3.4, -0.08, 0, Math.PI * 2);
    c.fill();

    drawNearPairLegs(c, legs);

    const headX = isSleeping ? 11.6 : 13.0;
    const headY = isSleeping ? -13.2 : -22.6;

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
      // Far small swept rose ear
      c.fillStyle = darkWire;
      c.beginPath();
      c.ellipse(headX + 2.2, headY + 0.6 + earBounce * 0.4, 2.0, 3.8, -0.35, 0, Math.PI * 2);
      c.fill();

      // Long aristocratic shaggy Wolfhound skull
      fillShadedEllipse(c, headX, headY, 6.8, 5.8, -0.08, coatTop, coatBase);

      // Long noble shaggy muzzle
      fillShadedEllipse(c, headX + 7.2, headY + 1.4, 5.6, 3.2, 0.04, coatTop, coatBase);

      // Iconic scruffy Wolfhound beard & bushy tufted eyebrows!
      c.fillStyle = beardLight;
      c.beginPath();
      c.ellipse(headX + 6.4, headY + 4.0, 4.6, 2.2, 0.08, 0, Math.PI * 2);
      c.ellipse(headX + 3.4, headY - 2.6, 3.0, 1.3, -0.12, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = darkWire;
      c.lineWidth = 0.85;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(headX + 3.6, headY + 4.4);
      c.lineTo(headX + 4.4, headY + 6.2);
      c.moveTo(headX + 6.4, headY + 4.6);
      c.lineTo(headX + 7.4, headY + 6.3);
      c.moveTo(headX + 8.8, headY + 4.0);
      c.lineTo(headX + 9.8, headY + 5.5);
      c.stroke();

      // Near small folded rose ear
      c.fillStyle = darkWire;
      c.strokeStyle = SOFT_OUTLINE;
      c.lineWidth = 0.8;
      c.beginPath();
      c.moveTo(headX - 3.8, headY - 2.6 + earBounce * 0.35);
      c.quadraticCurveTo(headX - 8.2, headY + 0.6 + earBounce * 0.6, headX - 4.8, headY + 4.4 + earBounce * 0.7);
      c.quadraticCurveTo(headX - 1.4, headY + 2.0 + earBounce * 0.45, headX - 1.0, headY - 2.0 + earBounce * 0.35);
      c.closePath();
      c.fill();
      c.stroke();

      drawMouthAndTongue(c, headX + 8.4, headY + 3.8, isSleeping, isJoyful, showTongue, animPhase, '#292520', isDrinking);
      drawGlossyNose(c, headX + 12.6, headY + 0.9, 1.95, 1.45, '#171618');
      drawDogEye(c, headX + 3.2, headY - 0.8, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#48301c',
        lidColor: coatTop,
        almond: true,
        radius: 1.65
      });
    }, { dipAngle: 0.6, dipTx: 2.6, dipTy: 7.4, neckRx: 5.8, neckRy: 4.4 });
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

    withDrinkingHeadPose(c, headX, headY, isDrinking, animPhase, coatTop, coatBase, () => {
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

      drawMouthAndTongue(c, headX + 11.4, headY + 4.2, isSleeping, isJoyful, showTongue, animPhase, '#3d2c20', isDrinking);
      drawGlossyNose(c, headX + 16.6, headY + 3.2, 1.7, 1.3, '#11141a');
      drawDogEye(c, headX + 3.0, headY - 0.6, {
        isSleeping,
        isBlinking,
        isJoyful,
        irisColor: '#2c1e16',
        almond: true,
        radius: 1.6
      });
    }, { dipAngle: 0.42, dipTx: 1.6, dipTy: 2.8, outlineColor: 'rgba(92, 74, 54, 0.28)' });
  }
}
