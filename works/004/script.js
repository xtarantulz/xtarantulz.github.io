
class Particles {
  constructor() {
    this.colors = [
      '255, 255, 255',
      '255, 99, 71',
      '19, 19, 19'
    ];

    this.minRadius = 10;
    this.maxRadius = 35;

    this.minOpacity = 0.005;
    this.maxOpacity = 0.5;

    this.minSpeed = 0.05;
    this.maxSpeed = 0.5;

    this.numParticles = 75;
    this.fps = 60;

    this.canvas = document.getElementById('canvas');
    this.ctx = this.canvas.getContext('2d');

    this.width = 0;
    this.height = 0;
    this.particles = [];

    this.lastFrame = 0;
    this.frameInterval = 1000 / this.fps;

    this.resize();
    this.createParticles();

    window.addEventListener('resize', () => {
      this.resize();
    });

    requestAnimationFrame((time) => this.animate(time));
  }

  random(min, max) {
    return Math.random() * (max - min) + min;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.width = window.innerWidth;
    this.height = window.innerHeight;

    this.canvas.width = Math.round(this.width * dpr);
    this.canvas.height = Math.round(this.height * dpr);

    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  createParticles() {
    for (let i = 0; i < this.numParticles; i++) {
      this.particles.push(this.createParticle());
    }
  }

  createParticle() {
    const color = this.colors[
        Math.floor(this.random(0, this.colors.length))
        ];

    return {
      radius: this.random(this.minRadius, this.maxRadius),

      x: this.random(0, this.width),
      y: this.random(0, this.height),

      vx: this.random(this.minSpeed, this.maxSpeed),
      vy: this.random(this.minSpeed, this.maxSpeed),

      color: `rgba(${color}, ${this.random(
          this.minOpacity,
          this.maxOpacity
      )})`
    };
  }

  draw(particle) {
    const ctx = this.ctx;

    const gradient = ctx.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.radius
    );

    gradient.addColorStop(0, particle.color);
    gradient.addColorStop(1, 'rgba(34, 34, 34, 0)');

    ctx.beginPath();
    ctx.arc(
        particle.x,
        particle.y,
        particle.radius,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = gradient;
    ctx.fill();
  }

  update(particle) {
    particle.x += particle.vx;
    particle.y -= particle.vy;

    if (
        particle.x > this.width + particle.radius ||
        particle.y < -particle.radius
    ) {
      this.resetParticle(particle);
    }
  }

  resetParticle(particle) {
    if (Math.random() > 0.5) {
      particle.x = -particle.radius;
      particle.y = this.random(0, this.height);
    } else {
      particle.x = this.random(0, this.width);
      particle.y = this.height + particle.radius;
    }
  }

  animate(time) {
    requestAnimationFrame((nextTime) => this.animate(nextTime));

    if (time - this.lastFrame < this.frameInterval) {
      return;
    }

    this.lastFrame = time;

    this.ctx.clearRect(0, 0, this.width, this.height);

    for (const particle of this.particles) {
      this.update(particle);
      this.draw(particle);
    }
  }
}

new Particles();
