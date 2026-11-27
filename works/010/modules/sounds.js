import {events} from './events.js';

const sounds = {
    start: new Audio(new URL('../sounds/game-start.mp3', import.meta.url)),
    over: new Audio(new URL('../sounds/game-over.mp3', import.meta.url)),
    move: new Audio(new URL('../sounds/move.mp3', import.meta.url)),
    shoot: new Audio(new URL('../sounds/shoot.mp3', import.meta.url)),
    engine: new Audio(new URL('../sounds/tank-engine.mp3', import.meta.url))
};

sounds.move.loop = true;
sounds.engine.loop = true;

let audioContext = null;

let gameActive = false;
let gamePaused = false;
let tankMoving = false;
let tankOnForest = false;
let startFinished = false;
let headquartersDestroyed = false;

let forestNoise = null;
let forestFilter = null;
let forestGain = null;

function getAudioContext() {
    if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return null;

        audioContext = new AudioContextClass();
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {
        });
    }

    return audioContext;
}

function createNoiseBuffer(audio, duration) {
    const bufferSize = Math.floor(audio.sampleRate * duration);
    const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
    const channel = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
        channel[i] = Math.random() * 2 - 1;
    }

    return buffer;
}

function playRespawn() {
    if (!gameActive || gamePaused) return;

    const audio = getAudioContext();

    if (!audio) return;

    const now = audio.currentTime;

    // Коротка мелодія відновлення
    const notes = [
        {frequency: 523.25, start: 0, duration: 0.16},
        {frequency: 659.25, start: 0.15, duration: 0.16},
        {frequency: 783.99, start: 0.30, duration: 0.20},
        {frequency: 1046.50, start: 0.48, duration: 0.32}
    ];

    notes.forEach(note => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();

        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(note.frequency, now + note.start);

        gain.gain.setValueAtTime(0.0001, now + note.start);
        gain.gain.exponentialRampToValueAtTime(0.16, now + note.start + 0.02);
        gain.gain.setValueAtTime(0.16, now + note.start + note.duration - 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + note.start + note.duration);

        oscillator.connect(gain);
        gain.connect(audio.destination);

        oscillator.start(now + note.start);
        oscillator.stop(now + note.start + note.duration);
    });
}

function playExplosion(size = 'normal') {
    if (!gameActive || gamePaused) return;

    const audio = getAudioContext();

    if (!audio) return;

    const now = audio.currentTime;
    const large = size === 'large';
    const duration = large ? 1.1 : 0.65;

    const oscillator = audio.createOscillator();
    const oscillatorGain = audio.createGain();

    oscillator.type = 'sine';

    oscillator.frequency.setValueAtTime(large ? 100 : 145, now);
    oscillator.frequency.exponentialRampToValueAtTime(30, now + duration);

    oscillatorGain.gain.setValueAtTime(large ? 0.55 : 0.4, now);
    oscillatorGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(oscillatorGain);
    oscillatorGain.connect(audio.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);

    const noise = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const noiseGain = audio.createGain();

    noise.buffer = createNoiseBuffer(audio, duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(large ? 1400 : 2000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + duration);

    noiseGain.gain.setValueAtTime(large ? 0.65 : 0.45, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audio.destination);

    noise.start(now);
    noise.stop(now + duration);
}

function playHeadquartersExplosion() {
    const audio = getAudioContext();

    if (!audio) {
        playSound(sounds.over);
        return;
    }

    const now = audio.currentTime;
    const duration = 2.2;

    const oscillator = audio.createOscillator();
    const oscillatorGain = audio.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(75, now);
    oscillator.frequency.exponentialRampToValueAtTime(18, now + duration);

    oscillatorGain.gain.setValueAtTime(0.8, now);
    oscillatorGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    oscillator.connect(oscillatorGain);
    oscillatorGain.connect(audio.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);

    const noise = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const noiseGain = audio.createGain();

    noise.buffer = createNoiseBuffer(audio, duration);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(900, now);
    filter.frequency.exponentialRampToValueAtTime(45, now + duration);

    noiseGain.gain.setValueAtTime(0.85, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(audio.destination);

    noise.start(now);
    noise.stop(now + duration);

    window.setTimeout(() => {
        if (headquartersDestroyed) {
            playSound(sounds.over);
        }
    }, duration * 1000);
}

function playBrickBreak() {
    if (!gameActive || gamePaused) return;

    const audio = getAudioContext();

    if (!audio) return;

    const now = audio.currentTime;
    const duration = 0.32;

    const noise = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();

    noise.buffer = createNoiseBuffer(audio, duration);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(850, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + duration);
    filter.Q.value = 0.7;

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);

    noise.start(now);
    noise.stop(now + duration);

    const oscillator = audio.createOscillator();
    const oscillatorGain = audio.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(180, now);
    oscillator.frequency.exponentialRampToValueAtTime(65, now + 0.12);

    oscillatorGain.gain.setValueAtTime(0.35, now);
    oscillatorGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    oscillator.connect(oscillatorGain);
    oscillatorGain.connect(audio.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.12);
}

function playSteelHit() {
    if (!gameActive || gamePaused) return;

    const audio = getAudioContext();

    if (!audio) return;

    const now = audio.currentTime;

    const frequencies = Array.of(720, 1080, 1560);

    frequencies.forEach((frequency, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();

        oscillator.type = 'sine';

        oscillator.frequency.setValueAtTime(frequency, now);
        oscillator.frequency.exponentialRampToValueAtTime(
            frequency * 0.82,
            now + 0.65
        );

        gain.gain.setValueAtTime(0.22 / (index + 1), now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

        oscillator.connect(gain);
        gain.connect(audio.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.65);
    });

    const noise = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();

    noise.buffer = createNoiseBuffer(audio, 0.12);

    filter.type = 'highpass';
    filter.frequency.value = 2500;

    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);

    noise.start(now);
    noise.stop(now + 0.12);
}

function playBonusSpawn() {
    if (!gameActive || gamePaused) return;

    const audio = getAudioContext();
    if (!audio) return;

    const now = audio.currentTime;
    const notes = [880, 1174.66];

    notes.forEach((freq, i) => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);

        gain.gain.setValueAtTime(0.14, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.14);

        osc.connect(gain);
        gain.connect(audio.destination);

        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.14);
    });
}

function playBonusCollect(type) {
    if (!gameActive || gamePaused) return;

    const audio = getAudioContext();
    if (!audio) return;

    const now = audio.currentTime;

    const notes = type === 'life'
        ? [
            {f: 659.25, t: 0.00, d: 0.11},
            {f: 783.99, t: 0.11, d: 0.11},
            {f: 1318.51, t: 0.22, d: 0.11},
            {f: 1046.50, t: 0.33, d: 0.11},
            {f: 1174.66, t: 0.44, d: 0.11},
            {f: 1567.98, t: 0.55, d: 0.22}
        ]
        : [
            {f: 587.33, t: 0.00, d: 0.08},
            {f: 783.99, t: 0.08, d: 0.08},
            {f: 987.77, t: 0.16, d: 0.08},
            {f: 1174.66, t: 0.24, d: 0.18}
        ];

    notes.forEach(n => {
        const osc = audio.createOscillator();
        const gain = audio.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(n.f, now + n.t);

        gain.gain.setValueAtTime(0.001, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.16, now + n.t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
    });
}

function startForestSound() {
    if (!gameActive || gamePaused || !tankMoving || !tankOnForest) return;
    if (forestNoise) return;
    const audio = getAudioContext();
    if (!audio) return;
    const noise = audio.createBufferSource();
    const filter = audio.createBiquadFilter();
    const gain = audio.createGain();
    noise.buffer = createNoiseBuffer(audio, 2);
    noise.loop = true;
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.5;
    gain.gain.value = 0.0001;
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audio.destination);
    noise.start();
    gain.gain.setTargetAtTime(0.13, audio.currentTime, 0.12);
    forestNoise = noise;
    forestFilter = filter;
    forestGain = gain;
}

function stopForestSound() {
    if (!forestNoise) return;
    const audio = getAudioContext();
    if (audio && forestGain) {
        forestGain.gain.cancelScheduledValues(audio.currentTime);
        forestGain.gain.setTargetAtTime(0.0001, audio.currentTime, 0.04);
        const noise = forestNoise;
        window.setTimeout(() => {
            try {
                noise.stop();
            } catch {
            }
            noise.disconnect();
        }, 250);
    } else {
        try {
            forestNoise.stop();
        } catch {
        }
    }
    forestNoise = null;
    forestFilter = null;
    forestGain = null;
}

function updateForestSound() {
    if (gameActive && !gamePaused && tankMoving && tankOnForest) {
        startForestSound();
    } else {
        stopForestSound();
    }
}

function stopSound(sound) {
    sound.pause();
    sound.currentTime = 0;
}

function playSound(sound) {
    sound.currentTime = 0;
    sound.play().catch(() => {
    });
}

function stopMovementSounds() {
    stopSound(sounds.move);
    stopSound(sounds.engine);
    stopForestSound();
}

function updateMovementSound() {
    if (!gameActive || gamePaused || !startFinished) return;
    if (tankMoving) {
        stopSound(sounds.engine);
        if (sounds.move.paused) {
            playSound(sounds.move);
        }
    } else {
        stopSound(sounds.move);
        if (sounds.engine.paused) {
            playSound(sounds.engine);
        }
    }
    updateForestSound();
}

function stopAllSounds() {
    Object.values(sounds).forEach(stopSound);
    stopForestSound();
    sounds.start.onended = null;
}

function playGameStart() {
    stopAllSounds();
    headquartersDestroyed = false;
    gameActive = true;
    gamePaused = false;
    tankMoving = false;
    tankOnForest = false;
    startFinished = false;
    playSound(sounds.start);
    sounds.start.onended = () => {
        startFinished = true;
        updateMovementSound();
    };
}

function playGameOver(result) {
    gameActive = false;
    gamePaused = false;
    tankMoving = false;
    tankOnForest = false;
    startFinished = false;
    stopAllSounds();
    if (result === 'headquarters') {
        headquartersDestroyed = true;
        playHeadquartersExplosion();
        return;
    }
    headquartersDestroyed = false;
    playSound(sounds.over);
}

function playShoot() {
    if (!gameActive || gamePaused) return;
    playSound(sounds.shoot);
}

function setTankMoving(moving) {
    if (tankMoving === moving) return;
    tankMoving = moving;
    updateMovementSound();
}

function setTankOnForest(onForest) {
    if (tankOnForest === onForest) return;
    tankOnForest = onForest;
    updateForestSound();
}

function pauseSounds() {
    if (!gameActive || gamePaused) return;
    gamePaused = true;
    if (!startFinished) {
        sounds.start.pause();
    }
    stopMovementSounds();
}

function resumeSounds() {
    if (!gameActive || !gamePaused) return;
    gamePaused = false;
    if (!startFinished) {
        sounds.start.play().catch(() => {
        });
        return;
    }
    updateMovementSound();
}

events.on('game:start', playGameStart);
events.on('game:over', playGameOver);
events.on('game:pause', pauseSounds);
events.on('game:resume', resumeSounds);
events.on('player:move', () => setTankMoving(true));
events.on('player:stop', () => setTankMoving(false));
events.on('player:forest', setTankOnForest);
events.on('player:shoot', playShoot);
events.on('player:respawn', playRespawn);
events.on('bullet:brick-hit', playBrickBreak);
events.on('bullet:steel-hit', playSteelHit);
events.on('explosion:create', ({size}) => playExplosion(size));
events.on('bonus:spawn', playBonusSpawn);
events.on('bonus:collect', playBonusCollect);