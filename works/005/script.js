const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const img = document.getElementById('logo');

const PARTICLE_SIZE = 2;
const STEP = 1;
const LOGO_OFFSET_Y = 180;

let particles = [];
let canvasWidth = 0;
let canvasHeight = 0;
let scale = 1;

let animationPhase = 'pauseStart';
let animationTime = 0;

const PAUSE_START_DURATION = 1000;
const EXPLODE_DURATION = 3000;
const WAIT_DURATION = 500;
const GATHER_DURATION = 1500;

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  canvasWidth = window.innerWidth;
  canvasHeight = window.innerHeight;

  canvas.width = Math.round(canvasWidth * dpr);
  canvas.height = Math.round(canvasHeight * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  if (img.naturalWidth) {
    calculateScale();
  }
}

function calculateScale() {
  const maxWidth = canvasWidth * 0.7;
  const maxHeight = canvasHeight * 0.55;

  scale = Math.min(
      maxWidth / img.naturalWidth,
      maxHeight / img.naturalHeight,
      1
  );
}

function getImagePosition() {
  return {
    x: (canvasWidth - img.naturalWidth * scale) / 2,
    y: (canvasHeight - img.naturalHeight * scale) / 2 + LOGO_OFFSET_Y
  };
}

class Particle {
  constructor(x, y, color) {
    this.originX = x;
    this.originY = y;

    this.x = x;
    this.y = y;

    this.color = color;

    const angle = Math.random() * Math.PI * 2;
    const speed = 150 + Math.random() * 1000;

    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  update(progress) {
    if (animationPhase === 'explode') {
      this.x = this.originX + this.vx * progress;
      this.y = this.originY + this.vy * progress;
    }

    if (animationPhase === 'gather') {
      this.x = this.originX + this.vx * (1 - progress);
      this.y = this.originY + this.vy * (1 - progress);
    }
  }

  draw() {
    const position = getImagePosition();

    ctx.fillStyle = this.color;

    ctx.fillRect(
        position.x + this.x * scale,
        position.y + this.y * scale,
        PARTICLE_SIZE * scale,
        PARTICLE_SIZE * scale
    );
  }
}

function createParticles() {
  const tmpCanvas = document.createElement('canvas');

  tmpCanvas.width = img.naturalWidth;
  tmpCanvas.height = img.naturalHeight;

  const tmpCtx = tmpCanvas.getContext('2d');

  tmpCtx.drawImage(img, 0, 0);

  const imageData = tmpCtx.getImageData(
      0,
      0,
      img.naturalWidth,
      img.naturalHeight
  );

  particles = [];

  for (let y = 0; y < img.naturalHeight; y += STEP) {
    for (let x = 0; x < img.naturalWidth; x += STEP) {
      const i = (y * img.naturalWidth + x) * 4;

      const r = imageData.data[i];
      const g = imageData.data[i + 1];
      const b = imageData.data[i + 2];
      const a = imageData.data[i + 3];

      if (a > 50) {
        const color = `rgba(${r}, ${g}, ${b}, ${a / 255})`;

        particles.push(
            new Particle(x, y, color)
        );
      }
    }
  }

  calculateScale();
}

function animate(timestamp) {
  if (!animationTime) {
    animationTime = timestamp;
  }

  const elapsed = timestamp - animationTime;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  let progress = 0;

  switch (animationPhase) {
    case 'pauseStart':

      if (elapsed >= PAUSE_START_DURATION) {
        animationPhase = 'explode';
        animationTime = timestamp;
      }

      break;

    case 'explode':

      progress = Math.min(elapsed / EXPLODE_DURATION, 1);

      particles.forEach(p => p.update(progress));

      if (progress >= 1) {
        animationPhase = 'wait';
        animationTime = timestamp;
      }

      break;

    case 'wait':

      particles.forEach(p => p.update(1));

      if (elapsed >= WAIT_DURATION) {
        animationPhase = 'gather';
        animationTime = timestamp;
      }

      break;

    case 'gather':

      progress = Math.min(elapsed / GATHER_DURATION, 1);

      particles.forEach(p => p.update(progress));

      if (progress >= 1) {
        animationPhase = 'pauseStart';
        animationTime = timestamp;
      }

      break;
  }

  particles.forEach(p => p.draw());

  requestAnimationFrame(animate);
}

function init() {
  resizeCanvas();
  createParticles();
  requestAnimationFrame(animate);
}

img.addEventListener('load', init);

window.addEventListener('resize', resizeCanvas);

if (img.complete && img.naturalWidth) {
  init();
}