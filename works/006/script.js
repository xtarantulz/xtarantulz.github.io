const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');

const KEYWORD = 'xTaRaNTuLz';

const FONT_SIZE = 16;
const WORD_OFFSET_Y = 180;

const MATRIX_COLOR = '#00ff66';
const WORD_COLOR = '#bfff00';

const FALL_DURATION = 1800;
const WAIT_DURATION = 1300;
const EXPLODE_DURATION = 2600;
const SCATTER_DURATION = 1200;
const GATHER_DURATION = 1800;

let width = 0;
let height = 0;
let dpr = 1;

let columns = 0;
let drops = [];
let speeds = [];

let particles = [];

let phase = 'fall';
let phaseTime = 0;

let animationStarted = false;
let previousTime = 0;

const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*';

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const newColumns = Math.ceil(width / FONT_SIZE);

  if (newColumns !== columns) {
    columns = newColumns;

    drops = Array.from(
        { length: columns },
        () => Math.random() * -100
    );

    speeds = Array.from(
        { length: columns },
        () => 0.4 + Math.random() * 1.2
    );
  }

  if (particles.length) {
    createParticles();
  }
}

class Particle {
  constructor(x, y, color) {
    this.originX = x;
    this.originY = y;

    this.x = x;
    this.y = y;

    this.color = color;

    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 380;

    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    this.size = 3 + Math.random() * 2;
    this.alpha = 0.6 + Math.random() * 0.4;
  }

  update(progress) {
    if (phase === 'fall') {
      this.x = this.originX;
      this.y = this.originY - (1 - progress) * height;
    }

    if (phase === 'explode' || phase === 'scatter') {
      const distance = phase === 'explode'
          ? progress
          : 1;

      this.x = this.originX + this.vx * EXPLODE_DURATION / 1000 * distance;
      this.y = this.originY + this.vy * EXPLODE_DURATION / 1000 * distance;
    }

    if (phase === 'gather') {
      const eased = 1 - Math.pow(1 - progress, 3);

      const scatteredX = this.originX + this.vx * EXPLODE_DURATION / 1000;
      const scatteredY = this.originY + this.vy * EXPLODE_DURATION / 1000;

      this.x = scatteredX + (this.originX - scatteredX) * eased;
      this.y = scatteredY + (this.originY - scatteredY) * eased;
    }
  }

  draw() {
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;

    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;

    ctx.fillRect(
        this.x,
        this.y,
        this.size,
        this.size
    );

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
  }
}

function createParticles() {
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');

  const fontSize = Math.min(
      72,
      Math.max(38, width * 0.075)
  );

  tempCtx.font = `bold ${fontSize}px monospace`;

  const textWidth = tempCtx.measureText(KEYWORD).width;

  tempCanvas.width = Math.ceil(textWidth + 20);
  tempCanvas.height = Math.ceil(fontSize * 1.5);

  tempCtx.font = `bold ${fontSize}px monospace`;
  tempCtx.textBaseline = 'middle';
  tempCtx.fillStyle = '#ffffff';

  tempCtx.fillText(
      KEYWORD,
      10,
      tempCanvas.height / 2
  );

  const imageData = tempCtx.getImageData(
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
  );

  const startX = (width - tempCanvas.width) / 2;
  const startY = (height - tempCanvas.height) / 2 + WORD_OFFSET_Y;

  particles = [];

  for (let y = 0; y < tempCanvas.height; y += 4) {
    for (let x = 0; x < tempCanvas.width; x += 4) {
      const index = (y * tempCanvas.width + x) * 4;

      if (imageData.data[index + 3] > 100) {
        particles.push(
            new Particle(
                startX + x,
                startY + y,
                WORD_COLOR
            )
        );
      }
    }
  }
}

function drawMatrixRain(delta) {
  ctx.font = `${FONT_SIZE}px monospace`;
  ctx.textBaseline = 'top';

  for (let i = 0; i < columns; i++) {
    const x = i * FONT_SIZE;
    const y = drops[i] * FONT_SIZE;

    const char = letters[
        Math.floor(Math.random() * letters.length)
        ];

    const brightness = Math.random();

    ctx.fillStyle = brightness > 0.96
        ? '#ffffff'
        : brightness > 0.7
            ? '#55ff99'
            : MATRIX_COLOR;

    ctx.shadowBlur = brightness > 0.96 ? 10 : 0;
    ctx.shadowColor = MATRIX_COLOR;

    ctx.fillText(char, x, y);

    drops[i] += speeds[i] * delta / 16.67;

    if (y > height && Math.random() > 0.97) {
      drops[i] = Math.random() * -30;
      speeds[i] = 0.4 + Math.random() * 1.2;
    }
  }

  ctx.shadowBlur = 0;
}

function drawParticles() {
  particles.forEach(particle => {
    particle.draw();
  });
}

function changePhase(nextPhase, timestamp) {
  phase = nextPhase;
  phaseTime = timestamp;
}

function updateAnimation(timestamp) {
  const elapsed = timestamp - phaseTime;

  let progress = 0;

  switch (phase) {
    case 'fall':
      progress = Math.min(elapsed / FALL_DURATION, 1);

      particles.forEach(particle => {
        particle.update(progress);
      });

      if (progress >= 1) {
        changePhase('wait', timestamp);
      }

      break;

    case 'wait':
      if (elapsed >= WAIT_DURATION) {
        changePhase('explode', timestamp);
      }

      break;

    case 'explode':
      progress = Math.min(elapsed / EXPLODE_DURATION, 1);

      particles.forEach(particle => {
        particle.update(progress);
      });

      if (progress >= 1) {
        changePhase('scatter', timestamp);
      }

      break;

    case 'scatter':
      if (elapsed >= SCATTER_DURATION) {
        changePhase('gather', timestamp);
      }

      break;

    case 'gather':
      progress = Math.min(elapsed / GATHER_DURATION, 1);

      particles.forEach(particle => {
        particle.update(progress);
      });

      if (progress >= 1) {
        changePhase('wait', timestamp);
      }

      break;
  }
}

function draw(timestamp) {
  if (!animationStarted) {
    animationStarted = true;
    phaseTime = timestamp;
  }

  const delta = previousTime
      ? Math.min(timestamp - previousTime, 50)
      : 16.67;

  previousTime = timestamp;

  // Повне очищення Canvas без шлейфів
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  drawMatrixRain(delta);

  updateAnimation(timestamp);
  drawParticles();

  requestAnimationFrame(draw);
}

function init() {
  resize();
  createParticles();

  phase = 'fall';
  phaseTime = 0;

  requestAnimationFrame(draw);
}

window.addEventListener('resize', resize);

init();