import { BreedTier } from './breeds';
import { drawIllustratedDog } from './dogArt';
import { HUD_BONE_PRESETS, drawHudStyleBone } from './uiIcons';

export type ShopArtId =
  | 'toyBall'
  | 'toyDuck'
  | 'toyFrisbee'
  | 'treatSnaps'
  | 'treatCup'
  | 'treatXp'
  | 'treatKong'
  | 'treatFeast'
  | 'treatBacon'
  | 'decorFlowers'
  | 'decorHydrant'
  | 'decorTree'
  | 'decorLamp'
  | 'decorFountain'
  | 'decorSlide'
  | 'decorGoldenHydrant'
  | 'decorDoghouseManor'
  | 'decorExpansion'
  | 'tileCobble'
  | 'tileSand'
  | 'tileClover'
  | 'tileGrass';

const INK = '#261738';
const SHOP_ART_CACHE = new Map<string, string>();

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

function drawParkBackdrop(
  ctx: CanvasRenderingContext2D,
  topCol: string,
  botCol: string,
  grassHill = true
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, 64);
  sky.addColorStop(0, topCol);
  sky.addColorStop(1, botCol);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 64, 64);

  if (grassHill) {
    const hill = ctx.createLinearGradient(0, 42, 0, 64);
    hill.addColorStop(0, '#55c768');
    hill.addColorStop(1, '#2f8f47');
    ctx.fillStyle = hill;
    ctx.beginPath();
    ctx.ellipse(32, 59, 42, 16, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(32, 59, 41, 15.2, 0, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
}

function drawGroundShadow(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  ctx.fillStyle = 'rgba(18, 28, 22, 0.34)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMiniHeart(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, col: string): void {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.88);
  ctx.bezierCurveTo(-r * 1.25, r * 0.15, -r * 1.15, -r * 0.92, -r * 0.48, -r * 0.92);
  ctx.bezierCurveTo(-r * 0.15, -r * 0.92, 0, -r * 0.62, 0, -r * 0.42);
  ctx.bezierCurveTo(0, -r * 0.62, r * 0.15, -r * 0.92, r * 0.48, -r * 0.92);
  ctx.bezierCurveTo(r * 1.15, -r * 0.92, r * 1.25, r * 0.15, 0, r * 0.88);
  ctx.closePath();
  ctx.fillStyle = col;
  ctx.fill();
  ctx.lineWidth = 1.4;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.restore();
}

function drawHydrantShape(ctx: CanvasRenderingContext2D, isGold: boolean, scale = 1): void {
  ctx.save();
  ctx.scale(scale, scale);

  // Anchor flange base
  ctx.fillStyle = isGold ? '#9e6f0c' : '#741616';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, 2.2, 11.4, 5.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isGold ? '#d49d1b' : '#b22222';
  ctx.beginPath();
  ctx.ellipse(0, 0.9, 10.0, 4.3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Barrel
  const bodyGrad = ctx.createLinearGradient(-7.6, 0, 7.6, 0);
  if (isGold) {
    bodyGrad.addColorStop(0, '#8f6008');
    bodyGrad.addColorStop(0.28, '#fff4b8');
    bodyGrad.addColorStop(0.56, '#ffd32a');
    bodyGrad.addColorStop(0.84, '#cc9414');
    bodyGrad.addColorStop(1, '#7a5005');
  } else {
    bodyGrad.addColorStop(0, '#871616');
    bodyGrad.addColorStop(0.28, '#ff7675');
    bodyGrad.addColorStop(0.56, '#e02f2f');
    bodyGrad.addColorStop(0.84, '#b81d1d');
    bodyGrad.addColorStop(1, '#701010');
  }
  ctx.fillStyle = bodyGrad;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.moveTo(-7.6, 0.8);
  ctx.lineTo(-6.5, -21.2);
  ctx.lineTo(6.5, -21.2);
  ctx.lineTo(7.6, 0.8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Fluting lines
  ctx.strokeStyle = isGold ? 'rgba(115, 77, 6, 0.3)' : 'rgba(72, 10, 10, 0.3)';
  ctx.lineWidth = 1.0;
  [-3.2, 0, 3.2].forEach(fx => {
    ctx.beginPath();
    ctx.moveTo(fx, -19.2);
    ctx.lineTo(fx * 1.1, -2.5);
    ctx.stroke();
  });

  // Side brass/gold nozzles
  const capMain = isGold ? '#ffe97f' : '#e6c25b';
  [-1, 1].forEach(side => {
    ctx.fillStyle = capMain;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(side * 9.3, -13.6, 3.4, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });

  // Front steamer port
  ctx.fillStyle = capMain;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, -11.6, 4.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = isGold ? '#fff8d4' : '#f7dc84';
  ctx.beginPath();
  ctx.arc(0, -11.6, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Shoulder flange + dome bonnet + nut
  ctx.fillStyle = isGold ? '#e8b62c' : '#c92323';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.ellipse(0, -20.8, 8.6, 3.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  const domeGrad = ctx.createRadialGradient(-2.4, -26.2, 1, 0, -23.4, 9.5);
  if (isGold) {
    domeGrad.addColorStop(0, '#fff9d6');
    domeGrad.addColorStop(0.5, '#ffd32a');
    domeGrad.addColorStop(1, '#b8820b');
  } else {
    domeGrad.addColorStop(0, '#ff8787');
    domeGrad.addColorStop(0.5, '#e02f2f');
    domeGrad.addColorStop(1, '#8c1414');
  }
  ctx.fillStyle = domeGrad;
  ctx.beginPath();
  ctx.arc(0, -21.2, 7.6, Math.PI, 0, false);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Top operating nut
  ctx.fillStyle = capMain;
  ctx.beginPath();
  ctx.roundRect(-2.6, -31.8, 5.2, 3.6, 1.2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawShopArt(ctx: CanvasRenderingContext2D, id: ShopArtId): void {
  switch (id) {
    case 'toyBall': {
      drawParkBackdrop(ctx, '#28365d', '#3e4e7a', true);
      drawGroundShadow(ctx, 32, 51, 14, 5.2);

      // Fuzzy tennis ball matching drawTennisBall (#ccff00 / #739900)
      const grad = ctx.createRadialGradient(25, 22, 3, 32, 31, 20);
      grad.addColorStop(0, '#eaff66');
      grad.addColorStop(0.55, '#ccff00');
      grad.addColorStop(1, '#79a600');
      ctx.fillStyle = grad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(32, 30, 17.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Classic white curved tennis seams
      ctx.save();
      ctx.beginPath();
      ctx.arc(32, 30, 16.4, 0, Math.PI * 2);
      ctx.clip();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.92)';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.arc(17.5, 30, 12.6, -0.95, 0.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(46.5, 30, 12.6, Math.PI - 0.95, Math.PI + 0.95);
      ctx.stroke();
      ctx.restore();

      // Specular gleam + bounce arcs
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.ellipse(25.5, 21.5, 4.4, 2.5, -0.5, 0, Math.PI * 2);
      ctx.fill();
      drawSparkle(ctx, 50, 13, 5.2, '#fff8c9');
      break;
    }

    case 'toyDuck': {
      drawParkBackdrop(ctx, '#2a3d66', '#3d5a8a', true);
      drawGroundShadow(ctx, 32, 52, 18, 5.8);

      // Rubber duck matching drawDuck (#ffeaa7 / #fdcb6e / #e17055)
      const bodyGrad = ctx.createRadialGradient(24, 32, 3, 29, 38, 19);
      bodyGrad.addColorStop(0, '#fff7bf');
      bodyGrad.addColorStop(0.55, '#ffe066');
      bodyGrad.addColorStop(1, '#f3b324');
      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.3;

      // Tail flick + plump body
      ctx.beginPath();
      ctx.moveTo(14, 34);
      ctx.quadraticCurveTo(10, 27, 17, 30);
      ctx.quadraticCurveTo(23, 27, 36, 31);
      ctx.quadraticCurveTo(47, 35, 45, 43);
      ctx.quadraticCurveTo(42, 51, 27, 51);
      ctx.quadraticCurveTo(13, 50, 14, 34);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing contour
      ctx.strokeStyle = '#d49415';
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.arc(27, 40, 8.2, 0.15, Math.PI * 0.92);
      ctx.stroke();

      // Head
      const headGrad = ctx.createRadialGradient(36, 19, 2, 39, 23, 12);
      headGrad.addColorStop(0, '#fff9cf');
      headGrad.addColorStop(0.6, '#ffe066');
      headGrad.addColorStop(1, '#f3b324');
      ctx.fillStyle = headGrad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.arc(38.5, 23, 10.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Orange bill
      ctx.fillStyle = '#ff793f';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(50, 25.2, 6.2, 3.5, 0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Eye + shine
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.arc(41.8, 21.2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(42.5, 20.4, 0.85, 0, Math.PI * 2);
      ctx.fill();

      drawSparkle(ctx, 16, 14, 4.8, '#fff8c9');
      break;
    }

    case 'toyFrisbee': {
      drawParkBackdrop(ctx, '#22355e', '#35548c', true);
      drawGroundShadow(ctx, 32, 52, 18, 4.8);

      // Motion swoosh lines
      ctx.strokeStyle = 'rgba(129, 236, 236, 0.65)';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(8, 21);
      ctx.quadraticCurveTo(15, 17, 22, 19);
      ctx.moveTo(6, 28);
      ctx.quadraticCurveTo(11, 26, 15, 27);
      ctx.stroke();

      // Tilted flying disc matching drawFrisbee (#0984e3 / #00cec9 / #74b9ff)
      ctx.save();
      ctx.translate(33, 33);
      ctx.rotate(-0.22);

      // Outer rim thickness
      ctx.fillStyle = '#065aa0';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.ellipse(0, 3.2, 22, 10.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Main blue disc with vibrant cyan rim
      const discGrad = ctx.createLinearGradient(-20, -9, 20, 9);
      discGrad.addColorStop(0, '#2ea4ff');
      discGrad.addColorStop(0.55, '#0984e3');
      discGrad.addColorStop(1, '#0768b8');
      ctx.fillStyle = discGrad;
      ctx.strokeStyle = '#00cec9';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, 0, 21.2, 10.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Outer ink edge
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.ellipse(0, 0, 22.3, 11.0, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Inner sky-blue dome
      ctx.fillStyle = '#74b9ff';
      ctx.beginPath();
      ctx.ellipse(0, -1.2, 12.2, 5.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Glossy highlight arc
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.82)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(-2, -1.8, 10.5, 4.2, 0, Math.PI * 1.12, Math.PI * 1.72);
      ctx.stroke();
      ctx.restore();

      drawSparkle(ctx, 52, 16, 4.8, '#c7f9ff');
      break;
    }

    case 'treatSnaps': {
      drawParkBackdrop(ctx, '#3a2459', '#57337d', false);
      const aura = ctx.createRadialGradient(32, 34, 4, 32, 34, 28);
      aura.addColorStop(0, 'rgba(255, 179, 232, 0.36)');
      aura.addColorStop(1, 'rgba(255, 179, 232, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, 64, 64);

      // Cute cluster of golden honey-baked HUD-style snap biscuits
      drawHudStyleBone(ctx, { x: 24, y: 39, width: 27, rot: -0.35, ...HUD_BONE_PRESETS.biscuit });
      drawHudStyleBone(ctx, { x: 40, y: 44, width: 27, rot: 0.25, ...HUD_BONE_PRESETS.biscuitLight });
      drawMiniHeart(ctx, 32, 21, 9.2, '#ff8ad8');
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.arc(28.5, 18, 2.0, 0, Math.PI * 2);
      ctx.fill();
      drawSparkle(ctx, 50, 17, 4.4, '#ffeaa7');
      drawSparkle(ctx, 14, 22, 3.5, '#ffd6f5');
      break;
    }

    case 'treatCup': {
      drawParkBackdrop(ctx, '#2d285c', '#4b3b82', false);
      const aura = ctx.createRadialGradient(32, 32, 4, 32, 32, 28);
      aura.addColorStop(0, 'rgba(129, 236, 236, 0.30)');
      aura.addColorStop(1, 'rgba(129, 236, 236, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, 64, 64);

      // Cute paper pup cup base
      const cupGrad = ctx.createLinearGradient(18, 34, 46, 56);
      cupGrad.addColorStop(0, '#74b9ff');
      cupGrad.addColorStop(1, '#4a69bd');
      ctx.fillStyle = cupGrad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(19, 34);
      ctx.lineTo(45, 34);
      ctx.lineTo(41, 54);
      ctx.quadraticCurveTo(32, 57, 23, 54);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cup paw stripe & white rim
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.fillRect(22, 42, 20, 4.5);
      ctx.fillStyle = '#f5f6fa';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.roundRect(16.5, 31, 31, 5.2, 2.5);
      ctx.fill();
      ctx.stroke();

      // Fluffy vanilla whipped-cream swirl
      const creamGrad = ctx.createLinearGradient(22, 10, 42, 33);
      creamGrad.addColorStop(0, '#ffffff');
      creamGrad.addColorStop(1, '#ece7ff');
      ctx.fillStyle = creamGrad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(19, 32);
      ctx.quadraticCurveTo(17, 24, 24, 23);
      ctx.quadraticCurveTo(22, 16, 30, 15);
      ctx.quadraticCurveTo(33, 9, 37, 13);
      ctx.quadraticCurveTo(43, 15, 41, 22);
      ctx.quadraticCurveTo(47, 24, 45, 32);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Mini golden HUD-style bone biscuit tucked into cream
      drawHudStyleBone(ctx, { x: 43, y: 19, width: 16, rot: 0.55, ...HUD_BONE_PRESETS.biscuitLight });
      drawSparkle(ctx, 15, 16, 4.4, '#ffeaa7');
      break;
    }

    case 'treatXp': {
      drawParkBackdrop(ctx, '#22285a', '#3c3480', false);
      const aura = ctx.createRadialGradient(32, 32, 5, 32, 32, 28);
      aura.addColorStop(0, 'rgba(162, 155, 254, 0.52)');
      aura.addColorStop(1, 'rgba(162, 155, 254, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, 64, 64);

      // Crisp golden star-baked HUD-style XP bone biscuit
      drawHudStyleBone(ctx, { x: 32, y: 34, width: 45, rot: -0.32, ...HUD_BONE_PRESETS.biscuit });

      // Glowing lavender-gold XP star emblem stamped in center
      ctx.save();
      ctx.translate(32, 34);
      ctx.rotate(-0.32);
      ctx.fillStyle = '#a29bfe';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? 7.2 : 3.2;
        const px = Math.cos(ang) * rad;
        const py = Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      drawSparkle(ctx, 14, 16, 5.2, '#81ecec');
      drawSparkle(ctx, 51, 18, 4.6, '#ffeaa7');
      drawSparkle(ctx, 48, 49, 4.0, '#c7bfff');
      break;
    }

    case 'treatKong': {
      drawParkBackdrop(ctx, '#381e4a', '#592963', false);
      const aura = ctx.createRadialGradient(32, 34, 4, 32, 34, 28);
      aura.addColorStop(0, 'rgba(255, 234, 167, 0.42)');
      aura.addColorStop(1, 'rgba(255, 234, 167, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, 64, 64);

      // Iconic tiered ruby-red rubber Kong toy
      const redGrad = ctx.createLinearGradient(18, 16, 46, 52);
      redGrad.addColorStop(0, '#ff6b6b');
      redGrad.addColorStop(0.5, '#e83a3a');
      redGrad.addColorStop(1, '#a81818');

      // Bottom bulb
      ctx.fillStyle = redGrad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.3;
      ctx.beginPath();
      ctx.ellipse(32, 44, 14.5, 10.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Middle bulb
      ctx.beginPath();
      ctx.ellipse(32, 31.5, 11.4, 8.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Top bulb
      ctx.beginPath();
      ctx.ellipse(32, 20.5, 8.2, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Glossy highlights on bulbs
      ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.beginPath();
      ctx.ellipse(25, 42, 3.0, 5.2, 0.2, 0, Math.PI * 2);
      ctx.ellipse(26.5, 30.5, 2.3, 4.0, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Creamy golden peanut butter overflowing the top opening!
      const pbGrad = ctx.createLinearGradient(25, 11, 39, 24);
      pbGrad.addColorStop(0, '#ffe082');
      pbGrad.addColorStop(0.55, '#e69f38');
      pbGrad.addColorStop(1, '#c5771d');
      ctx.fillStyle = pbGrad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(25.5, 17.5);
      ctx.quadraticCurveTo(26, 11.5, 32, 12.2);
      ctx.quadraticCurveTo(38, 11.2, 38.5, 17.5);
      ctx.quadraticCurveTo(40.5, 22.5, 36.5, 23.2);
      ctx.quadraticCurveTo(34.5, 19.5, 32.5, 20.8);
      ctx.quadraticCurveTo(29.8, 25.0, 27.6, 22.0);
      ctx.quadraticCurveTo(24.2, 20.8, 25.5, 17.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      drawSparkle(ctx, 49, 16, 5.2, '#ffeaa7');
      drawSparkle(ctx, 15, 22, 4.0, '#ffeaa7');
      break;
    }

    case 'treatFeast': {
      drawParkBackdrop(ctx, '#3d2240', '#633349', false);
      const aura = ctx.createRadialGradient(32, 33, 4, 32, 33, 28);
      aura.addColorStop(0, 'rgba(255, 168, 128, 0.36)');
      aura.addColorStop(1, 'rgba(255, 168, 128, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, 64, 64);

      // Bold savory meat-colored HUD-style jumbo bone
      drawHudStyleBone(ctx, { x: 32, y: 33, width: 48, rot: -0.42, ...HUD_BONE_PRESETS.meaty });

      drawSparkle(ctx, 15, 16, 4.6, '#ffeaa7');
      drawSparkle(ctx, 50, 48, 4.0, '#ffd8a8');
      break;
    }

    case 'treatBacon': {
      drawParkBackdrop(ctx, '#422036', '#6b2f42', false);
      const aura = ctx.createRadialGradient(32, 32, 4, 32, 32, 28);
      aura.addColorStop(0, 'rgba(255, 159, 104, 0.42)');
      aura.addColorStop(1, 'rgba(255, 159, 104, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, 64, 64);

      // Sizzling wavy crispy bacon chew strip
      ctx.save();
      ctx.translate(32, 34);
      ctx.rotate(-0.48);

      const stripPath = (yOffset: number, halfH: number) => {
        ctx.beginPath();
        ctx.moveTo(-22, yOffset - halfH + 2);
        ctx.bezierCurveTo(-11, yOffset - halfH - 5, -2, yOffset - halfH + 6, 9, yOffset - halfH - 4);
        ctx.quadraticCurveTo(16, yOffset - halfH - 6, 22, yOffset - halfH + 1);
        ctx.lineTo(22, yOffset + halfH + 1);
        ctx.quadraticCurveTo(16, yOffset + halfH - 6, 9, yOffset + halfH - 4);
        ctx.bezierCurveTo(-2, yOffset + halfH + 6, -11, yOffset + halfH - 5, -22, yOffset + halfH + 2);
        ctx.closePath();
      };

      const baconGrad = ctx.createLinearGradient(0, -10, 0, 10);
      baconGrad.addColorStop(0, '#d9483b');
      baconGrad.addColorStop(0.5, '#b82e24');
      baconGrad.addColorStop(1, '#851c16');
      ctx.fillStyle = baconGrad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.4;
      stripPath(0, 9.5);
      ctx.fill();
      ctx.stroke();

      // Marbled cream-gold crispy fat ribbons
      ctx.fillStyle = '#ffe5c2';
      stripPath(-2.4, 2.3);
      ctx.fill();
      ctx.fillStyle = '#ffd1a3';
      stripPath(3.6, 1.9);
      ctx.fill();

      // Crisp edge sheen
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(-16, -6.5);
      ctx.quadraticCurveTo(-5, -10, 4, -5);
      ctx.stroke();
      ctx.restore();

      // Warm sizzle aroma wisps
      ctx.strokeStyle = 'rgba(255, 234, 167, 0.75)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(16, 20);
      ctx.quadraticCurveTo(14, 14, 18, 10);
      ctx.moveTo(24, 16);
      ctx.quadraticCurveTo(22, 11, 26, 7);
      ctx.stroke();
      drawSparkle(ctx, 51, 18, 4.6, '#ffeaa7');
      break;
    }

    case 'decorFlowers': {
      drawParkBackdrop(ctx, '#263f6b', '#3b6496', true);

      // Exact in-game drawFlowerPatch geometry (stone ring, loam soil, veined leaves, 7 storybook blossoms)
      ctx.save();
      ctx.translate(32, 41);
      ctx.scale(1.42, 1.42);

      // Grounded shadow under garden bed
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0.5, 4.2, 18.5, 9.2, 0, 0, Math.PI * 2);
      ctx.fill();

      const borderStones = [
        { x: -14.2, y: -0.2, rx: 3.1, ry: 1.8, rot: -0.25, c: '#8d99a6', hi: '#c5d0db', front: false },
        { x: -9.5, y: -3.2, rx: 3.3, ry: 1.8, rot: -0.15, c: '#9ba7b4', hi: '#d1dbe5', front: false },
        { x: -3.4, y: -4.4, rx: 3.5, ry: 1.8, rot: 0, c: '#85929e', hi: '#bcc7d1', front: false },
        { x: 3.6, y: -4.3, rx: 3.4, ry: 1.8, rot: 0.08, c: '#9aa6b2', hi: '#d0dae3', front: false },
        { x: 9.8, y: -3.0, rx: 3.2, ry: 1.8, rot: 0.2, c: '#8693a0', hi: '#bec9d4', front: false },
        { x: 14.3, y: -0.1, rx: 3.1, ry: 1.8, rot: 0.28, c: '#7f8c99', hi: '#b6c2cd', front: false },
        { x: -13.6, y: 3.0, rx: 3.2, ry: 1.9, rot: 0.25, c: '#8a96a3', hi: '#c7d2dc', front: true },
        { x: -8.4, y: 5.5, rx: 3.5, ry: 2.0, rot: 0.16, c: '#9aa6b3', hi: '#d6e0e9', front: true },
        { x: -2.6, y: 6.7, rx: 3.6, ry: 2.0, rot: 0.04, c: '#85929f', hi: '#c2cdd8', front: true },
        { x: 3.4, y: 6.6, rx: 3.5, ry: 2.0, rot: -0.05, c: '#96a2af', hi: '#d3dde6', front: true },
        { x: 9.1, y: 5.2, rx: 3.4, ry: 1.9, rot: -0.18, c: '#818e9b', hi: '#bcc7d2', front: true },
        { x: 13.8, y: 2.7, rx: 3.1, ry: 1.8, rot: -0.26, c: '#7a8794', hi: '#b5c1cc', front: true }
      ];

      const drawGardenStone = (st: (typeof borderStones)[number]): void => {
        ctx.save();
        ctx.translate(st.x, st.y);
        ctx.rotate(st.rot);
        ctx.fillStyle = '#56606b';
        ctx.beginPath();
        ctx.ellipse(0, 0.7, st.rx, st.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = st.c;
        ctx.beginPath();
        ctx.ellipse(0, 0, st.rx, st.ry * 0.92, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = st.hi;
        ctx.beginPath();
        ctx.ellipse(-st.rx * 0.22, -st.ry * 0.26, st.rx * 0.48, st.ry * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      };

      borderStones.filter(st => !st.front).forEach(drawGardenStone);

      // Rich shaded dark-loam flowerbed soil
      const soilGrad = ctx.createRadialGradient(-2, -1, 1.5, 0, 1.2, 15.5);
      soilGrad.addColorStop(0, '#7c502e');
      soilGrad.addColorStop(0.65, '#5f3a1f');
      soilGrad.addColorStop(1, '#432713');
      ctx.fillStyle = soilGrad;
      ctx.beginPath();
      ctx.ellipse(0, 1.2, 14.2, 6.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Lush deep-emerald back foliage cushion
      const backLeaves = [
        { x: -10.2, y: -0.6, rx: 5.2, ry: 3.1, rot: -0.45 },
        { x: -4.8, y: -2.4, rx: 5.8, ry: 3.5, rot: -0.18 },
        { x: 1.8, y: -2.8, rx: 6.0, ry: 3.6, rot: 0.1 },
        { x: 8.6, y: -1.4, rx: 5.4, ry: 3.2, rot: 0.38 },
        { x: 11.4, y: 0.6, rx: 4.4, ry: 2.6, rot: 0.52 }
      ];
      ctx.fillStyle = '#1b7a43';
      backLeaves.forEach(lf => {
        ctx.save();
        ctx.translate(lf.x, lf.y);
        ctx.rotate(lf.rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, lf.rx, lf.ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      const drawPointedLeaf = (
        x: number,
        y: number,
        angle: number,
        length: number,
        width: number,
        fill: string,
        vein: string
      ): void => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(length * 0.48, -width, length, 0);
        ctx.quadraticCurveTo(length * 0.48, width, 0, 0);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = vein;
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(length * 0.15, 0);
        ctx.lineTo(length * 0.78, 0);
        ctx.stroke();
        ctx.restore();
      };

      drawPointedLeaf(-5.5, 0.5, -2.55, 8.8, 3.0, '#27ae60', 'rgba(123,237,159,0.55)');
      drawPointedLeaf(-1.5, -1.2, -1.95, 8.2, 2.8, '#2ecc71', 'rgba(190,255,205,0.55)');
      drawPointedLeaf(3.2, -1.0, -0.95, 8.4, 2.9, '#27ae60', 'rgba(123,237,159,0.55)');
      drawPointedLeaf(6.2, 0.6, -0.45, 8.6, 2.9, '#2ecc71', 'rgba(190,255,205,0.55)');
      drawPointedLeaf(-8.2, 2.2, -2.9, 6.8, 2.4, '#2ecc71', 'rgba(190,255,205,0.5)');
      drawPointedLeaf(8.0, 2.5, 0.12, 6.8, 2.4, '#27ae60', 'rgba(123,237,159,0.5)');

      // Front garden stones hugging the front soil rim
      borderStones.filter(st => st.front).forEach(drawGardenStone);

      // Sunlit moss puffs nestled just inside front rim
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.ellipse(-6.0, 2.6, 4.4, 2.2, -0.15, 0, Math.PI * 2);
      ctx.ellipse(0.5, 3.4, 5.0, 2.3, 0.05, 0, Math.PI * 2);
      ctx.ellipse(6.8, 2.5, 4.3, 2.1, 0.18, 0, Math.PI * 2);
      ctx.fill();

      // Exact 7 multi-petal blossoms from drawFlowerPatch
      const flowerData = [
        { bx: -3.2, by: -2.2, h: 11.2, lean: -1.6, r: 4.5, petals: 5, c: '#a29bfe', shade: '#6c5ce7', hi: '#e3e0ff', center: '#fff3b0' },
        { bx: 4.6, by: -2.0, h: 10.8, lean: 1.8, r: 4.4, petals: 5, c: '#ff7675', shade: '#d63031', hi: '#ffc2c2', center: '#ffeaa7' },
        { bx: -8.2, by: 0.4, h: 8.8, lean: -2.2, r: 4.1, petals: 5, c: '#fd79a8', shade: '#d63384', hi: '#ffd0e3', center: '#ffeaa7' },
        { bx: 9.0, by: 0.6, h: 8.6, lean: 2.3, r: 4.0, petals: 5, c: '#ffeaa7', shade: '#f39c12', hi: '#fffbe6', center: '#e17055' },
        { bx: 0.4, by: 0.8, h: 9.8, lean: -0.4, r: 4.7, petals: 6, c: '#ffffff', shade: '#ced6e0', hi: '#ffffff', center: '#f9ca24' },
        { bx: -4.4, by: 2.6, h: 7.4, lean: -1.1, r: 3.9, petals: 5, c: '#74b9ff', shade: '#0984e3', hi: '#d0e8ff', center: '#ffeaa7' },
        { bx: 5.0, by: 2.8, h: 7.2, lean: 1.2, r: 3.9, petals: 5, c: '#fab1a0', shade: '#e17055', hi: '#ffe3dc', center: '#fff3b0' }
      ];

      flowerData.forEach(f => {
        const hx = f.bx + f.lean;
        const hy = f.by - f.h;
        const ctrlX = f.bx + f.lean * 0.35;
        const ctrlY = f.by - f.h * 0.52;

        ctx.strokeStyle = '#1b8a4e';
        ctx.lineWidth = 1.65;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(f.bx, f.by);
        ctx.quadraticCurveTo(ctrlX, ctrlY, hx, hy);
        ctx.stroke();

        ctx.strokeStyle = '#55efc4';
        ctx.lineWidth = 0.55;
        ctx.beginPath();
        ctx.moveTo(f.bx - 0.3, f.by - 0.6);
        ctx.quadraticCurveTo(ctrlX - 0.3, ctrlY, hx - 0.25, hy + 1.0);
        ctx.stroke();

        const leafSide = f.lean >= 0 ? -1 : 1;
        drawPointedLeaf(
          (f.bx + hx) * 0.5,
          (f.by + hy) * 0.5 + 0.8,
          leafSide > 0 ? -0.45 : -2.65,
          4.2,
          1.5,
          '#2ecc71',
          'rgba(220,255,220,0.45)'
        );

        ctx.save();
        ctx.translate(hx, hy);

        ctx.fillStyle = f.shade;
        for (let p = 0; p < f.petals; p++) {
          const a = (p / f.petals) * Math.PI * 2 - Math.PI * 0.5;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * f.r * 0.56, Math.sin(a) * f.r * 0.48 + 0.65, f.r * 0.46, f.r * 0.36, a, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = f.c;
        for (let p = 0; p < f.petals; p++) {
          const a = (p / f.petals) * Math.PI * 2 - Math.PI * 0.5;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * f.r * 0.56, Math.sin(a) * f.r * 0.48, f.r * 0.45, f.r * 0.35, a, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = f.hi;
        for (let p = 0; p < f.petals; p++) {
          const a = (p / f.petals) * Math.PI * 2 - Math.PI * 0.5;
          if (Math.sin(a) > 0.35) continue;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a) * f.r * 0.62, Math.sin(a) * f.r * 0.52 - 0.35, f.r * 0.24, f.r * 0.15, a, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = 'rgba(90, 48, 12, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0.35, f.r * 0.34, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = f.center;
        ctx.beginPath();
        ctx.arc(0, 0, f.r * 0.32, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
        ctx.beginPath();
        ctx.arc(-f.r * 0.09, -f.r * 0.09, f.r * 0.11, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      ctx.restore();
      break;
    }

    case 'decorHydrant': {
      drawParkBackdrop(ctx, '#263a66', '#3d588a', true);
      drawGroundShadow(ctx, 32, 52, 16, 5.4);
      ctx.save();
      ctx.translate(32, 49);
      drawHydrantShape(ctx, false, 1.18);
      ctx.restore();
      break;
    }

    case 'decorTree': {
      drawParkBackdrop(ctx, '#25426b', '#4171a1', true);

      // Exact in-game drawDetailedTreeAt geometry (flared bark trunk, forked boughs, layered soft foliage puffs)
      ctx.save();
      ctx.translate(32, 51.5);
      ctx.scale(0.86, 0.86);

      // Dappled canopy ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.30)';
      ctx.beginPath();
      ctx.ellipse(1.5, 4.5, 21, 9.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Soft moss tuft around root base
      ctx.fillStyle = '#2b8a3e';
      ctx.beginPath();
      ctx.ellipse(0, 2.2, 9.2, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tapered organic bark trunk with flared roots & forked boughs
      const trunkGrad = ctx.createLinearGradient(-6, 0, 6, 0);
      trunkGrad.addColorStop(0, '#5a3822');
      trunkGrad.addColorStop(0.38, '#8d5b3a');
      trunkGrad.addColorStop(0.75, '#724629');
      trunkGrad.addColorStop(1, '#4c2e1b');
      ctx.fillStyle = trunkGrad;
      ctx.beginPath();
      ctx.moveTo(-7.2, 2.8);
      ctx.quadraticCurveTo(-4.4, -2.5, -4.0, -18.5);
      ctx.lineTo(-8.5, -24.5);
      ctx.lineTo(-5.2, -25.8);
      ctx.lineTo(-1.2, -20.8);
      ctx.lineTo(1.2, -20.8);
      ctx.lineTo(6.2, -26.2);
      ctx.lineTo(8.6, -24.2);
      ctx.lineTo(4.0, -18.0);
      ctx.quadraticCurveTo(4.5, -2.5, 7.2, 2.8);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#3f2414';
      ctx.lineWidth = 0.85;
      ctx.stroke();

      // Subtle vertical bark grain lines
      ctx.strokeStyle = 'rgba(48, 26, 12, 0.42)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-1.8, -1.5);
      ctx.quadraticCurveTo(-1.4, -9, -2.0, -16);
      ctx.moveTo(1.6, 0.5);
      ctx.quadraticCurveTo(2.0, -7, 1.4, -14.5);
      ctx.stroke();

      // Deep forest shaded underside foliage puffs
      ctx.fillStyle = '#1b7a43';
      ctx.beginPath();
      ctx.arc(-11.5, -25.5, 11.2, 0, Math.PI * 2);
      ctx.arc(11.8, -25.0, 10.8, 0, Math.PI * 2);
      ctx.arc(0, -23.5, 13.0, 0, Math.PI * 2);
      ctx.fill();

      // Rich mid-emerald canopy body clusters
      ctx.fillStyle = '#27ae60';
      ctx.beginPath();
      ctx.arc(-10.5, -30.5, 11.5, 0, Math.PI * 2);
      ctx.arc(10.5, -30.0, 11.2, 0, Math.PI * 2);
      ctx.arc(0, -34.5, 13.8, 0, Math.PI * 2);
      ctx.fill();

      // Vibrant upper leaf puffs
      ctx.fillStyle = '#2ecc71';
      ctx.beginPath();
      ctx.arc(-7.5, -35.8, 9.6, 0, Math.PI * 2);
      ctx.arc(7.8, -35.0, 9.2, 0, Math.PI * 2);
      ctx.arc(0.5, -40.5, 10.5, 0, Math.PI * 2);
      ctx.fill();

      // Sunlit golden-lime crown highlights
      ctx.fillStyle = '#7bed9f';
      ctx.beginPath();
      ctx.arc(-5.2, -39.5, 5.4, 0, Math.PI * 2);
      ctx.arc(3.8, -42.5, 5.0, 0, Math.PI * 2);
      ctx.arc(8.4, -36.8, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Tiny decorative leaf stipples
      ctx.fillStyle = 'rgba(220, 255, 210, 0.55)';
      [
        { x: -11, y: -33, r: 1.5 },
        { x: -2, y: -45, r: 1.7 },
        { x: 9, y: -39, r: 1.5 },
        { x: 2, y: -31, r: 1.4 }
      ].forEach(dot => {
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      break;
    }

    case 'decorLamp': {
      drawParkBackdrop(ctx, '#181a3d', '#2d285c', true);

      // Exact in-game drawLampPost geometry (flared octagonal iron base, mid collar, crossbar, glass mullion, Victorian cap)
      ctx.save();
      ctx.translate(32, 53);
      ctx.scale(0.92, 0.92);

      const glowStrength = 0.92;

      // Warm golden ground pool
      const poolGrad = ctx.createRadialGradient(0, 2, 2, 0, 2, 34);
      poolGrad.addColorStop(0, `rgba(255, 224, 130, ${0.42 * glowStrength})`);
      poolGrad.addColorStop(0.55, `rgba(255, 198, 92, ${0.20 * glowStrength})`);
      poolGrad.addColorStop(1, 'rgba(255, 198, 92, 0)');
      ctx.fillStyle = poolGrad;
      ctx.beginPath();
      ctx.ellipse(0, 2, 34, 17, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ground shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
      ctx.beginPath();
      ctx.ellipse(0, 3.5, 9.5, 4.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Flared octagonal cast-iron pedestal base
      ctx.fillStyle = '#2c343c';
      ctx.strokeStyle = '#181d22';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(0, 1.6, 7.2, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#39434d';
      ctx.beginPath();
      ctx.moveTo(-4.4, 1.0);
      ctx.lineTo(-2.3, -9.0);
      ctx.lineTo(2.3, -9.0);
      ctx.lineTo(4.4, 1.0);
      ctx.closePath();
      ctx.fill();

      // Slender iron post + highlight + decorative mid collar
      ctx.fillStyle = '#2d353e';
      ctx.fillRect(-1.8, -32.0, 3.6, 24.0);
      ctx.fillStyle = '#4e5b68';
      ctx.fillRect(-0.8, -32.0, 1.0, 24.0);

      ctx.fillStyle = '#3e4a56';
      ctx.beginPath();
      ctx.ellipse(0, -18.0, 3.2, 1.4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ornamental scroll crossbar beneath lantern
      ctx.strokeStyle = '#2c343c';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-6.2, -31.5);
      ctx.lineTo(6.2, -31.5);
      ctx.stroke();

      // Lantern ambient glow bloom
      const lanternHalo = ctx.createRadialGradient(0, -37.2, 2, 0, -37.2, 21);
      lanternHalo.addColorStop(0, `rgba(255, 243, 176, ${0.72 * glowStrength})`);
      lanternHalo.addColorStop(0.5, `rgba(255, 204, 102, ${0.30 * glowStrength})`);
      lanternHalo.addColorStop(1, 'rgba(255, 204, 102, 0)');
      ctx.fillStyle = lanternHalo;
      ctx.beginPath();
      ctx.arc(0, -37.2, 21, 0, Math.PI * 2);
      ctx.fill();

      // Lantern glass housing (trapezoid)
      const glassGrad = ctx.createRadialGradient(0, -37.5, 1, 0, -37.5, 7);
      glassGrad.addColorStop(0, '#fffef0');
      glassGrad.addColorStop(0.55, '#ffe588');
      glassGrad.addColorStop(1, '#f3b647');
      ctx.fillStyle = glassGrad;
      ctx.strokeStyle = '#252c33';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-3.6, -32.2);
      ctx.lineTo(-5.4, -41.5);
      ctx.lineTo(5.4, -41.5);
      ctx.lineTo(3.6, -32.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Center vertical lantern mullion
      ctx.strokeStyle = 'rgba(37, 44, 51, 0.72)';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(0, -32.2);
      ctx.lineTo(0, -41.5);
      ctx.stroke();

      // Peaked Victorian lantern cap + finial spire
      ctx.fillStyle = '#242b32';
      ctx.beginPath();
      ctx.moveTo(-6.6, -41.4);
      ctx.lineTo(0, -46.8);
      ctx.lineTo(6.6, -41.4);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, -47.6, 1.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      break;
    }

    case 'decorFountain': {
      drawParkBackdrop(ctx, '#243c6b', '#3a6294', true);

      // Exact in-game drawWaterFountain geometry (3-tier sculpted limestone & marble centerpiece with 8 cascading arcs)
      ctx.save();
      ctx.translate(32, 46);
      ctx.scale(1.06, 1.06);

      // Grounded soft shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
      ctx.beginPath();
      ctx.ellipse(0, 5.5, 24, 11.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sculpted limestone base plinth
      const baseGrad = ctx.createLinearGradient(-21, 0, 21, 0);
      baseGrad.addColorStop(0, '#99a5b2');
      baseGrad.addColorStop(0.32, '#dce3ea');
      baseGrad.addColorStop(0.7, '#bfc8d2');
      baseGrad.addColorStop(1, '#7f8c99');
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.ellipse(0, 3.2, 21, 10.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // Outer basin vertical wall
      ctx.fillStyle = baseGrad;
      ctx.beginPath();
      ctx.ellipse(0, 2.2, 19.5, 9.2, 0, 0, Math.PI);
      ctx.lineTo(-19.5, -2.5);
      ctx.ellipse(0, -2.5, 19.5, 9.2, 0, Math.PI, 0, true);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#6c7a89';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Beveled bright marble outer rim
      ctx.fillStyle = '#eef3f7';
      ctx.strokeStyle = '#9aa7b4';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, -2.5, 19.5, 9.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Recessed inner basin wall
      ctx.fillStyle = '#7f8fa6';
      ctx.beginPath();
      ctx.ellipse(0, -2.2, 16.5, 7.6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Layered turquoise-to-cerulean water pool
      const waterGrad = ctx.createRadialGradient(-3, -3.5, 2, 0, -2, 16);
      waterGrad.addColorStop(0, '#48dbfb');
      waterGrad.addColorStop(0.55, '#0984e3');
      waterGrad.addColorStop(1, '#0652dd');
      ctx.fillStyle = waterGrad;
      ctx.beginPath();
      ctx.ellipse(0, -1.6, 15.6, 7.0, 0, 0, Math.PI * 2);
      ctx.fill();

      // Two staggered concentric water ripples
      [0.24, 0.72].forEach(cycle => {
        const radX = 4.2 + cycle * 10.6;
        const radY = radX * 0.45;
        ctx.strokeStyle = `rgba(225, 248, 255, ${(1 - cycle) * 0.65})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(0, -1.6, radX, radY, 0, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Subtle sunlit shimmer highlight on basin water
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(-4.5, -2.5, 5.5, 2.1, -0.15, Math.PI * 1.05, Math.PI * 1.85);
      ctx.stroke();

      // Fluted center marble column
      const colGrad = ctx.createLinearGradient(-4.5, 0, 4.5, 0);
      colGrad.addColorStop(0, '#9aa7b4');
      colGrad.addColorStop(0.35, '#f5f8fa');
      colGrad.addColorStop(0.75, '#cfd8e0');
      colGrad.addColorStop(1, '#83919e');
      ctx.fillStyle = colGrad;
      ctx.beginPath();
      ctx.moveTo(-4.8, -1.5);
      ctx.lineTo(-3.6, -24.5);
      ctx.lineTo(3.6, -24.5);
      ctx.lineTo(4.8, -1.5);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#7e8c99';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Decorative carved pedestal base ring
      ctx.fillStyle = '#e6edf2';
      ctx.beginPath();
      ctx.ellipse(0, -2.2, 6.2, 2.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Mid-tier sculpted saucer bowl underside
      ctx.fillStyle = '#a5b2bf';
      ctx.beginPath();
      ctx.ellipse(0, -16.8, 10.8, 4.8, 0, 0, Math.PI);
      ctx.quadraticCurveTo(-5, -12.5, 0, -12.2);
      ctx.quadraticCurveTo(5, -12.5, 10.8, -16.8);
      ctx.closePath();
      ctx.fill();

      // Mid-tier saucer rim
      ctx.fillStyle = '#f1f5f8';
      ctx.strokeStyle = '#8b99a7';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, -17.4, 11.4, 5.0, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Mid-tier water pool
      const midWaterGrad = ctx.createRadialGradient(-2, -18, 1, 0, -17.4, 9.5);
      midWaterGrad.addColorStop(0, '#74f0ff');
      midWaterGrad.addColorStop(1, '#0984e3');
      ctx.fillStyle = midWaterGrad;
      ctx.beginPath();
      ctx.ellipse(0, -17.4, 9.2, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Upper tier neck
      ctx.fillStyle = colGrad;
      ctx.beginPath();
      ctx.moveTo(-2.8, -17.6);
      ctx.lineTo(-2.1, -28.5);
      ctx.lineTo(2.1, -28.5);
      ctx.lineTo(2.8, -17.6);
      ctx.closePath();
      ctx.fill();

      // Top small saucer & brass nozzle
      ctx.fillStyle = '#eef3f7';
      ctx.strokeStyle = '#8b99a7';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.ellipse(0, -27.2, 5.2, 2.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f6d365';
      ctx.beginPath();
      ctx.arc(0, -29.6, 2.0, 0, Math.PI * 2);
      ctx.fill();

      // 4 Lower cascading parabolic water arcs (mid bowl -> main basin)
      const lowerStreams = [
        { sx: -9.5, sy: -16.4, cx: -13.5, cy: -11.5, ex: -12.6, ey: -1.8, t: 0.35 },
        { sx: 9.5, sy: -16.4, cx: 13.5, cy: -11.5, ex: 12.6, ey: -1.8, t: 0.62 },
        { sx: -4.2, sy: -14.2, cx: -6.8, cy: -8.5, ex: -6.2, ey: 0.4, t: 0.78 },
        { sx: 4.2, sy: -14.2, cx: 6.8, cy: -8.5, ex: 6.2, ey: 0.4, t: 0.28 }
      ];
      lowerStreams.forEach(st => {
        ctx.strokeStyle = 'rgba(148, 226, 255, 0.82)';
        ctx.lineWidth = 1.65;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(st.sx, st.sy);
        ctx.quadraticCurveTo(st.cx, st.cy, st.ex, st.ey);
        ctx.stroke();

        const omt = 1 - st.t;
        const dx = omt * omt * st.sx + 2 * omt * st.t * st.cx + st.t * st.t * st.ex;
        const dy = omt * omt * st.sy + 2 * omt * st.t * st.cy + st.t * st.t * st.ey;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
        ctx.beginPath();
        ctx.arc(dx, dy, 1.15, 0, Math.PI * 2);
        ctx.fill();
      });

      // 4 Upper cascading parabolic water arcs (crown -> mid bowl)
      const upperStreams = [
        { sx: -1.4, sy: -30.2, cx: -6.4, cy: -34.2, ex: -7.6, ey: -17.6 },
        { sx: 1.4, sy: -30.2, cx: 6.4, cy: -34.2, ex: 7.6, ey: -17.6 },
        { sx: -0.7, sy: -30.2, cx: -3.2, cy: -32.6, ex: -3.6, ey: -16.6 },
        { sx: 0.7, sy: -30.2, cx: 3.2, cy: -32.6, ex: 3.6, ey: -16.6 }
      ];
      upperStreams.forEach(st => {
        ctx.strokeStyle = 'rgba(205, 244, 255, 0.88)';
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(st.sx, st.sy);
        ctx.quadraticCurveTo(st.cx, st.cy, st.ex, st.ey);
        ctx.stroke();
      });

      // Bubbling top water plume + mist sparkles
      const jetHeight = 3.8;
      ctx.fillStyle = 'rgba(230, 250, 255, 0.92)';
      ctx.beginPath();
      ctx.ellipse(0, -32.2 - jetHeight * 0.5, 2.4, 2.2 + jetHeight * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      [
        { x: -3.2, y: -35.0 },
        { x: 3.0, y: -34.2 },
        { x: 0.4, y: -37.8 }
      ].forEach(sp => {
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 1.05, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.restore();
      break;
    }

    case 'decorSlide': {
      drawParkBackdrop(ctx, '#243c6b', '#3d6394', true);
      drawGroundShadow(ctx, 32, 53, 22, 5.6);

      // Royal-blue tubular ladder & support frame matching drawDogSlide (#2980b9 / #3498db)
      const drawPipe = (x1: number, y1: number, x2: number, y2: number, w: number, col: string) => {
        ctx.strokeStyle = INK;
        ctx.lineWidth = w + 2.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.strokeStyle = col;
        ctx.lineWidth = w;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      };

      // Rear ladder rails & rungs
      drawPipe(11, 49, 21, 21, 2.6, '#2980b9');
      drawPipe(17, 51, 27, 23, 2.6, '#3498db');
      for (let i = 1; i <= 4; i++) {
        const t = i / 5;
        drawPipe(11 + 10 * t, 49 - 28 * t, 17 + 10 * t, 51 - 28 * t, 2.0, '#5dade2');
      }

      // Vertical tower support posts
      drawPipe(23, 49, 23, 21, 2.8, '#2471a3');
      drawPipe(29, 51, 29, 23, 2.8, '#3498db');

      // Top blue landing deck & safety handrails
      drawPipe(22, 21, 22, 13, 2.4, '#2471a3');
      drawPipe(22, 13, 28, 15, 2.4, '#2471a3');
      ctx.fillStyle = '#2980b9';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(20, 21);
      ctx.lineTo(31, 21);
      ctx.lineTo(33, 25);
      ctx.lineTo(22, 25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sweeping glossy sunny-yellow slide chute (#ffe169 / #f6c90e)
      const chuteGrad = ctx.createLinearGradient(26, 22, 54, 49);
      chuteGrad.addColorStop(0, '#ffe169');
      chuteGrad.addColorStop(0.55, '#f6c90e');
      chuteGrad.addColorStop(1, '#e0a400');
      ctx.fillStyle = chuteGrad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(25, 23);
      ctx.quadraticCurveTo(37, 42, 54, 45);
      ctx.lineTo(50, 51);
      ctx.quadraticCurveTo(32, 47, 22, 25);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Chute specular shine
      ctx.strokeStyle = 'rgba(255, 253, 224, 0.8)';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(26, 25.5);
      ctx.quadraticCurveTo(36, 43, 50, 47);
      ctx.stroke();

      // Front blue handrail
      drawPipe(29, 23, 29, 15, 2.6, '#3498db');
      drawPipe(29, 15, 34, 17, 2.6, '#5dade2');
      drawSparkle(ctx, 50, 16, 4.4, '#ffeaa7');
      break;
    }

    case 'decorGoldenHydrant': {
      drawParkBackdrop(ctx, '#29224d', '#4c3875', true);

      // Prestige golden aura
      const aura = ctx.createRadialGradient(32, 30, 4, 32, 30, 26);
      aura.addColorStop(0, 'rgba(255, 234, 167, 0.55)');
      aura.addColorStop(1, 'rgba(255, 234, 167, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(32, 30, 26, 0, Math.PI * 2);
      ctx.fill();

      drawGroundShadow(ctx, 32, 54, 19, 5.4);

      // Dual-stepped ivory marble monument plinth with gold trim
      ctx.fillStyle = '#aebbc7';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(32, 52, 17.5, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f5f8fc';
      ctx.beginPath();
      ctx.ellipse(32, 49.4, 15.6, 5.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#e2b128';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(32, 48.8, 13.2, 4.2, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 24k Gold Hydrant on plinth
      ctx.save();
      ctx.translate(32, 46.5);
      drawHydrantShape(ctx, true, 1.04);
      ctx.restore();

      drawSparkle(ctx, 16, 18, 5.0, '#fff9d6');
      drawSparkle(ctx, 49, 22, 4.5, '#ffeaa7');
      drawSparkle(ctx, 36, 9, 3.8, '#ffffff');
      break;
    }

    case 'decorDoghouseManor': {
      drawParkBackdrop(ctx, '#241e4a', '#463170', true);
      const aura = ctx.createRadialGradient(32, 28, 5, 32, 28, 28);
      aura.addColorStop(0, 'rgba(255, 224, 140, 0.38)');
      aura.addColorStop(1, 'rgba(255, 224, 140, 0)');
      ctx.fillStyle = aura;
      ctx.fillRect(0, 0, 64, 64);

      drawGroundShadow(ctx, 32, 53, 24, 5.8);

      // Side wings (storybook cream walls & burgundy wing roofs)
      ctx.fillStyle = '#f3e5c8';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.fillRect(10, 31, 44, 21);
      ctx.strokeRect(10, 31, 44, 21);

      // Side wing roofs
      const roofGrad = ctx.createLinearGradient(0, 10, 0, 34);
      roofGrad.addColorStop(0, '#c0392b');
      roofGrad.addColorStop(1, '#7f1d1d');
      ctx.fillStyle = roofGrad;
      ctx.beginPath();
      ctx.moveTo(6, 33);
      ctx.lineTo(15, 23);
      ctx.lineTo(49, 23);
      ctx.lineTo(58, 33);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Central grand manor tower & pitched gable roof
      ctx.fillStyle = '#fff5e0';
      ctx.fillRect(20, 24, 24, 28);
      ctx.strokeRect(20, 24, 24, 28);

      ctx.fillStyle = roofGrad;
      ctx.beginPath();
      ctx.moveTo(16, 26);
      ctx.lineTo(32, 10);
      ctx.lineTo(48, 26);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gold gable trim & finial
      ctx.strokeStyle = '#ffd32a';
      ctx.lineWidth = 1.9;
      ctx.beginPath();
      ctx.moveTo(18, 25.5);
      ctx.lineTo(32, 12);
      ctx.lineTo(46, 25.5);
      ctx.stroke();
      ctx.fillStyle = '#ffeaa7';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(32, 9.5, 2.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Warm glowing arched doorway
      const doorGrad = ctx.createRadialGradient(32, 44, 2, 32, 44, 11);
      doorGrad.addColorStop(0, '#ffeaa7');
      doorGrad.addColorStop(0.6, '#d68910');
      doorGrad.addColorStop(1, '#5d341a');
      ctx.fillStyle = doorGrad;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(26, 52);
      ctx.lineTo(26, 40);
      ctx.arc(32, 40, 6, Math.PI, 0, false);
      ctx.lineTo(38, 52);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Wing windows & golden crest medallion above door
      ctx.fillStyle = '#ffeaa7';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.4;
      ctx.fillRect(13, 37, 5, 6);
      ctx.strokeRect(13, 37, 5, 6);
      ctx.fillRect(46, 37, 5, 6);
      ctx.strokeRect(46, 37, 5, 6);

      ctx.fillStyle = '#ffd32a';
      ctx.beginPath();
      ctx.arc(32, 22, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      drawSparkle(ctx, 12, 15, 4.4, '#ffeaa7');
      drawSparkle(ctx, 52, 16, 4.2, '#ffeaa7');
      break;
    }

    case 'decorExpansion': {
      drawParkBackdrop(ctx, '#1e3559', '#315778', false);

      // Expanded isometric 8x8 park diamond
      ctx.save();
      ctx.translate(32, 34);

      // Outer expanded lawn border glow
      const outerGrad = ctx.createLinearGradient(0, -18, 0, 18);
      outerGrad.addColorStop(0, '#6ce87f');
      outerGrad.addColorStop(1, '#2fa852');
      ctx.fillStyle = outerGrad;
      ctx.strokeStyle = '#ffeaa7';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(26, 0);
      ctx.lineTo(0, 18);
      ctx.lineTo(-26, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Inner grid lines
      ctx.strokeStyle = 'rgba(38, 23, 56, 0.28)';
      ctx.lineWidth = 1.0;
      for (let i = -2; i <= 2; i++) {
        const f = i / 3;
        ctx.beginPath();
        ctx.moveTo(-26 * (1 - Math.abs(f)), f * 18);
        ctx.lineTo(26 * (1 - Math.abs(f)), f * 18);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(-13, -9);
      ctx.lineTo(13, 9);
      ctx.moveTo(13, -9);
      ctx.lineTo(-13, 9);
      ctx.stroke();

      // Golden expansion corner arrows
      ctx.strokeStyle = '#ffeaa7';
      ctx.fillStyle = '#ffeaa7';
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      [
        [0, -24, 0, -20],
        [0, 24, 0, 20],
        [-29, 0, -26, 0],
        [29, 0, 26, 0]
      ].forEach(([tx, ty, bx, by]) => {
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(tx, ty);
        ctx.stroke();
      });

      ctx.restore();
      drawSparkle(ctx, 13, 14, 4.4, '#ffeaa7');
      drawSparkle(ctx, 52, 15, 4.0, '#ffeaa7');
      break;
    }

    case 'tileCobble':
    case 'tileSand':
    case 'tileClover':
    case 'tileGrass': {
      const tileStyle =
        id === 'tileCobble'
          ? 'cobble'
          : id === 'tileSand'
            ? 'sand'
            : id === 'tileClover'
              ? 'clover'
              : 'grass';
      drawParkBackdrop(ctx, '#1b2c4e', '#2d4973', false);

      // Exact 2x2 isometric mini-patch matching drawIsometricTile & park earth rim
      const originX = 32;
      const originY = 15.5;
      const halfW = 13.8;
      const halfH = 7.6;
      const toScreen = (gx: number, gy: number) => ({
        x: originX + (gx - gy) * halfW,
        y: originY + (gx + gy) * halfH
      });

      const leftCorner = toScreen(0, 2);
      const bottomCorner = toScreen(2, 2);
      const rightCorner = toScreen(2, 0);
      const depth = 5.4;
      const subDepth = 2.2;

      // Grounded shadow beneath mini-island
      ctx.fillStyle = 'rgba(10, 14, 28, 0.36)';
      ctx.beginPath();
      ctx.ellipse(32, bottomCorner.y + depth + 1.5, 24, 6.2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3D park earth cliff & bedrock trim on front-left & front-right edges
      const cliffEdges = [
        { a: leftCorner, b: bottomCorner, shade: '#8d603c', rim: '#5b3b23' },
        { a: bottomCorner, b: rightCorner, shade: '#6f482b', rim: '#462b18' }
      ];
      cliffEdges.forEach(edge => {
        ctx.beginPath();
        ctx.moveTo(edge.a.x, edge.a.y);
        ctx.lineTo(edge.b.x, edge.b.y);
        ctx.lineTo(edge.b.x, edge.b.y + depth);
        ctx.lineTo(edge.a.x, edge.a.y + depth);
        ctx.closePath();
        ctx.fillStyle = edge.shade;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(edge.a.x, edge.a.y + depth);
        ctx.lineTo(edge.b.x, edge.b.y + depth);
        ctx.lineTo(edge.b.x, edge.b.y + depth + subDepth);
        ctx.lineTo(edge.a.x, edge.a.y + depth + subDepth);
        ctx.closePath();
        ctx.fillStyle = edge.rim;
        ctx.fill();
      });

      const drawIsoQuad = (
        gx: number,
        gy: number,
        u0: number,
        v0: number,
        u1: number,
        v1: number,
        fill: string,
        stroke?: string
      ) => {
        const p0 = toScreen(gx + u0, gy + v0);
        const p1 = toScreen(gx + u1, gy + v0);
        const p2 = toScreen(gx + u1, gy + v1);
        const p3 = toScreen(gx + u0, gy + v1);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (stroke) {
          ctx.strokeStyle = stroke;
          ctx.lineWidth = 0.65;
          ctx.stroke();
        }
      };

      const tileScale = 0.64;

      for (let gx = 0; gx < 2; gx++) {
        for (let gy = 0; gy < 2; gy++) {
          const top = toScreen(gx, gy);
          const right = toScreen(gx + 1, gy);
          const bottom = toScreen(gx + 1, gy + 1);
          const left = toScreen(gx, gy + 1);
          const isChecker = (gx + gy) % 2 === 0;
          const seed = ((gx * 37 + gy * 17) % 11) / 11;

          const traceTile = () => {
            ctx.beginPath();
            ctx.moveTo(top.x, top.y);
            ctx.lineTo(right.x, right.y);
            ctx.lineTo(bottom.x, bottom.y);
            ctx.lineTo(left.x, left.y);
            ctx.closePath();
          };

          traceTile();

          if (tileStyle === 'grass') {
            ctx.fillStyle = isChecker ? '#4cd137' : '#44bd32';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
            ctx.lineWidth = 0.85;
            ctx.stroke();

            // Subtle crisp park grass blade tufts
            const tuft = toScreen(gx + (isChecker ? 0.42 : 0.56), gy + (isChecker ? 0.54 : 0.46));
            ctx.strokeStyle = isChecker ? '#2f9e2b' : '#6be854';
            ctx.lineWidth = 1.0;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(tuft.x, tuft.y);
            ctx.lineTo(tuft.x - 1.6, tuft.y - 2.6);
            ctx.moveTo(tuft.x, tuft.y);
            ctx.lineTo(tuft.x + 0.3, tuft.y - 3.2);
            ctx.moveTo(tuft.x, tuft.y);
            ctx.lineTo(tuft.x + 1.8, tuft.y - 2.3);
            ctx.stroke();
          } else if (tileStyle === 'cobble') {
            ctx.fillStyle = isChecker ? '#756f66' : '#6c665d';
            ctx.fill();
            ctx.save();
            ctx.clip();

            const stonePalette = ['#c5bcb0', '#b2aaa0', '#cbc0ae', '#a49f96', '#b9afa2', '#9d978e'];
            const stones = isChecker
              ? [
                  [0.05, 0.05, 0.50, 0.45],
                  [0.55, 0.05, 0.95, 0.43],
                  [0.05, 0.50, 0.38, 0.95],
                  [0.43, 0.48, 0.95, 0.72],
                  [0.43, 0.76, 0.95, 0.95]
                ]
              : [
                  [0.05, 0.05, 0.42, 0.52],
                  [0.47, 0.05, 0.95, 0.38],
                  [0.47, 0.43, 0.95, 0.95],
                  [0.05, 0.57, 0.42, 0.95]
                ];

            stones.forEach(([u0, v0, u1, v1], idx) => {
              const col = stonePalette[(gx * 3 + gy * 5 + idx) % stonePalette.length];
              drawIsoQuad(gx, gy, u0, v0, u1, v1, col, 'rgba(255, 250, 240, 0.24)');
            });

            ctx.restore();
            traceTile();
            ctx.strokeStyle = 'rgba(42, 38, 34, 0.30)';
            ctx.lineWidth = 0.85;
            ctx.stroke();
          } else if (tileStyle === 'sand') {
            ctx.fillStyle = isChecker ? '#e8c785' : '#e0bc75';
            ctx.fill();
            ctx.save();
            ctx.clip();

            ctx.strokeStyle = 'rgba(181, 136, 68, 0.42)';
            ctx.lineWidth = 1.05;
            ctx.lineCap = 'round';
            for (let r = 0; r < 2; r++) {
              const vBase = 0.28 + r * 0.42 + (seed - 0.5) * 0.08;
              const pStart = toScreen(gx + 0.14, gy + vBase);
              const pCtrl = toScreen(gx + 0.52, gy + vBase - 0.12);
              const pEnd = toScreen(gx + 0.86, gy + vBase + 0.04);
              ctx.beginPath();
              ctx.moveTo(pStart.x, pStart.y);
              ctx.quadraticCurveTo(pCtrl.x, pCtrl.y, pEnd.x, pEnd.y);
              ctx.stroke();
            }

            const pebbles = [
              { u: 0.24 + seed * 0.12, v: 0.32, r: 1.9, c: '#c49f66' },
              { u: 0.72 - seed * 0.1, v: 0.28 + seed * 0.15, r: 1.5, c: '#f7e5be' },
              { u: 0.55, v: 0.74 - seed * 0.1, r: 2.0, c: '#b89056' }
            ];
            pebbles.forEach(pb => {
              const pt = toScreen(gx + pb.u, gy + pb.v);
              ctx.fillStyle = pb.c;
              ctx.beginPath();
              ctx.ellipse(pt.x, pt.y, pb.r * tileScale, pb.r * 0.58 * tileScale, 0, 0, Math.PI * 2);
              ctx.fill();
            });

            ctx.restore();
            traceTile();
            ctx.strokeStyle = 'rgba(255, 245, 215, 0.24)';
            ctx.lineWidth = 0.85;
            ctx.stroke();
          } else {
            // Clover Meadow
            ctx.fillStyle = isChecker ? '#2fa857' : '#28994d';
            ctx.fill();
            ctx.save();
            ctx.clip();

            const clovers = [
              { u: 0.26, v: 0.28 },
              { u: 0.68, v: 0.34 },
              { u: 0.38, v: 0.72 },
              { u: 0.74, v: 0.74 }
            ];
            clovers.forEach((cl, idx) => {
              const jitterU = (((gx * 7 + gy * 13 + idx * 5) % 9) - 4) * 0.02;
              const jitterV = (((gx * 11 + gy * 3 + idx * 7) % 9) - 4) * 0.02;
              const pt = toScreen(gx + cl.u + jitterU, gy + cl.v + jitterV);
              const r = 2.5 * tileScale;
              ctx.fillStyle = idx % 2 === 0 ? '#1e7e3c' : '#3bd16a';
              ctx.beginPath();
              ctx.arc(pt.x - r * 0.6, pt.y, r * 0.75, 0, Math.PI * 2);
              ctx.arc(pt.x + r * 0.6, pt.y, r * 0.75, 0, Math.PI * 2);
              ctx.arc(pt.x, pt.y - r * 0.65, r * 0.75, 0, Math.PI * 2);
              ctx.fill();
            });

            const blossoms = [
              { u: 0.22 + seed * 0.16, v: 0.56, c: '#fffef5' },
              { u: 0.64, v: 0.22 + seed * 0.16, c: '#ffeaa7' },
              { u: 0.52 - seed * 0.1, v: 0.80, c: '#fffef5' }
            ];
            blossoms.forEach(bl => {
              const pt = toScreen(gx + bl.u, gy + bl.v);
              ctx.fillStyle = bl.c;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 1.85 * tileScale, 0, Math.PI * 2);
              ctx.fill();
            });

            ctx.restore();
            traceTile();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.13)';
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }
      break;
    }
  }
}

export function getShopArtDataUrl(id: ShopArtId): string {
  const key = `shop:${id}`;
  const cached = SHOP_ART_CACHE.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  const size = 128;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(size / 64, size / 64);
    drawShopArt(ctx, id);
  }
  const url = canvas.toDataURL('image/png');
  SHOP_ART_CACHE.set(key, url);
  return url;
}

const TIER_SKY_PALETTES: Record<BreedTier, [string, string]> = {
  small: ['#234466', '#3d708c'],
  working: ['#243a6b', '#3d5e94'],
  athletic: ['#302763', '#544091'],
  giant: ['#3d2759', '#6e4554']
};

let dogPortraitScratchCanvas: HTMLCanvasElement | null = null;
let dogPortraitScratchCtx: CanvasRenderingContext2D | null = null;

function getDogPortraitScratch(): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
} | null {
  if (!dogPortraitScratchCanvas) {
    dogPortraitScratchCanvas = document.createElement('canvas');
    dogPortraitScratchCanvas.width = 180;
    dogPortraitScratchCanvas.height = 180;
    dogPortraitScratchCtx = dogPortraitScratchCanvas.getContext('2d', {
      willReadFrequently: true
    });
  }
  if (!dogPortraitScratchCtx) return null;
  dogPortraitScratchCtx.clearRect(0, 0, dogPortraitScratchCanvas.width, dogPortraitScratchCanvas.height);
  return { canvas: dogPortraitScratchCanvas, ctx: dogPortraitScratchCtx };
}

/**
 * Renders the exact in-game illustrated dog for any of the 40 breeds,
 * auto-measuring its rendered pixel bounds so every breed (from Chihuahua to Komondor)
 * is cleanly centered and generously framed inside the shop portrait card.
 */
export function getDogPortraitDataUrl(breedKey: string, tier: BreedTier): string {
  const key = `dog:${breedKey}`;
  const cached = SHOP_ART_CACHE.get(key);
  if (cached) return cached;

  // 1. Render raw dog onto a shared offscreen scratch canvas to measure exact tight bounds
  const scratchHandle = getDogPortraitScratch();
  if (!scratchHandle) return '';
  const { canvas: scratch, ctx: sctx } = scratchHandle;

  sctx.save();
  sctx.translate(90, 128);
  sctx.scale(2.2, 2.2);
  drawIllustratedDog(sctx, {
    breed: breedKey,
    isShiny: false,
    shinyColor: '#ffffff',
    isSleeping: false,
    isBlinking: false,
    isJoyful: false,
    showTongue: true,
    legSwing: 0,
    sleepBreath: 0,
    wagPhase: 0.7,
    animPhase: 0.2,
    moodWagAmp: 1,
    tailWag: 1.0,
    earBounce: 0,
    isDrinking: false,
    isLayingDown: false,
    isSitting: false
  });
  sctx.restore();

  const imgData = sctx.getImageData(0, 0, scratch.width, scratch.height).data;
  let minX = scratch.width;
  let minY = scratch.height;
  let maxX = 0;
  let maxY = 0;
  let found = false;
  for (let y = 0; y < scratch.height; y++) {
    for (let x = 0; x < scratch.width; x++) {
      if (imgData[(y * scratch.width + x) * 4 + 3] > 18) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  // 2. Composite onto crisp 128x128 park portrait card with tier sky & grass hill
  const out = document.createElement('canvas');
  out.width = 128;
  out.height = 128;
  const octx = out.getContext('2d');
  if (octx) {
    const [topCol, botCol] = TIER_SKY_PALETTES[tier] || TIER_SKY_PALETTES.small;
    octx.save();
    octx.scale(2, 2);
    drawParkBackdrop(octx, topCol, botCol, true);
    if (tier === 'giant') {
      drawSparkle(octx, 53, 12, 4.2, '#ffeaa7', 0.9);
    } else if (tier === 'athletic') {
      drawSparkle(octx, 53, 12, 3.6, '#dcd6ff', 0.75);
    }
    octx.restore();

    if (found && maxX > minX && maxY > minY) {
      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;
      const maxFitW = 104;
      const maxFitH = 92;
      const fitScale = Math.min(maxFitW / bw, maxFitH / bh, 1.38);
      const drawW = bw * fitScale;
      const drawH = bh * fitScale;
      const dx = (128 - drawW) * 0.5;
      const dy = Math.min(112 - drawH, (118 - drawH) * 0.56);

      // Subtle grounded shadow right beneath paws
      octx.fillStyle = 'rgba(18, 28, 22, 0.34)';
      octx.beginPath();
      octx.ellipse(64, dy + drawH - 3, Math.min(44, drawW * 0.42), 7.5, 0, 0, Math.PI * 2);
      octx.fill();

      octx.drawImage(scratch, minX, minY, bw, bh, dx, dy, drawW, drawH);
    }
  }

  const url = out.toDataURL('image/png');
  SHOP_ART_CACHE.set(key, url);
  return url;
}

export function hydrateStaticShopArt(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-pp-shop-art]').forEach(el => {
    const id = el.dataset.ppShopArt as ShopArtId | undefined;
    if (!id) return;
    const url = getShopArtDataUrl(id);
    if (el.tagName === 'IMG') {
      (el as HTMLImageElement).src = url;
    } else {
      el.innerHTML = `<img class="shop-art-img" src="${url}" alt="" />`;
    }
  });
}
