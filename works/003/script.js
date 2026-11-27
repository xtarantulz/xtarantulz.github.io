
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let cw = 0;
let ch = 0;

let fireworks = [];
let particles = [];

let hue = 120;
let timerTotal = 80;
let timerTick = 0;
let limiterTotal = 5;
let limiterTick = 0;

let pointerDown = false;
let mx = 0;
let my = 0;

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  cw = window.innerWidth;
  ch = window.innerHeight;

  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);

  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener('resize', resizeCanvas);

resizeCanvas();

function random(min, max) {
  return Math.random() * (max - min) + min;
}

function calculateDistance(x1, y1, x2, y2) {
  const dx = x1 - x2;
  const dy = y1 - y2;

  return Math.sqrt(dx * dx + dy * dy);
}

function Firework(sx, sy, tx, ty) {
  this.x = sx;
  this.y = sy;

  this.sx = sx;
  this.sy = sy;

  this.tx = tx;
  this.ty = ty;

  this.distanceToTarget = calculateDistance(
      sx, sy, tx, ty
  );

  this.distanceTraveled = 0;

  this.coordinates = [];
  this.coordinateCount = 3;

  while (this.coordinateCount--) {
    this.coordinates.push([this.x, this.y]);
  }

  this.angle = Math.atan2(ty - sy, tx - sx);
  this.speed = 2;
  this.acceleration = 1.05;
  this.brightness = random(50, 70);
  this.targetRadius = 1;
}

Firework.prototype.update = function(index) {
  this.coordinates.pop();
  this.coordinates.unshift([this.x, this.y]);

  if (this.targetRadius < 8) {
    this.targetRadius += 0.3;
  } else {
    this.targetRadius = 1;
  }

  this.speed *= this.acceleration;

  const vx = Math.cos(this.angle) * this.speed;
  const vy = Math.sin(this.angle) * this.speed;

  this.distanceTraveled = calculateDistance(
      this.sx,
      this.sy,
      this.x + vx,
      this.y + vy
  );

  if (this.distanceTraveled >= this.distanceToTarget) {
    createParticles(this.tx, this.ty);
    fireworks.splice(index, 1);
  } else {
    this.x += vx;
    this.y += vy;
  }
};

Firework.prototype.draw = function() {
  ctx.beginPath();

  ctx.moveTo(
      this.coordinates[this.coordinates.length - 1][0],
      this.coordinates[this.coordinates.length - 1][1]
  );

  ctx.lineTo(this.x, this.y);

  ctx.strokeStyle = `hsl(${hue}, 100%, ${this.brightness}%)`;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(
      this.tx,
      this.ty,
      this.targetRadius,
      0,
      Math.PI * 2
  );

  ctx.stroke();
};

function Particle(x, y) {
  this.x = x;
  this.y = y;

  this.coordinates = [];
  this.coordinateCount = 5;

  while (this.coordinateCount--) {
    this.coordinates.push([this.x, this.y]);
  }

  this.angle = random(0, Math.PI * 2);
  this.speed = random(1, 10);
  this.friction = 0.95;
  this.gravity = 1;

  this.hue = random(hue - 20, hue + 20);
  this.brightness = random(50, 80);

  this.alpha = 1;
  this.decay = random(0.015, 0.03);
}

Particle.prototype.update = function(index) {
  this.coordinates.pop();
  this.coordinates.unshift([this.x, this.y]);

  this.speed *= this.friction;

  this.x += Math.cos(this.angle) * this.speed;
  this.y += Math.sin(this.angle) * this.speed + this.gravity;

  this.alpha -= this.decay;

  if (this.alpha <= this.decay) {
    particles.splice(index, 1);
  }
};

Particle.prototype.draw = function() {
  ctx.beginPath();

  ctx.moveTo(
      this.coordinates[this.coordinates.length - 1][0],
      this.coordinates[this.coordinates.length - 1][1]
  );

  ctx.lineTo(this.x, this.y);

  ctx.strokeStyle = `hsla(
        ${this.hue},
        100%,
        ${this.brightness}%,
        ${this.alpha}
    )`;

  ctx.stroke();
};

function createParticles(x, y) {
  let particleCount = 30;

  while (particleCount--) {
    particles.push(new Particle(x, y));
  }
}

function launchFirework(x, y) {
  fireworks.push(
      new Firework(cw / 2, ch, x, y)
  );
}

function loop() {
  requestAnimationFrame(loop);

  hue += 0.5;

  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, cw, ch);

  ctx.globalCompositeOperation = 'lighter';

  let i = fireworks.length;

  while (i--) {
    fireworks[i].draw();
    fireworks[i].update(i);
  }

  i = particles.length;

  while (i--) {
    particles[i].draw();
    particles[i].update(i);
  }

  if (timerTick >= timerTotal) {
    if (!pointerDown) {
      launchFirework(
          random(0, cw),
          random(0, ch / 2)
      );

      timerTick = 0;
    }
  } else {
    timerTick++;
  }

  if (limiterTick >= limiterTotal) {
    if (pointerDown) {
      launchFirework(mx, my);
      limiterTick = 0;
    }
  } else {
    limiterTick++;
  }
}

canvas.addEventListener('pointermove', function(e) {
  const rect = canvas.getBoundingClientRect();

  mx = e.clientX - rect.left;
  my = e.clientY - rect.top;
});

canvas.addEventListener('pointerdown', function(e) {
  if (e.button !== undefined && e.button !== 0) {
    return;
  }

  pointerDown = true;

  const rect = canvas.getBoundingClientRect();

  mx = e.clientX - rect.left;
  my = e.clientY - rect.top;

  launchFirework(mx, my);
});

window.addEventListener('pointerup', function() {
  pointerDown = false;
});

window.addEventListener('pointercancel', function() {
  pointerDown = false;
});

loop();
