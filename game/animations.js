// animations.js - the canvas problem animationnn, yesss
import { canvasSettings, physics, styles, cloudsData } from './config.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const { logicalWidth, logicalHeight } = canvasSettings;
const dpr = window.devicePixelRatio || 1;
canvas.width = logicalWidth * dpr;
canvas.height = logicalHeight * dpr;
canvas.style.width = logicalWidth + 'px';
canvas.style.height = logicalHeight + 'px';
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
  clouds.push(...cloudsData.map(data => ({ img: cloudImg, ...data })));
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

  ctx.save();
  ctx.globalAlpha = 0.7;
  for (let cloud of clouds) {
    ctx.drawImage(cloud.img, cloud.x, cloud.y, 150, 105);
  }
  ctx.restore();
}

function drawTrail(ctx, positions) {
  if (positions.length <= 1) return;
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
  const y = startY - (currentVy * t - 0.5 * g * t * t);
  const ballBottom = y + radius;
  
  if (ballBottom >= groundY || x > logicalWidth) {
    isAnimating = false;
    drawBackground(ctx, groundY, logicalWidth, logicalHeight, clouds);
    drawTrail(ctx, positions);
    drawProjectile(ctx, x, y, radius, true);
    return;
  }

  positions.push({x, y});
  if (positions.length > 300) positions.shift();

  drawBackground(ctx, groundY, logicalWidth, logicalHeight, clouds);
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
  const vxGiven = problem.givens.find(g => g.target === 'vx');
  const tGiven = givens.find(g => g.target === 't');
  currentVx = (vxGiven ? parseFloat(vxGiven.value) : 25) * 3;
  // Use fixed vy for visual consistency
  currentVy = 20;
  currentStartX = 50;
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
  // Initial animation start
  if (gameReady) startAnimation();
});
