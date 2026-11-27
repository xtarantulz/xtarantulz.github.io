
document.addEventListener('DOMContentLoaded', function () {
  const canvas = document.getElementById('shootCanvas') || document.createElement('canvas');

  if (!canvas.id) {
    canvas.id = 'shootCanvas';
    document.body.appendChild(canvas);
  }

  const ctx = canvas.getContext('2d');

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let animationId = null;
  let isMobile = window.innerWidth < 768;

  const colors = [
    '#ff7b02', '#ffcc00', '#ff4d6d',
    '#00d4ff', '#7c4dff', '#00e676',
    '#ff66cc', '#ffffff', '#ff3d00'
  ];

  const cometColors = [
    '#ff4d6d', '#ffcc00', '#00d4ff',
    '#7c4dff', '#00e676', '#ff66cc',
    '#ffffff', '#ff7b02'
  ];

  let particles = [];
  let snowflakes = [];
  let stars = [];
  let comets = [];
  let fireworks = [];

  let nextCometTime = 0;
  let nextFireworkTime = 0;

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    isMobile = width < 768;
    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    initParticles();
    initSnow();
    initStars();
  }

  // --- 1. Частицы и линии ---
  class Particle {
    constructor() {
      this.x = random(0, width);
      this.y = random(0, height);
      this.vx = random(-0.08, 0.08);
      this.vy = random(-0.08, 0.08);
      this.radius = random(2.5, 5.5);
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.alpha = random(0.3, 0.8);
      this.phase = random(0, Math.PI * 2);
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.phase += 0.008;
      this.alpha = 0.4 + Math.sin(this.phase) * 0.25;

      if (this.x < 0) this.x = width;
      if (this.x > width) this.x = 0;
      if (this.y < 0) this.y = height;
      if (this.y > height) this.y = 0;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;

      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function initParticles() {
    particles = [];

    const count = Math.min(
        isMobile ? 35 : 150,
        Math.floor(width * height / (isMobile ? 30000 : 22000))
    );

    for (let i = 0; i < count; i++) {
      particles.push(new Particle());
    }
  }

  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 150) {
          ctx.save();
          ctx.globalAlpha = (1 - dist / 150) * 0.55;
          ctx.strokeStyle = p1.color;
          ctx.lineWidth = 2.2;

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.restore();
        }
      }
    }
  }

  // --- 2. Снег и звёзды ---
  function initSnow() {
    snowflakes = [];

    const count = isMobile ? 25 : 45;

    for (let i = 0; i < count; i++) {
      snowflakes.push({
        x: random(0, width),
        y: random(0, height),
        radius: random(1, 2.8),
        speed: random(0.15, 0.4),
        drift: random(-0.2, 0.2),
        alpha: random(0.3, 0.85)
      });
    }
  }

  function drawSnow() {
    snowflakes.forEach(snow => {
      snow.y += snow.speed;
      snow.x += snow.drift;

      if (snow.y > height + 5) {
        snow.y = -5;
        snow.x = random(0, width);
      }

      if (snow.x > width + 5) snow.x = -5;
      if (snow.x < -5) snow.x = width + 5;

      ctx.save();
      ctx.globalAlpha = snow.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(snow.x, snow.y, snow.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  function initStars() {
    stars = [];

    const count = isMobile ? 12 : 24;

    for (let i = 0; i < count; i++) {
      stars.push({
        x: random(0, width),
        y: random(0, height),
        radius: random(1, 2.2),
        alpha: random(0.2, 0.95),
        direction: Math.random() > 0.5 ? 1 : -1,
        isSparkle: Math.random() > 0.65
      });
    }
  }

  function drawSparkleStar(x, y, size, alpha) {
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';

    ctx.beginPath();

    for (let i = 0; i < 4; i++) {
      ctx.rotate(Math.PI / 2);
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size * 0.15, size * 0.15, 0, size * 2.5);
      ctx.quadraticCurveTo(-size * 0.15, size * 0.15, 0, 0);
    }

    ctx.fill();
    ctx.restore();
  }

  function drawStars() {
    stars.forEach(star => {
      star.alpha += star.direction * 0.004;

      if (star.alpha > 0.95 || star.alpha < 0.15) {
        star.direction *= -1;
      }

      if (star.isSparkle) {
        drawSparkleStar(star.x, star.y, star.radius * 2.5, star.alpha);
      } else {
        ctx.save();
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#ffffff';

        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    });
  }

  // --- 3. Кометы ---
  class Comet {
    constructor() {
      this.reset();
    }

    reset() {
      const fromLeft = Math.random() > 0.5;

      this.x = fromLeft ? -50 : width + 50;
      this.y = random(20, height * 0.55);

      const speed = random(1, 4);
      const angle = fromLeft
          ? random(0.2, 0.5)
          : Math.PI - random(0.2, 0.5);

      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.length = random(80, 160);
      this.size = random(2, 3.8);
      this.color = cometColors[Math.floor(Math.random() * cometColors.length)];
      this.alpha = 1;
      this.dead = false;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (
          this.x < -200 ||
          this.x > width + 200 ||
          this.y > height + 200
      ) {
        this.dead = true;
      }
    }

    draw() {
      const speed = Math.hypot(this.vx, this.vy);
      const tailX = this.x - (this.vx / speed) * this.length;
      const tailY = this.y - (this.vy / speed) * this.length;

      ctx.save();

      const grad = ctx.createLinearGradient(
          this.x, this.y, tailX, tailY
      );

      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, this.color);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.strokeStyle = grad;
      ctx.lineWidth = this.size;
      ctx.lineCap = 'round';
      ctx.shadowBlur = 12;
      ctx.shadowColor = this.color;

      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.9, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function updateAndDrawComets(timestamp) {
    if (timestamp > nextCometTime) {
      comets.push(new Comet());
      nextCometTime = timestamp + random(2500, 6000);
    }

    for (let i = comets.length - 1; i >= 0; i--) {
      comets[i].update();
      comets[i].draw();

      if (comets[i].dead) {
        comets.splice(i, 1);
      }
    }
  }

  // --- 4. Фейерверки ---
  class Firework {
    constructor() {
      this.x = random(width * 0.15, width * 0.85);
      this.y = random(height * 0.12, height * 0.45);
      this.color = cometColors[Math.floor(Math.random() * cometColors.length)];
      this.sparks = [];

      const count = isMobile ? 24 : 42;

      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + random(-0.1, 0.1);
        const speed = random(1.2, 3.8);

        this.sparks.push({
          x: this.x,
          y: this.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          decay: random(0.015, 0.03)
        });
      }
    }

    updateAndDraw() {
      let alive = false;

      this.sparks.forEach(s => {
        if (s.alpha <= 0) return;

        alive = true;

        s.x += s.vx;
        s.y += s.vy;
        s.vy += 0.03;
        s.vx *= 0.98;
        s.vy *= 0.98;
        s.alpha -= s.decay;

        ctx.save();
        ctx.globalAlpha = Math.max(0, s.alpha);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;

        ctx.beginPath();
        ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      });

      return alive;
    }
  }

  function updateAndDrawFireworks(timestamp) {
    if (timestamp > nextFireworkTime) {
      fireworks.push(new Firework());
      nextFireworkTime = timestamp + random(4000, 9000);
    }

    for (let i = fireworks.length - 1; i >= 0; i--) {
      if (!fireworks[i].updateAndDraw()) {
        fireworks.splice(i, 1);
      }
    }
  }

  // --- 5. Полумесяц и упряжка Санты ---
  function drawMoon() {
    const moonX = width / 2;
    const moonY = (isMobile ? 85 : 120) + 30;
    const r = isMobile ? 35 : 54;

    ctx.save();
    ctx.shadowColor = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowBlur = 24;

    const gradient = ctx.createLinearGradient(
        moonX - r, moonY - r,
        moonX + r * 0.6, moonY + r
    );

    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.6, '#f4f7fc');
    gradient.addColorStop(1, '#dce3f0');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(moonX, moonY, r, Math.PI * 0.32, Math.PI * 1.68, false);

    ctx.bezierCurveTo(
        moonX - r * 0.35, moonY - r * 0.55,
        moonX - r * 0.35, moonY + r * 0.55,
        moonX + r * Math.cos(Math.PI * 0.32),
        moonY + r * Math.sin(Math.PI * 0.32)
    );

    ctx.closePath();
    ctx.fill();
    ctx.restore();

    return {x: moonX, y: moonY, radius: r};
  }

  function drawReindeerSilhouette(x, y, scaleX, scaleY, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.scale(scaleX, scaleY);
    ctx.fillStyle = '#080b12';
    ctx.strokeStyle = '#080b12';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Тело и шея
    ctx.beginPath();
    ctx.moveTo(-14, 2);
    ctx.quadraticCurveTo(-5, -4, 6, -3);
    ctx.quadraticCurveTo(11, -9, 13, -15);
    ctx.lineTo(18, -14);
    ctx.quadraticCurveTo(16, -7, 13, 0);
    ctx.quadraticCurveTo(5, 6, -12, 5);
    ctx.closePath();
    ctx.fill();

    // Голова
    ctx.beginPath();
    ctx.ellipse(16, -15, 5, 2.8, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Ухо
    ctx.beginPath();
    ctx.moveTo(13, -17);
    ctx.lineTo(10, -21);
    ctx.lineTo(14, -18);
    ctx.fill();

    // Хвост
    ctx.beginPath();
    ctx.moveTo(-14, 1);
    ctx.lineTo(-18, -2);
    ctx.lineTo(-14, 4);
    ctx.fill();

    // Ветвистые рога
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(14, -17);
    ctx.quadraticCurveTo(11, -26, 5, -28);
    ctx.moveTo(11, -22);
    ctx.lineTo(14, -26);
    ctx.moveTo(9, -25);
    ctx.lineTo(7, -23);
    ctx.stroke();

    // Передние ноги
    ctx.lineWidth = 2.1;
    ctx.beginPath();
    ctx.moveTo(10, 1);
    ctx.lineTo(18, 5);
    ctx.lineTo(24, 3);
    ctx.moveTo(8, 2);
    ctx.lineTo(14, 8);
    ctx.lineTo(19, 10);
    ctx.stroke();

    // Задние ноги
    ctx.beginPath();
    ctx.moveTo(-11, 3);
    ctx.lineTo(-19, 9);
    ctx.lineTo(-25, 11);
    ctx.moveTo(-9, 4);
    ctx.lineTo(-15, 11);
    ctx.lineTo(-20, 14);
    ctx.stroke();

    ctx.restore();
  }

  function drawSantaSleigh(timestamp, moon) {
    const scale = isMobile ? 0.55 : 0.92;
    const bob = Math.sin(timestamp * 0.002) * 2.5;

    ctx.save();
    ctx.translate(moon.x - 15 * scale, moon.y + 5 * scale + bob);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#080b12';
    ctx.strokeStyle = '#080b12';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Сани с полозьями
    ctx.save();
    ctx.translate(-88, 28);
    ctx.rotate(-0.24);
    ctx.lineWidth = 2.6;

    ctx.beginPath();
    ctx.moveTo(-36, 12);
    ctx.lineTo(26, 12);
    ctx.bezierCurveTo(37, 12, 39, 1, 31, 1);
    ctx.bezierCurveTo(27, 1, 27, 6, 31, 6);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-22, 12);
    ctx.lineTo(-20, 5);
    ctx.moveTo(12, 12);
    ctx.lineTo(10, 5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-32, -12);
    ctx.quadraticCurveTo(-22, -10, -14, -3);
    ctx.lineTo(8, -3);
    ctx.quadraticCurveTo(18, -11, 27, -9);
    ctx.quadraticCurveTo(24, 5, 14, 6);
    ctx.lineTo(-24, 6);
    ctx.quadraticCurveTo(-33, 4, -32, -12);
    ctx.closePath();
    ctx.fill();

    // Мешок с подарками
    ctx.beginPath();
    ctx.arc(-18, -11, 9, 0, Math.PI * 2);
    ctx.fill();

    // Силуэт Санты
    ctx.beginPath();
    ctx.arc(-3, -11, 7, 0, Math.PI * 2);
    ctx.arc(-1, -20, 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-5, -21);
    ctx.lineTo(3, -21);
    ctx.lineTo(-7, -28);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.arc(-8, -28, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(1, -13);
    ctx.lineTo(11, -15);
    ctx.stroke();

    ctx.restore();

    // 5 оленей по восходящей дуге
    const reindeerList = [
      {x: -24, y: 12, angle: -0.32, phase: 0},
      {x: 18, y: -2, angle: -0.26, phase: 0.8},
      {x: 60, y: -14, angle: -0.20, phase: 1.6},
      {x: 102, y: -22, angle: -0.14, phase: 2.4},
      {x: 144, y: -26, angle: -0.08, phase: 3.2}
    ];

    // Вожжи
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-66, 13);

    reindeerList.forEach(r => {
      const gallopY = Math.sin(timestamp * 0.005 + r.phase) * 1.8;
      ctx.lineTo(r.x - 4, r.y + gallopY - 2);
    });

    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-63, 18);

    reindeerList.forEach(r => {
      const gallopY = Math.sin(timestamp * 0.005 + r.phase) * 1.8;
      ctx.lineTo(r.x - 2, r.y + gallopY + 2);
    });

    ctx.stroke();

    reindeerList.forEach(r => {
      const gallopY = Math.sin(timestamp * 0.005 + r.phase) * 1.8;

      drawReindeerSilhouette(
          r.x,
          r.y + gallopY,
          0.85,
          0.85,
          r.angle
      );
    });

    drawSparkleStar(-35, -35, 3.2, 0.9);
    drawSparkleStar(30, 38, 2.8, 0.85);
    drawSparkleStar(115, -42, 2.5, 0.8);

    ctx.restore();
  }

  // --- Главный цикл анимации ---
  function animate(timestamp) {
    ctx.clearRect(0, 0, width, height);

    drawStars();
    drawSnow();
    drawLines();

    particles.forEach(p => {
      p.update();
      p.draw();
    });

    updateAndDrawComets(timestamp);
    updateAndDrawFireworks(timestamp);

    const moon = drawMoon();
    drawSantaSleigh(timestamp, moon);

    animationId = requestAnimationFrame(animate);
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  animationId = requestAnimationFrame(animate);
});
