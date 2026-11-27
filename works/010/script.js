import { initGame } from './modules/game.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game');
  const startButton = document.getElementById('start-button');

  if (!canvas || !startButton) {
    console.error('Не вдалося знайти елементи гри.');
    return;
  }

  initGame({
    canvas,
    startButton
  });
});