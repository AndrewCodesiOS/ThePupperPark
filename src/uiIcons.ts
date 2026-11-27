export type UiIconId =
  | 'bone'
  | 'magicBone'
  | 'hudBone'
  | 'hudMagicBone'
  | 'pup'
  | 'dice'
  | 'starFilled'
  | 'starOutline'
  | 'spark'
  | 'heart'
  | 'check'
  | 'weatherSunny'
  | 'weatherWindy'
  | 'weatherRain'
  | 'weatherTwilight'
  | 'skySunrise'
  | 'skyMorning'
  | 'skyAfternoon'
  | 'skySunset'
  | 'skyDusk'
  | 'skyNight'
  | 'moonNew'
  | 'moonWaxingCrescent'
  | 'moonFirstQuarter'
  | 'moonWaxingGibbous'
  | 'moonFull'
  | 'moonWaningGibbous'
  | 'moonLastQuarter'
  | 'moonWaningCrescent'
  | 'moodCozy'
  | 'moodHappy'
  | 'moodJoyful'
  | 'moodEcstatic';

const INK = '#261738';

/**
 * Exact horizontal ground-bone silhouette matching `drawBoneSprite` in pupperpark.ts:
 * shaft rect(-7, -2.5, 14, 5) + 4 end knobs at (±7, ±3) radius 3, centered at (14, 9).
 */
function buildGroundBoneSvg(isMagic: boolean, isHud: boolean): string {
  const cls = isHud
    ? isMagic
      ? 'pp-icon pp-icon-hud-magic'
      : 'pp-icon pp-icon-hud-bone'
    : isMagic
      ? 'pp-icon pp-icon-magic'
      : 'pp-icon pp-icon-bone';
  const w = isHud ? 26 : 18;
  const h = isHud ? 17 : 12;

  const fill = isMagic ? '#ffeaa7' : '#f5f6fa';
  const stroke = isMagic ? '#f39c12' : '#9aa7b2';
  const rimWidth = isMagic ? 3.2 : 2.8;
  const shine = isMagic ? '#fff9de' : '#ffffff';
  const shade = isMagic ? '#f9ca24' : '#dfe6e9';

  return (
    `<svg class="${cls}" width="${w}" height="${h}" viewBox="0 0 28 18" fill="none" aria-hidden="true">` +
    // Outer ink / rim contour around full bone silhouette
    `<g stroke="${INK}" stroke-width="${rimWidth + 1.5}" stroke-linejoin="round">` +
    `<rect x="7" y="6.5" width="14" height="5" rx="1"/>` +
    `<circle cx="7" cy="6" r="3"/>` +
    `<circle cx="7" cy="12" r="3"/>` +
    `<circle cx="21" cy="6" r="3"/>` +
    `<circle cx="21" cy="12" r="3"/>` +
    `</g>` +
    // Exact drawBoneSprite border accent (#f39c12 magic / #b2bec3 regular)
    `<g stroke="${stroke}" stroke-width="${rimWidth}" stroke-linejoin="round">` +
    `<rect x="7" y="6.5" width="14" height="5" rx="1"/>` +
    `<circle cx="7" cy="6" r="3"/>` +
    `<circle cx="7" cy="12" r="3"/>` +
    `<circle cx="21" cy="6" r="3"/>` +
    `<circle cx="21" cy="12" r="3"/>` +
    `</g>` +
    // Solid fill matching drawBoneSprite
    `<g fill="${fill}">` +
    `<rect x="7" y="6.5" width="14" height="5" rx="1"/>` +
    `<circle cx="7" cy="6" r="3"/>` +
    `<circle cx="7" cy="12" r="3"/>` +
    `<circle cx="21" cy="6" r="3"/>` +
    `<circle cx="21" cy="12" r="3"/>` +
    `</g>` +
    // Subtle lower shading & top highlight ridge
    `<path d="M8.5 10.6H19.5" stroke="${shade}" stroke-width="1.2" stroke-linecap="round" opacity="0.65"/>` +
    `<path d="M8.5 7.7H19.5" stroke="${shine}" stroke-width="1.25" stroke-linecap="round" opacity="0.9"/>` +
    `<circle cx="6.2" cy="5.1" r="1.05" fill="${shine}" opacity="0.88"/>` +
    `<circle cx="20.2" cy="5.1" r="1.05" fill="${shine}" opacity="0.88"/>` +
    `</svg>`
  );
}

export interface HudBoneStyleOptions {
  x: number;
  y: number;
  /** Full outer visual width (knob-edge to knob-edge) in canvas units. */
  width: number;
  rot?: number;
  /** Primary fill color (or top gradient stop when fillBottom is provided). */
  fill?: string;
  /** Optional bottom gradient stop for shaded/baked/metallic bones. */
  fillBottom?: string;
  /** Accent rim stroke matching the currency HUD bone border. */
  rim?: string;
  /** Subtle lower shaft shading stroke. */
  shade?: string;
  /** Top shaft highlight ridge and upper knob specular dots. */
  shine?: string;
  /** Multiplier for outline thickness relative to HUD icon proportions. */
  outlineScale?: number;
  /** Optional outer glow color behind the bone. */
  glowColor?: string;
  /** Glow blur radius in canvas units (defaults to 10 when glowColor is set). */
  glowBlur?: number;
}

export const HUD_BONE_PRESETS = {
  regular: {
    fill: '#f5f6fa',
    rim: '#9aa7b2',
    shade: '#dfe6e9',
    shine: '#ffffff'
  },
  magic: {
    fill: '#ffeaa7',
    rim: '#f39c12',
    shade: '#f9ca24',
    shine: '#fff9de'
  },
  biscuit: {
    fill: '#ffe4a8',
    fillBottom: '#e59b42',
    rim: '#b86820',
    shade: '#c97626',
    shine: '#fff6d8'
  },
  biscuitLight: {
    fill: '#ffefc2',
    fillBottom: '#eab055',
    rim: '#c47928',
    shade: '#d18632',
    shine: '#fffbe6'
  },
  meaty: {
    fill: '#e3634b',
    fillBottom: '#9c2c1d',
    rim: '#731a12',
    shade: '#6e1911',
    shine: '#ffb89e'
  }
} as const;

function traceRoundedShaft(ctx: CanvasRenderingContext2D): void {
  const x = -7;
  const y = -2.5;
  const w = 14;
  const h = 5;
  const r = 1;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * Renders the exact Currency HUD / ground bone silhouette on a 2D Canvas:
 * shaft (-7, -2.5, 14, 5) + 4 knobs at (±7, ±3) radius 3, unioned with
 * outer ink contour, inner rim accent, seamless fill, shaft highlight,
 * lower shade, and twin knob specular dots.
 */
export function drawHudStyleBone(ctx: CanvasRenderingContext2D, opts: HudBoneStyleOptions): void {
  const {
    x,
    y,
    width,
    rot = 0,
    fill = HUD_BONE_PRESETS.regular.fill,
    fillBottom,
    rim = HUD_BONE_PRESETS.regular.rim,
    shade = HUD_BONE_PRESETS.regular.shade,
    shine = HUD_BONE_PRESETS.regular.shine,
    outlineScale,
    glowColor,
    glowBlur = 10
  } = opts;

  const s = width / 20;
  const strokeFactor = outlineScale ?? Math.min(1, Math.max(0.45, 2.2 / Math.max(1, s)));
  const rimW = 2.8 * strokeFactor;
  const inkW = (2.8 + 1.55) * strokeFactor;

  const knobs: ReadonlyArray<readonly [number, number]> = [
    [-7, -3],
    [-7, 3],
    [7, -3],
    [7, 3]
  ];

  const strokeParts = (color: string, lineWidth: number): void => {
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    traceRoundedShaft(ctx);
    ctx.stroke();
    for (const [kx, ky] of knobs) {
      ctx.beginPath();
      ctx.arc(kx, ky, 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  };

  const fillParts = (style: string | CanvasGradient): void => {
    ctx.fillStyle = style;
    traceRoundedShaft(ctx);
    ctx.fill();
    for (const [kx, ky] of knobs) {
      ctx.beginPath();
      ctx.arc(kx, ky, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(s, s);

  let fillStyle: string | CanvasGradient = fill;
  if (fillBottom) {
    const grad = ctx.createLinearGradient(0, -6, 0, 6);
    grad.addColorStop(0, fill);
    grad.addColorStop(1, fillBottom);
    fillStyle = grad;
  }

  // Optional soft outer glow behind the entire bone silhouette
  if (glowColor) {
    ctx.save();
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowBlur;
    fillParts(rim);
    ctx.restore();
  }

  // Layer 1: Dark ink outer contour
  strokeParts(INK, inkW);

  // Layer 2: HUD-matching accent rim border
  strokeParts(rim, rimW);

  // Layer 3: Seamless interior fill (hides all internal primitive seams)
  fillParts(fillStyle);

  // Layer 4: Signature Currency HUD shading, highlight ridge & knob specular dots
  ctx.save();
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.65;
  ctx.strokeStyle = shade;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-5.5, 1.6);
  ctx.lineTo(5.5, 1.6);
  ctx.stroke();

  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = shine;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(-5.5, -1.3);
  ctx.lineTo(5.5, -1.3);
  ctx.stroke();

  ctx.globalAlpha = 0.88;
  ctx.fillStyle = shine;
  ctx.beginPath();
  ctx.arc(-7.8, -3.9, 1.05, 0, Math.PI * 2);
  ctx.arc(6.2, -3.9, 1.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
}

function buildMoonSvg(
  phase:
    | 'new'
    | 'waxingCrescent'
    | 'firstQuarter'
    | 'waxingGibbous'
    | 'full'
    | 'waningGibbous'
    | 'lastQuarter'
    | 'waningCrescent'
): string {
  // Disc centered at (12, 12), r = 8.4
  const darkBase = '#2f2957';
  const litFill = '#fff1b8';
  const crater = '#e5cf86';

  let litShape = '';
  switch (phase) {
    case 'new':
      litShape = `<path d="M12 4.2A7.8 7.8 0 0 1 18.6 8.2" stroke="#9b8fd1" stroke-width="1.15" stroke-linecap="round" opacity="0.6"/>`;
      break;
    case 'waxingCrescent':
      litShape = `<path d="M12 3.8A8.2 8.2 0 0 1 12 20.2A4.6 8.2 0 0 0 12 3.8Z" fill="${litFill}"/>`;
      break;
    case 'firstQuarter':
      litShape = `<path d="M12 3.8A8.2 8.2 0 0 1 12 20.2Z" fill="${litFill}"/>`;
      break;
    case 'waxingGibbous':
      litShape = `<path d="M12 3.8A8.2 8.2 0 0 1 12 20.2A4.4 8.2 0 0 1 12 3.8Z" fill="${litFill}"/>`;
      break;
    case 'full':
      litShape =
        `<circle cx="12" cy="12" r="8.2" fill="${litFill}"/>` +
        `<circle cx="9.2" cy="9.4" r="1.4" fill="${crater}" opacity="0.7"/>` +
        `<circle cx="14.7" cy="13.8" r="1.7" fill="${crater}" opacity="0.65"/>` +
        `<circle cx="13.8" cy="8.2" r="0.95" fill="${crater}" opacity="0.6"/>`;
      break;
    case 'waningGibbous':
      litShape = `<path d="M12 3.8A8.2 8.2 0 0 0 12 20.2A4.4 8.2 0 0 0 12 3.8Z" fill="${litFill}"/>`;
      break;
    case 'lastQuarter':
      litShape = `<path d="M12 3.8A8.2 8.2 0 0 0 12 20.2Z" fill="${litFill}"/>`;
      break;
    case 'waningCrescent':
      litShape = `<path d="M12 3.8A8.2 8.2 0 0 0 12 20.2A4.6 8.2 0 0 1 12 3.8Z" fill="${litFill}"/>`;
      break;
  }

  return (
    `<svg class="pp-icon pp-icon-sq" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<circle cx="12" cy="12" r="8.4" fill="${darkBase}"/>` +
    litShape +
    `<circle cx="12" cy="12" r="8.4" stroke="${INK}" stroke-width="1.9"/>` +
    `</svg>`
  );
}

const RAW_ICONS: Record<UiIconId, string> = {
  bone: buildGroundBoneSvg(false, false),
  magicBone: buildGroundBoneSvg(true, false),
  hudBone: buildGroundBoneSvg(false, true),
  hudMagicBone: buildGroundBoneSvg(true, true),

  pup:
    `<svg class="pp-icon pp-icon-pup" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<path d="M5.1 10.6C3.9 9.7 3.0 8.2 3.3 6.9C3.5 6.2 4.3 6.2 4.6 7.0C5.0 8.1 5.8 9.2 6.8 9.7L13.1 9.5C13.9 8.1 14.5 6.4 15.1 4.9C15.4 4.1 16.3 4.0 16.6 4.8L17.2 6.4L18.4 5.0C18.9 4.4 19.8 4.7 19.7 5.5L19.4 7.7L21.0 8.5C21.7 8.8 21.8 9.7 21.3 10.3L20.3 11.4C19.8 11.9 19.0 12.1 18.2 12.0L17.4 12.0L17.0 14.4L17.7 19.2C17.8 19.9 17.3 20.5 16.6 20.5C15.9 20.5 15.4 20.0 15.3 19.3L14.7 15.7L13.6 15.7L13.4 19.3C13.4 20.0 12.8 20.5 12.2 20.5C11.5 20.5 11.0 19.9 11.1 19.2L11.4 15.4L8.6 15.4L8.2 19.3C8.1 20.0 7.6 20.5 6.9 20.5C6.2 20.5 5.7 19.9 5.8 19.2L6.3 14.7L5.6 19.1C5.5 19.8 4.9 20.3 4.3 20.2C3.6 20.1 3.2 19.5 3.3 18.8L4.3 13.0C4.4 12.0 4.7 11.2 5.1 10.6Z" fill="#f5f6fa" stroke="${INK}" stroke-width="1.35" stroke-linejoin="round" stroke-linecap="round"/>` +
    `</svg>`,

  dice:
    `<svg class="pp-icon pp-icon-sq" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<rect x="3.5" y="3.5" width="17" height="17" rx="4.2" fill="#fff8ec" stroke="${INK}" stroke-width="1.9"/>` +
    `<path d="M5.5 6.4H18.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.9"/>` +
    `<path d="M5.2 18.4H18.8" stroke="#e4d6ff" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>` +
    `<circle cx="8.4" cy="8.4" r="1.55" fill="#6c5ce7"/>` +
    `<circle cx="15.6" cy="8.4" r="1.55" fill="#6c5ce7"/>` +
    `<circle cx="12" cy="12" r="1.65" fill="#f39c12"/>` +
    `<circle cx="8.4" cy="15.6" r="1.55" fill="#6c5ce7"/>` +
    `<circle cx="15.6" cy="15.6" r="1.55" fill="#6c5ce7"/>` +
    `</svg>`,

  starFilled:
    `<svg class="pp-icon pp-icon-sq" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<path d="M12 2.4L14.95 8.38L21.55 9.34L16.78 13.99L17.9 20.56L12 17.46L6.1 20.56L7.22 13.99L2.45 9.34L9.05 8.38L12 2.4Z" fill="#ffeaa7" stroke="${INK}" stroke-width="1.85" stroke-linejoin="round"/>` +
    `<path d="M12 5.4L13.6 8.8L17.3 9.3" stroke="#ffffff" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.8"/>` +
    `</svg>`,

  starOutline:
    `<svg class="pp-icon pp-icon-sq" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<path d="M12 2.8L14.85 8.58L21.22 9.5L16.61 14L17.7 20.34L12 17.34L6.3 20.34L7.39 14L2.78 9.5L9.15 8.58L12 2.8Z" fill="rgba(255,255,255,0.06)" stroke="currentColor" stroke-width="1.85" stroke-linejoin="round"/>` +
    `</svg>`,

  spark:
    `<svg class="pp-icon pp-icon-sq" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<path d="M10.5 2.2C11.5 7.8 13.5 9.8 19.1 10.8C13.5 11.8 11.5 13.8 10.5 19.4C9.5 13.8 7.5 11.8 1.9 10.8C7.5 9.8 9.5 7.8 10.5 2.2Z" fill="#ffeaa7" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round"/>` +
    `<path d="M18.4 13.4C18.8 15.8 19.7 16.7 22.1 17.1C19.7 17.5 18.8 18.4 18.4 20.8C18.0 18.4 17.1 17.5 14.7 17.1C17.1 16.7 18.0 15.8 18.4 13.4Z" fill="#fff8dc" stroke="${INK}" stroke-width="1.35" stroke-linejoin="round"/>` +
    `</svg>`,

  heart:
    `<svg class="pp-icon pp-icon-sq" width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<path d="M12 20.6C12 20.6 3.6 15.3 3.6 9.3C3.6 6.3 5.9 4.2 8.7 4.2C10.3 4.2 11.4 5.0 12 6.1C12.6 5.0 13.7 4.2 15.3 4.2C18.1 4.2 20.4 6.3 20.4 9.3C20.4 15.3 12 20.6 12 20.6Z" fill="#ff8ad8" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<path d="M6.8 8.7C6.8 7.4 7.7 6.5 9.0 6.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" opacity="0.88"/>` +
    `</svg>`,

  check:
    `<svg class="pp-icon pp-icon-sq" width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<path d="M4.5 12.6L9.6 17.6L19.6 6.8" stroke="currentColor" stroke-width="3.1" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`,

  weatherSunny:
    `<svg class="pp-icon pp-icon-sq" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<g stroke="#ffeaa7" stroke-width="2.2" stroke-linecap="round">` +
    `<line x1="12" y1="2.1" x2="12" y2="4.4"/>` +
    `<line x1="12" y1="19.6" x2="12" y2="21.9"/>` +
    `<line x1="2.1" y1="12" x2="4.4" y2="12"/>` +
    `<line x1="19.6" y1="12" x2="21.9" y2="12"/>` +
    `<line x1="5" y1="5" x2="6.6" y2="6.6"/>` +
    `<line x1="17.4" y1="17.4" x2="19" y2="19"/>` +
    `<line x1="19" y1="5" x2="17.4" y2="6.6"/>` +
    `<line x1="6.6" y1="17.4" x2="5" y2="19"/>` +
    `</g>` +
    `<circle cx="12" cy="12" r="5.6" fill="#ffd86b" stroke="${INK}" stroke-width="1.8"/>` +
    `<path d="M9.4 10.2A3.2 3.2 0 0 1 13.6 8.9" stroke="#fff8dc" stroke-width="1.4" stroke-linecap="round"/>` +
    `</svg>`,

  weatherWindy:
    `<svg class="pp-icon pp-icon-sq" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<path d="M3 10.5H13.5C15.1 10.5 16.2 9.4 16.2 8C16.2 6.6 15.1 5.6 13.7 5.6C12.5 5.6 11.7 6.3 11.4 7.2" stroke="#81ecec" stroke-width="2.1" stroke-linecap="round"/>` +
    `<path d="M4.2 14.5H17.5C19.2 14.5 20.4 15.6 20.4 17.1C20.4 18.5 19.2 19.6 17.7 19.6C16.5 19.6 15.7 18.9 15.4 18" stroke="#55efc4" stroke-width="2.1" stroke-linecap="round"/>` +
    `<path d="M18.2 4.6C15.5 4.8 14.1 6.7 14.3 9.4C17.0 9.6 19.1 7.6 18.2 4.6Z" fill="#55efc4" stroke="${INK}" stroke-width="1.45" stroke-linejoin="round"/>` +
    `<path d="M8.8 16.1C6.6 16.3 5.5 17.8 5.7 19.9C7.8 20.1 9.5 18.5 8.8 16.1Z" fill="#00b894" stroke="${INK}" stroke-width="1.35" stroke-linejoin="round"/>` +
    `</svg>`,

  weatherRain:
    `<svg class="pp-icon pp-icon-sq" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<path d="M6.8 14.6H17.6C19.6 14.6 21 13.2 21 11.3C21 9.5 19.6 8.1 17.8 8.0C17.2 5.5 14.9 3.8 12.2 3.8C9.3 3.8 6.9 5.9 6.6 8.7C4.8 8.9 3.4 10.3 3.4 12.0C3.4 13.5 4.8 14.6 6.8 14.6Z" fill="#dfe6f7" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<path d="M8.4 16.8L7.2 19.9" stroke="#74b9ff" stroke-width="2.1" stroke-linecap="round"/>` +
    `<path d="M12.6 16.8L11.4 20.3" stroke="#81ecec" stroke-width="2.1" stroke-linecap="round"/>` +
    `<path d="M16.8 16.8L15.6 19.9" stroke="#74b9ff" stroke-width="2.1" stroke-linecap="round"/>` +
    `</svg>`,

  weatherTwilight:
    `<svg class="pp-icon pp-icon-sq" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<path d="M15.4 4.2C11.0 4.5 7.5 8.1 7.5 12.6C7.5 17.2 11.2 20.9 15.8 20.9C17.4 20.9 18.9 20.4 20.1 19.6C16.2 19.3 13.2 16.2 13.2 12.2C13.2 8.7 14.8 5.9 17.5 4.4C16.8 4.2 16.1 4.1 15.4 4.2Z" fill="#ffeaa7" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>` +
    `<path d="M6.2 4.6L6.9 6.7L9.0 7.4L6.9 8.1L6.2 10.2L5.5 8.1L3.4 7.4L5.5 6.7L6.2 4.6Z" fill="#a29bfe"/>` +
    `<circle cx="19.2" cy="10.2" r="1.4" fill="#ffeaa7"/>` +
    `</svg>`,

  skySunrise:
    `<svg class="pp-icon pp-icon-sq" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<g stroke="#fdcb6e" stroke-width="1.9" stroke-linecap="round">` +
    `<line x1="12" y1="3.4" x2="12" y2="5.6"/>` +
    `<line x1="5.6" y1="6.4" x2="7.2" y2="8.0"/>` +
    `<line x1="18.4" y1="6.4" x2="16.8" y2="8.0"/>` +
    `</g>` +
    `<path d="M6.4 15.6A5.6 5.6 0 0 1 17.6 15.6Z" fill="#ffd86b" stroke="${INK}" stroke-width="1.75" stroke-linejoin="round"/>` +
    `<path d="M3 16.2H21" stroke="#fab1a0" stroke-width="2.2" stroke-linecap="round"/>` +
    `<path d="M5.5 19.2H18.5" stroke="#a29bfe" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>` +
    `</svg>`,

  skyMorning:
    `<svg class="pp-icon pp-icon-sq" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<circle cx="14.5" cy="9.2" r="4.6" fill="#ffd86b" stroke="${INK}" stroke-width="1.7"/>` +
    `<path d="M5.8 18.2H15.8C17.4 18.2 18.6 17.1 18.6 15.5C18.6 14.0 17.4 12.9 15.9 12.8C15.3 10.9 13.5 9.6 11.4 9.6C8.9 9.6 7.0 11.3 6.7 13.6C5.1 13.8 4.0 14.9 4.0 16.3C4.0 17.4 4.8 18.2 5.8 18.2Z" fill="#f5f6fa" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round"/>` +
    `</svg>`,

  skyAfternoon:
    `<svg class="pp-icon pp-icon-sq" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<g stroke="#ffeaa7" stroke-width="2.1" stroke-linecap="round">` +
    `<line x1="12" y1="2.2" x2="12" y2="4.4"/>` +
    `<line x1="12" y1="19.6" x2="12" y2="21.8"/>` +
    `<line x1="2.2" y1="12" x2="4.4" y2="12"/>` +
    `<line x1="19.6" y1="12" x2="21.8" y2="12"/>` +
    `<line x1="5.2" y1="5.2" x2="6.8" y2="6.8"/>` +
    `<line x1="17.2" y1="17.2" x2="18.8" y2="18.8"/>` +
    `<line x1="18.8" y1="5.2" x2="17.2" y2="6.8"/>` +
    `<line x1="6.8" y1="17.2" x2="5.2" y2="18.8"/>` +
    `</g>` +
    `<circle cx="12" cy="12" r="5.4" fill="#ffeaa7" stroke="${INK}" stroke-width="1.8"/>` +
    `</svg>`,

  skySunset:
    `<svg class="pp-icon pp-icon-sq" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<path d="M6.2 15.2A5.8 5.8 0 0 1 17.8 15.2Z" fill="#ff9f68" stroke="${INK}" stroke-width="1.75" stroke-linejoin="round"/>` +
    `<path d="M3 15.8H21" stroke="#ff7675" stroke-width="2.2" stroke-linecap="round"/>` +
    `<path d="M5.5 19.0H18.5" stroke="#fd79a8" stroke-width="1.9" stroke-linecap="round"/>` +
    `<path d="M12 4.6L12.6 6.4L14.4 7.0L12.6 7.6L12 9.4L11.4 7.6L9.6 7.0L11.4 6.4L12 4.6Z" fill="#ffeaa7"/>` +
    `</svg>`,

  skyDusk:
    `<svg class="pp-icon pp-icon-sq" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<circle cx="12" cy="12" r="8.4" fill="#43326b" stroke="${INK}" stroke-width="1.8"/>` +
    `<path d="M5.2 15.6C7.6 14.3 16.4 14.3 18.8 15.6A8.1 8.1 0 0 1 5.2 15.6Z" fill="#e17055" opacity="0.9"/>` +
    `<path d="M15.4 6.2L16.0 8.0L17.8 8.6L16.0 9.2L15.4 11.0L14.8 9.2L13.0 8.6L14.8 8.0L15.4 6.2Z" fill="#ffeaa7"/>` +
    `<circle cx="8.6" cy="9.4" r="1.15" fill="#dcd6ff"/>` +
    `</svg>`,

  skyNight:
    `<svg class="pp-icon pp-icon-sq" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<circle cx="12" cy="12" r="8.4" fill="#1e1b44" stroke="${INK}" stroke-width="1.8"/>` +
    `<path d="M9.6 6.2L10.3 8.4L12.5 9.1L10.3 9.8L9.6 12.0L8.9 9.8L6.7 9.1L8.9 8.4L9.6 6.2Z" fill="#ffeaa7"/>` +
    `<path d="M15.6 11.4L16.1 13.0L17.7 13.5L16.1 14.0L15.6 15.6L15.1 14.0L13.5 13.5L15.1 13.0L15.6 11.4Z" fill="#a29bfe"/>` +
    `<circle cx="15.4" cy="7.5" r="1.05" fill="#ffffff"/>` +
    `<circle cx="8.6" cy="15.4" r="0.95" fill="#dfe6f7"/>` +
    `</svg>`,

  moonNew: buildMoonSvg('new'),
  moonWaxingCrescent: buildMoonSvg('waxingCrescent'),
  moonFirstQuarter: buildMoonSvg('firstQuarter'),
  moonWaxingGibbous: buildMoonSvg('waxingGibbous'),
  moonFull: buildMoonSvg('full'),
  moonWaningGibbous: buildMoonSvg('waningGibbous'),
  moonLastQuarter: buildMoonSvg('lastQuarter'),
  moonWaningCrescent: buildMoonSvg('waningCrescent'),

  moodCozy:
    `<svg class="pp-icon pp-icon-sq" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<circle cx="12" cy="12" r="8.6" fill="#d6ccff" stroke="${INK}" stroke-width="1.8"/>` +
    `<path d="M7.6 11.1C8.3 10.1 9.7 10.1 10.4 11.1" stroke="${INK}" stroke-width="1.65" stroke-linecap="round"/>` +
    `<path d="M13.6 11.1C14.3 10.1 15.7 10.1 16.4 11.1" stroke="${INK}" stroke-width="1.65" stroke-linecap="round"/>` +
    `<path d="M9.6 14.8C10.7 15.9 13.3 15.9 14.4 14.8" stroke="${INK}" stroke-width="1.65" stroke-linecap="round"/>` +
    `<circle cx="7.4" cy="13.5" r="1.15" fill="#ff9ff3" opacity="0.65"/>` +
    `<circle cx="16.6" cy="13.5" r="1.15" fill="#ff9ff3" opacity="0.65"/>` +
    `</svg>`,

  moodHappy:
    `<svg class="pp-icon pp-icon-sq" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<circle cx="12" cy="12" r="8.6" fill="#7ff5d4" stroke="${INK}" stroke-width="1.8"/>` +
    `<circle cx="9.1" cy="10.4" r="1.25" fill="${INK}"/>` +
    `<circle cx="14.9" cy="10.4" r="1.25" fill="${INK}"/>` +
    `<path d="M8.5 14.0C9.8 16.1 14.2 16.1 15.5 14.0" stroke="${INK}" stroke-width="1.75" stroke-linecap="round"/>` +
    `<circle cx="7.2" cy="12.9" r="1.15" fill="#ff9ff3" opacity="0.6"/>` +
    `<circle cx="16.8" cy="12.9" r="1.15" fill="#ff9ff3" opacity="0.6"/>` +
    `</svg>`,

  moodJoyful:
    `<svg class="pp-icon pp-icon-sq" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<circle cx="12" cy="12" r="8.6" fill="#ffe082" stroke="${INK}" stroke-width="1.8"/>` +
    `<path d="M7.8 10.6C8.4 9.2 9.8 9.2 10.4 10.6" stroke="${INK}" stroke-width="1.75" stroke-linecap="round"/>` +
    `<path d="M13.6 10.6C14.2 9.2 15.6 9.2 16.2 10.6" stroke="${INK}" stroke-width="1.75" stroke-linecap="round"/>` +
    `<path d="M8.3 13.7C9.4 16.6 14.6 16.6 15.7 13.7Z" fill="#ff7675" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>` +
    `<circle cx="6.9" cy="12.8" r="1.2" fill="#ff9f43" opacity="0.55"/>` +
    `<circle cx="17.1" cy="12.8" r="1.2" fill="#ff9f43" opacity="0.55"/>` +
    `</svg>`,

  moodEcstatic:
    `<svg class="pp-icon pp-icon-sq" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">` +
    `<circle cx="12" cy="12.4" r="8.1" fill="#ffb8f0" stroke="${INK}" stroke-width="1.8"/>` +
    `<path d="M9.0 9.0L9.7 10.5L11.2 11.1L9.7 11.7L9.0 13.2L8.3 11.7L6.8 11.1L8.3 10.5L9.0 9.0Z" fill="#ffeaa7" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>` +
    `<path d="M15.0 9.0L15.7 10.5L17.2 11.1L15.7 11.7L15.0 13.2L14.3 11.7L12.8 11.1L14.3 10.5L15.0 9.0Z" fill="#ffeaa7" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>` +
    `<path d="M8.6 14.3C9.6 17.0 14.4 17.0 15.4 14.3Z" fill="#ff6b81" stroke="${INK}" stroke-width="1.45" stroke-linejoin="round"/>` +
    `<path d="M19.4 2.4L20.0 4.2L21.8 4.8L20.0 5.4L19.4 7.2L18.8 5.4L17.0 4.8L18.8 4.2L19.4 2.4Z" fill="#ffeaa7"/>` +
    `</svg>`
};

export function uiIconHtml(id: UiIconId, extraClass?: string): string {
  const svg = RAW_ICONS[id];
  if (!extraClass) return svg;
  return svg.replace('class="pp-icon', `class="pp-icon ${extraClass}`);
}

export function boneInlineHtml(amountText: string): string {
  return `<span class="pp-inline-pair"><span>${amountText}</span>${RAW_ICONS.bone}</span>`;
}

export function magicInlineHtml(amountText: string): string {
  return `<span class="pp-inline-pair"><span>${amountText}</span>${RAW_ICONS.magicBone}</span>`;
}

export function setHtmlIfChanged(el: Element | null, html: string): void {
  if (!el) return;
  const target = el as HTMLElement;
  if (target.dataset.ppHtmlCache === html) return;
  target.dataset.ppHtmlCache = html;
  target.innerHTML = html;
}

export function hydrateStaticUiIcons(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-pp-icon]').forEach(el => {
    const id = el.dataset.ppIcon as UiIconId | undefined;
    if (id && id in RAW_ICONS) {
      el.innerHTML = RAW_ICONS[id];
    }
  });
}
