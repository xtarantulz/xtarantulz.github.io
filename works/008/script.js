const canvas = document.getElementById('honeycombCanvas');
const ctx = canvas.getContext('2d');

const CELL_SIZE = 34;
const CELL_GAP = 2;

const COLOR = '#ff7b02';

const cells = [];
const waves = [];

let width = 0;
let height = 0;
let dpr = 1;

let columns = 0;
let rows = 0;

let isRunning = true;
let lastTime = 0;
let animationTime = 0;
let automaticTimer = 0;

let pointer = {
  x: -1000,
  y: -1000
};

const toggleButton = document.getElementById('toggleAnimation');
const resetButton = document.getElementById('resetAnimation');

class Cell {
  constructor(col, row, x, y) {
    this.col = col;
    this.row = row;

    this.x = x;
    this.y = y;

    this.intensity = 0;
    this.targetIntensity = 0;
    this.pulse = 0;
  }

  update(delta) {
    this.intensity += (
        this.targetIntensity - this.intensity
    ) * Math.min(delta * 5, 1);

    this.targetIntensity = Math.max(
        0,
        this.targetIntensity - delta * 0.55
    );

    this.pulse = Math.max(0, this.pulse - delta * 1.8);
  }

  activate(power = 1) {
    this.targetIntensity = Math.max(
        this.targetIntensity,
        power
    );

    this.pulse = Math.max(this.pulse, power);
  }

  draw() {
    const radius = CELL_SIZE;

    const intensity = Math.max(
        this.intensity,
        this.pulse * 0.35
    );

    const alpha = 0.12 + intensity * 0.88;

    ctx.beginPath();

    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 3 * i - Math.PI / 6;

      const x = this.x + radius * Math.cos(angle);
      const y = this.y + radius * Math.sin(angle);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.closePath();

    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(255, 123, 2, ${alpha * 0.65})`;

    if (intensity > 0.08) {
      ctx.shadowBlur = 8 + intensity * 20;
      ctx.shadowColor = COLOR;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.stroke();

    if (intensity > 0.12) {
      ctx.fillStyle = `rgba(255, 123, 2, ${intensity * 0.12})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(
          this.x,
          this.y,
          2 + intensity * 3,
          0,
          Math.PI * 2
      );

      ctx.fillStyle = `rgba(255, 170, 70, ${intensity * 0.8})`;
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  }
}

class Wave {
  constructor(col, row, power = 1) {
    this.col = col;
    this.row = row;
    this.power = power;

    this.visited = new Set();
    this.frontier = [{ col, row, distance: 0 }];

    this.speed = 0.075;
    this.timer = 0;
  }

  update(delta) {
    this.timer += delta;

    if (this.timer < this.speed) {
      return;
    }

    this.timer = 0;

    const nextFrontier = [];

    this.frontier.forEach(point => {
      const key = `${point.col},${point.row}`;

      if (this.visited.has(key)) {
        return;
      }

      this.visited.add(key);

      const cell = getCell(point.col, point.row);

      if (cell) {
        cell.activate(
            this.power * Math.max(
            0.25,
            1 - point.distance * 0.035
            )
        );
      }

      getNeighbors(point.col, point.row).forEach(neighbor => {
        const neighborKey = `${neighbor.col},${neighbor.row}`;

        if (!this.visited.has(neighborKey)) {
          nextFrontier.push({
            ...neighbor,
            distance: point.distance + 1
          });
        }
      });
    });

    this.frontier = nextFrontier;
  }

  get finished() {
    return this.frontier.length === 0;
  }
}

function getCell(col, row) {
  if (row < 0 || row >= rows || col < 0 || col >= columns) {
    return null;
  }

  return cells[row * columns + col] || null;
}

function getNeighbors(col, row) {
  const even = row % 2 === 0;

  const offsets = even
      ? [
        [-1, 0],
        [1, 0],
        [-1, -1],
        [0, -1],
        [-1, 1],
        [0, 1]
      ]
      : [
        [-1, 0],
        [1, 0],
        [0, -1],
        [1, -1],
        [0, 1],
        [1, 1]
      ];

  return offsets
      .map(([dx, dy]) => ({
        col: col + dx,
        row: row + dy
      }))
      .filter(point => getCell(point.col, point.row));
}

function createGrid() {
  cells.length = 0;
  waves.length = 0;

  const horizontalStep = CELL_SIZE * 1.5;
  const verticalStep = Math.sqrt(3) * CELL_SIZE;

  columns = Math.ceil(width / horizontalStep) + 2;
  rows = Math.ceil(height / verticalStep) + 2;

  const offsetX = (width - (columns - 1) * horizontalStep) / 2;
  const offsetY = (height - (rows - 1) * verticalStep) / 2;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const x = offsetX + col * horizontalStep;
      const y = offsetY + row * verticalStep +
          (col % 2) * verticalStep / 2;

      cells.push(new Cell(col, row, x, y));
    }
  }
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);

  const rect = canvas.getBoundingClientRect();

  width = rect.width;
  height = rect.height;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  createGrid();
}

function findNearestCell(x, y) {
  let nearest = null;
  let minDistance = Infinity;

  cells.forEach(cell => {
    const dx = cell.x - x;
    const dy = cell.y - y;

    const distance = dx * dx + dy * dy;

    if (distance < minDistance) {
      minDistance = distance;
      nearest = cell;
    }
  });

  return nearest;
}

function launchWave(x, y, power = 1) {
  const cell = findNearestCell(x, y);

  if (!cell) {
    return;
  }

  waves.push(
      new Wave(cell.col, cell.row, power)
  );
}

function handlePointer(event) {
  const rect = canvas.getBoundingClientRect();

  pointer.x = event.clientX - rect.left;
  pointer.y = event.clientY - rect.top;

  const cell = findNearestCell(pointer.x, pointer.y);

  if (cell) {
    cell.activate(0.35);
  }
}

canvas.addEventListener('pointermove', handlePointer);

canvas.addEventListener('pointerdown', event => {
  handlePointer(event);

  launchWave(pointer.x, pointer.y, 1);
});

canvas.addEventListener('pointerleave', () => {
  pointer.x = -1000;
  pointer.y = -1000;
});

function drawBackground() {
  ctx.fillStyle = '#050505';
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

function update(delta) {
  cells.forEach(cell => cell.update(delta));

  waves.forEach(wave => wave.update(delta));

  for (let i = waves.length - 1; i >= 0; i--) {
    if (waves[i].finished) {
      waves.splice(i, 1);
    }
  }

  automaticTimer += delta;

  if (automaticTimer >= 3.5) {
    automaticTimer = 0;

    if (Math.random() > 0.3) {
      const cell = cells[
          Math.floor(Math.random() * cells.length)
          ];

      if (cell) {
        launchWave(cell.x, cell.y, 0.65);
      }
    }
  }
}

function draw() {
  drawBackground();

  cells.forEach(cell => cell.draw());
}

function animate(timestamp) {
  requestAnimationFrame(animate);

  const delta = lastTime
      ? Math.min((timestamp - lastTime) / 1000, 0.05)
      : 0.016;

  lastTime = timestamp;

  if (isRunning) {
    animationTime += delta;

    update(delta);
  }

  draw();
}

toggleButton.addEventListener('click', () => {
  isRunning = !isRunning;

  toggleButton.textContent = isRunning
      ? 'Призупинити'
      : 'Продовжити';
});

resetButton.addEventListener('click', () => {
  waves.length = 0;

  cells.forEach(cell => {
    cell.intensity = 0;
    cell.targetIntensity = 0;
    cell.pulse = 0;
  });

  automaticTimer = 0;
});

window.addEventListener('resize', resize);

resize();
requestAnimationFrame(animate);
