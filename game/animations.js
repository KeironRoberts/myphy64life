// animations.js - the canvas problem animationnn, yesss
import { canvasSettings, physics, styles, cloudsData } from './config.js';

/** @type {HTMLCanvasElement} */
const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('gameCanvas'));
const ctx = canvas.getContext('2d');

const { logicalWidth, logicalHeight } = canvasSettings;
const dpr = window.devicePixelRatio || 1;
canvas.width = logicalWidth * dpr;
canvas.height = logicalHeight * dpr;
// Make canvas focusable and responsive at display size (internal buffer stays fixed for crispness)
canvas.tabIndex = 0;
canvas.style.maxWidth = '100%';
function resizeCanvasDisplay() {
  const container = document.getElementById('problem-container') || document.body;
  const padding = 40; // keep some breathing room
  const maxWidth = Math.max(320, Math.min(logicalWidth, container.clientWidth - padding));
  canvas.style.width = maxWidth + 'px';
  const displayedWidth = canvas.clientWidth || maxWidth;
  const desiredHeight = Math.round((displayedWidth * logicalHeight) / logicalWidth);
  canvas.style.height = desiredHeight + 'px';
}
resizeCanvasDisplay();
window.addEventListener('resize', resizeCanvasDisplay);
ctx.scale(dpr, dpr);

let t = 0;
const positions = [];
let isAnimating = false;
let lastTime = 0;
let spacePressed = false;
let gameReady = false;
const clouds = [];

// animation variables synced with current problem
let currentVx = physics.vx;
let currentVy = physics.vy;
let currentStartX = physics.startX;
let currentStartY = logicalHeight - 90; // Can be overridden for specific problems
let currentGroundY = currentStartY + 20; // Can be overridden for specific problems
let isFreeFallProblem = false; // Track if this is a free-fall problem
const radius = physics.radius;
const Tscale = physics.Tscale;
const g = physics.g;
const startY = logicalHeight - 90;
const groundY = startY + 20;

// Cloud loading
const cloudImg = new Image();
cloudImg.src = 'images/cloud2.png';
cloudImg.onload = () => {
  clouds.length = 0;
  clouds.push(...cloudsData.map((data) => ({ img: cloudImg, ...data })));
  gameReady = true;
  startAnimation();
};
cloudImg.onerror = () => {
  gameReady = true;
  startAnimation(); // Run without clouds
};

// Canvas styling
ctx.lineWidth = 2;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

function drawBackground(ctx, groundY, logicalWidth, logicalHeight, clouds) {
  ctx.clearRect(0, 0, logicalWidth, logicalHeight);
  ctx.fillStyle = styles.background;
  ctx.fillRect(0, 0, logicalWidth, logicalHeight);
  ctx.fillStyle = styles.groundTop;
  ctx.fillRect(0, groundY, logicalWidth, logicalHeight - groundY);
  ctx.fillStyle = styles.groundGrass;
  ctx.fillRect(0, groundY, logicalWidth, logicalHeight - groundY - 60);

  // Clouds
  ctx.save();
  ctx.globalAlpha = 0.7;
  for (let cloud of clouds) {
    ctx.drawImage(cloud.img, cloud.x, cloud.y, 150, 105);
  }
  ctx.restore();

  // Press SPACE text when animation stopped (desktop and phone only, not tablets)
  if (!isAnimating && gameReady && !(window.innerWidth >= 768 && window.innerWidth <= 1200)) {
    ctx.save();
    ctx.font = 'bold 32px Courier New, monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = 'Press SPACE to replay animation';
    const textX = logicalWidth / 2;
    const textY = 100;

    ctx.strokeText(text, textX, textY);
    ctx.fillText(text, textX, textY);
    ctx.restore();
  }
}

function drawTrail(ctx, positions) {
  if (positions.length <= 1) return;
  const trailLength = Math.min(50, positions.length); // Limit trail
  ctx.shadowBlur = 10;
  ctx.shadowColor = styles.trailShadow;
  ctx.strokeStyle = styles.trailStroke;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(positions[0].x, positions[0].y);
  for (let i = 1; i < positions.length; i++) {
    ctx.lineTo(positions[i].x, positions[i].y);
  }
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function drawProjectile(ctx, x, y, radius, isGrounded = false) {
  ctx.beginPath();
  ctx.arc(x, isGrounded ? groundY - radius : y, radius, 0, Math.PI * 2);
  ctx.fillStyle = styles.ballFill;
  ctx.shadowBlur = 15;
  ctx.shadowColor = styles.ballShadow;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 1;
  ctx.strokeStyle = styles.ballStroke;
  ctx.stroke();
}

function update(currentTime) {
  if (!isAnimating) return;

  const deltaTime = Math.min((currentTime - lastTime) / 1000, Tscale);
  lastTime = currentTime;
  t += deltaTime * 10;

  // Use current problem physics values
  const x = currentStartX + currentVx * t;
  const y = currentStartY - (currentVy * t - 0.5 * g * t * t);
  const ballBottom = y + radius;

  if (ballBottom >= currentGroundY || x > logicalWidth) {
    isAnimating = false;
    drawBackground(ctx, currentGroundY, logicalWidth, logicalHeight, clouds);
    drawTrail(ctx, positions);
    drawProjectile(ctx, x, y, radius, true);
    return;
  }

  positions.push({ x, y });
  if (positions.length > 300) positions.shift();

  drawBackground(ctx, currentGroundY, logicalWidth, logicalHeight, clouds);
  drawTrail(ctx, positions);
  drawProjectile(ctx, x, y, radius);

  requestAnimationFrame(update);
}

function startAnimation() {
  t = 0;
  positions.length = 0;
  isAnimating = true;
  lastTime = performance.now();
  requestAnimationFrame(update);
}

// PROBLEM SOLVER INTEGRATION - Sync animation with current problem
window.addEventListener('problemChanged', (e) => {
  const problem = e.detail;
  const problemText = problem.text.toLowerCase();
  
  // Check if this is a free-fall problem (stone from cliff or eagle drops fish)
  isFreeFallProblem = (problemText.includes('stone') && problemText.includes('cliff')) ||
                      (problemText.includes('eagle') && problemText.includes('drops'));
  
  const vxGiven = problem.givens.find((g) => g.target === 'vx');
  currentVx = (vxGiven ? parseFloat(vxGiven.value) : 25) * 3;
  
  if (isFreeFallProblem) {
    // For free-fall problems: zero initial vertical velocity (pure drop)
    currentVy = 0;
    // Start from higher position to simulate cliff/height (70% up the canvas)
    currentStartY = logicalHeight * 0.3;
    // Ground is at bottom
    currentGroundY = logicalHeight - 20;
  } else {
    // Normal projectile motion
    currentVy = 40 * 3; // Fixed visual consistency
    currentStartY = logicalHeight - 90;
    currentGroundY = logicalHeight - 70;
  }
  
  currentStartX = 50;
  // Resize display to match any layout changes then start animation
  resizeCanvasDisplay();
  setTimeout(startAnimation, 100);
});

// Manual restart controls
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    spacePressed = true;
  }
});
document.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && spacePressed && !isAnimating && gameReady) {
    spacePressed = false;
    startAnimation();
  }
});

// iPad/Tablet replay button event listener
window.addEventListener('replayAnimation', () => {
  if (!isAnimating && gameReady) {
    startAnimation();
  }
});

// Typewriter effect (unused but kept for styling)
function domTypeWriter(element, text, speed = 10, i = 0) {
  if (i === 0) element.innerHTML = '';

  if (i < text.length) {
    element.innerHTML = text.slice(0, i + 1) + '<span class="blink">|</span>';
    setTimeout(() => domTypeWriter(element, text, speed, i + 1), speed);
  } else {
    element.innerHTML = text + '<span class="blink">|</span>';
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Ensure canvas matches layout and start animation if ready
  resizeCanvasDisplay();
  if (gameReady) startAnimation();
});
