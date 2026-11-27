
const rows = 15;
const cols = 25;

const grid = document.getElementById('grid');
const status = document.getElementById('status');
const restartButton = document.getElementById('restartButton');

let matrix = [];
let cells = [];
let runId = 0;

function generateMatrix() {
  const result = [];

  for (let i = 0; i < rows; i++) {
    result[i] = [];

    for (let j = 0; j < cols; j++) {
      result[i][j] = Math.random() < 0.3 ? 1 : 0;
    }
  }

  result[0][0] = 0;
  result[rows - 1][cols - 1] = 0;

  return result;
}

function renderGrid() {
  grid.innerHTML = '';
  cells = [];

  for (let i = 0; i < rows; i++) {
    const row = document.createElement('tr');
    cells[i] = [];

    for (let j = 0; j < cols; j++) {
      const cell = document.createElement('td');

      if (matrix[i][j] === 1) {
        cell.classList.add('wall');
      }

      if (i === 0 && j === 0) {
        cell.classList.add('start');
      }

      if (i === rows - 1 && j === cols - 1) {
        cell.classList.add('finish');
      }

      cells[i][j] = cell;
      row.appendChild(cell);
    }

    grid.appendChild(row);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function walk(x, y, visited, currentRun) {
  if (
      currentRun !== runId ||
      !matrix[x] ||
      matrix[x][y] !== 0 ||
      visited[x][y]
  ) {
    return false;
  }

  visited[x][y] = true;

  const cell = cells[x][y];
  const isStart = x === 0 && y === 0;
  const isFinish = x === rows - 1 && y === cols - 1;

  if (!isStart && !isFinish) {
    cell.classList.add('robot');
  }

  await sleep(35);

  if (currentRun !== runId) {
    return false;
  }

  if (isFinish) {
    return true;
  }

  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ]) {
    if (await walk(x + dx, y + dy, visited, currentRun)) {
      if (!isStart && !isFinish) {
        cell.classList.remove('robot');
        cell.classList.add('path');
      }

      return true;
    }

    if (currentRun !== runId) {
      return false;
    }
  }

  if (!isStart && !isFinish) {
    cell.classList.remove('robot');
    cell.classList.add('fail');
  }

  return false;
}

async function startSearch() {
  const currentRun = ++runId;

  matrix = generateMatrix();
  renderGrid();

  restartButton.disabled = true;
  status.textContent = 'Робот шукає шлях...';

  const visited = Array.from(
      { length: rows },
      () => Array(cols).fill(false)
  );

  const success = await walk(0, 0, visited, currentRun);

  if (currentRun !== runId) {
    return;
  }

  if (success) {
    status.textContent = 'Шлях знайдено!';
  } else {
    status.textContent = 'Шлях не знайдено. Спробуй ще раз.';
  }

  restartButton.disabled = false;
}

restartButton.addEventListener('click', startSearch);

startSearch();
