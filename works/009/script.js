
(() => {
  'use strict';

  const canvas = document.getElementById('mazeCanvas');

  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  const toggleButton = document.getElementById('toggleAnimation');
  const resetButton = document.getElementById('resetAnimation');

  const CELL_SIZE = 42;
  const MAX_SPARKS = 60;

  const COLORS = {
    background: '#030303',
    primary: '#ff7b02',
    secondary: '#ffb15c',
    white: '#fff2df'
  };

  let width = 0;
  let height = 0;
  let dpr = 1;

  let cols = 0;
  let rows = 0;
  let grid = [];

  let particles = [];
  let sparks = [];
  let pulses = [];

  let running = true;
  let lastTime = 0;
  let animationTime = 0;
  let animationFrame = 0;

  let pointer = {
    x: -1000,
    y: -1000,
    active: false
  };

  class Cell {
    constructor(x, y) {
      this.x = x;
      this.y = y;

      this.walls = {
        top: true,
        right: true,
        bottom: true,
        left: true
      };

      this.visited = false;
    }
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();

    width = rect.width;
    height = rect.height;

    dpr = Math.min(window.devicePixelRatio || 1, 1.5);

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    generateMaze();
    draw();
  }

  function getIndex(x, y) {
    if (x < 0 || y < 0 || x >= cols || y >= rows) {
      return -1;
    }

    return x + y * cols;
  }

  function getUnvisitedNeighbors(cell) {
    const directions = [
      { x: 0, y: -1, wall: 'top', opposite: 'bottom' },
      { x: 1, y: 0, wall: 'right', opposite: 'left' },
      { x: 0, y: 1, wall: 'bottom', opposite: 'top' },
      { x: -1, y: 0, wall: 'left', opposite: 'right' }
    ];

    const neighbors = [];

    for (const direction of directions) {
      const index = getIndex(
          cell.x + direction.x,
          cell.y + direction.y
      );

      if (index === -1) continue;

      const neighbor = grid[index];

      if (!neighbor.visited) {
        neighbors.push({
          cell: neighbor,
          wall: direction.wall,
          opposite: direction.opposite
        });
      }
    }

    return neighbors;
  }

  function generateMaze() {
    cols = Math.max(5, Math.floor(width / CELL_SIZE));
    rows = Math.max(5, Math.floor(height / CELL_SIZE));

    grid = [];
    particles = [];
    sparks = [];
    pulses = [];

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        grid.push(new Cell(x, y));
      }
    }

    const stack = [];
    const start = grid[0];

    start.visited = true;
    stack.push(start);

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors = getUnvisitedNeighbors(current);

      if (!neighbors.length) {
        stack.pop();
        continue;
      }

      const next = neighbors[
          Math.floor(Math.random() * neighbors.length)
          ];

      current.walls[next.wall] = false;
      next.cell.walls[next.opposite] = false;

      next.cell.visited = true;
      stack.push(next.cell);
    }

    createParticles();

    addPulse(width / 2, height / 2, 1);
  }

  function getCellCenter(cell) {
    const offsetX = (width - cols * CELL_SIZE) / 2;
    const offsetY = (height - rows * CELL_SIZE) / 2;

    return {
      x: offsetX + cell.x * CELL_SIZE + CELL_SIZE / 2,
      y: offsetY + cell.y * CELL_SIZE + CELL_SIZE / 2
    };
  }

  function createParticles() {
    const count = Math.min(
        8,
        Math.max(3, Math.floor(cols * rows / 180))
    );

    for (let i = 0; i < count; i++) {
      const cell = grid[Math.floor(Math.random() * grid.length)];
      const position = getCellCenter(cell);

      particles.push({
        x: position.x,
        y: position.y,
        cell,
        nextCell: null,
        progress: 0,
        speed: 0.3 + Math.random() * 0.3
      });
    }
  }

  function getAvailableDirections(cell) {
    const directions = [];

    if (!cell.walls.top && cell.y > 0) {
      directions.push(grid[getIndex(cell.x, cell.y - 1)]);
    }

    if (!cell.walls.right && cell.x < cols - 1) {
      directions.push(grid[getIndex(cell.x + 1, cell.y)]);
    }

    if (!cell.walls.bottom && cell.y < rows - 1) {
      directions.push(grid[getIndex(cell.x, cell.y + 1)]);
    }

    if (!cell.walls.left && cell.x > 0) {
      directions.push(grid[getIndex(cell.x - 1, cell.y)]);
    }

    return directions;
  }

  function addSpark(x, y, amount = 4) {
    for (let i = 0; i < amount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;

      sparks.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.5,
        size: 1 + Math.random()
      });
    }

    if (sparks.length > MAX_SPARKS) {
      sparks.splice(0, sparks.length - MAX_SPARKS);
    }
  }

  function addPulse(x, y, power = 1) {
    pulses.push({
      x,
      y,
      radius: 0,
      maxRadius: 80 + power * 70,
      life: 1
    });

    addSpark(x, y, 8);
  }

  function updateParticles(delta) {
    for (const particle of particles) {
      if (!particle.nextCell) {
        const directions = getAvailableDirections(particle.cell);

        if (!directions.length) continue;

        particle.nextCell =
            directions[Math.floor(Math.random() * directions.length)];

        particle.progress = 0;
      }

      particle.progress += particle.speed * delta * 0.001;

      const start = getCellCenter(particle.cell);
      const end = getCellCenter(particle.nextCell);

      const progress = Math.min(particle.progress, 1);

      particle.x = start.x + (end.x - start.x) * progress;
      particle.y = start.y + (end.y - start.y) * progress;

      if (particle.progress >= 1) {
        particle.cell = particle.nextCell;
        particle.nextCell = null;

        if (Math.random() > 0.8) {
          addSpark(particle.x, particle.y, 2);
        }
      }
    }
  }

  function updateSparks(delta) {
    const factor = delta * 0.05;

    for (let i = sparks.length - 1; i >= 0; i--) {
      const spark = sparks[i];

      spark.x += spark.vx * factor;
      spark.y += spark.vy * factor;

      spark.vx *= 0.97;
      spark.vy *= 0.97;

      spark.life -= delta * 0.001;

      if (spark.life <= 0) {
        sparks.splice(i, 1);
      }
    }
  }

  function updatePulses(delta) {
    for (let i = pulses.length - 1; i >= 0; i--) {
      const pulse = pulses[i];

      pulse.radius += delta * 0.12;
      pulse.life -= delta * 0.0007;

      if (pulse.life <= 0 || pulse.radius >= pulse.maxRadius) {
        pulses.splice(i, 1);
      }
    }
  }

  function drawBackground() {
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createRadialGradient(
        width / 2,
        height / 2,
        0,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.65
    );

    gradient.addColorStop(0, 'rgba(255, 123, 2, 0.035)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function drawGrid() {
    const offsetX = (width - cols * CELL_SIZE) / 2;
    const offsetY = (height - rows * CELL_SIZE) / 2;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = 'rgba(255, 123, 2, 0.65)';
    ctx.lineWidth = 1.3;
    ctx.shadowBlur = 0;

    ctx.beginPath();

    for (const cell of grid) {
      const x = offsetX + cell.x * CELL_SIZE;
      const y = offsetY + cell.y * CELL_SIZE;

      if (cell.walls.top) {
        ctx.moveTo(x, y);
        ctx.lineTo(x + CELL_SIZE, y);
      }

      if (cell.walls.right) {
        ctx.moveTo(x + CELL_SIZE, y);
        ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
      }

      if (cell.walls.bottom) {
        ctx.moveTo(x, y + CELL_SIZE);
        ctx.lineTo(x + CELL_SIZE, y + CELL_SIZE);
      }

      if (cell.walls.left) {
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + CELL_SIZE);
      }
    }

    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 123, 2, 0.15)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  function drawParticles() {
    for (const particle of particles) {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);

      ctx.fillStyle = COLORS.white;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(particle.x, particle.y, 6, 0, Math.PI * 2);

      ctx.strokeStyle = 'rgba(255, 123, 2, 0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function drawSparks() {
    for (const spark of sparks) {
      ctx.globalAlpha = Math.max(0, spark.life);

      ctx.beginPath();
      ctx.arc(
          spark.x,
          spark.y,
          spark.size * spark.life,
          0,
          Math.PI * 2
      );

      ctx.fillStyle = COLORS.secondary;
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  function drawPulses() {
    for (const pulse of pulses) {
      ctx.beginPath();
      ctx.arc(
          pulse.x,
          pulse.y,
          pulse.radius,
          0,
          Math.PI * 2
      );

      ctx.strokeStyle = `rgba(255, 123, 2, ${pulse.life * 0.5})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawPointer() {
    if (!pointer.active) return;

    ctx.beginPath();
    ctx.arc(pointer.x, pointer.y, 10, 0, Math.PI * 2);

    ctx.strokeStyle = 'rgba(255, 177, 92, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function draw() {
    drawBackground();
    drawGrid();
    drawPulses();
    drawParticles();
    drawSparks();
    drawPointer();
  }

  function animate(timestamp) {
    animationFrame = requestAnimationFrame(animate);

    if (timestamp - lastTime < 16) return;

    const delta = Math.min(timestamp - lastTime, 40);
    lastTime = timestamp;

    if (running) {
      animationTime += delta;

      updateParticles(delta);
      updateSparks(delta);
      updatePulses(delta);
    }

    draw();
  }

  function getCanvasPosition(event) {
    const rect = canvas.getBoundingClientRect();

    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  canvas.addEventListener('pointermove', (event) => {
    const position = getCanvasPosition(event);

    pointer.x = position.x;
    pointer.y = position.y;
    pointer.active = true;
  });

  canvas.addEventListener('pointerleave', () => {
    pointer.active = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const position = getCanvasPosition(event);

    addPulse(position.x, position.y, 1);
    draw();
  });

  if (toggleButton) {
    toggleButton.addEventListener('click', () => {
      running = !running;

      toggleButton.textContent = running
          ? 'Призупинити'
          : 'Продовжити';
    });
  }

  if (resetButton) {
    resetButton.addEventListener('click', () => {
      generateMaze();
      draw();
    });
  }

  window.addEventListener('resize', resize);

  resize();

  animationFrame = requestAnimationFrame(animate);

  window.addEventListener('pagehide', () => {
    cancelAnimationFrame(animationFrame);
  });
})();
