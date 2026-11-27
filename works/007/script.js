
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const container = document.getElementById('solarCanvas');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050711);

const camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    500
);

camera.position.set(0, 35, 58);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 22;
controls.maxDistance = 110;
controls.maxPolarAngle = Math.PI * 0.85;
controls.target.set(0, 0, 0);

// Освітлення
scene.add(new THREE.AmbientLight(0x8090bb, 0.55));

const sunLight = new THREE.PointLight(0xffffff, 180, 180);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Зірковий фон
function createStars() {
  const count = 3500;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i++) {
    const radius = 60 + Math.random() * 130;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
  );

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.18,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });

  const stars = new THREE.Points(geometry, material);
  scene.add(stars);

  return stars;
}

const stars = createStars();

// Процедурні текстури планет
function createPlanetTexture(colors, seed = 1) {
  const canvas = document.createElement('canvas');

  canvas.width = 1024;
  canvas.height = 512;

  const ctx = canvas.getContext('2d');

  const gradient = ctx.createLinearGradient(0, 0, 0, 512);

  colors.forEach((color, index) => {
    gradient.addColorStop(
        index / (colors.length - 1),
        color
    );
  });

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);

  // Поверхневі смуги
  let randomSeed = seed;

  function random() {
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    return randomSeed / 233280;
  }

  for (let i = 0; i < 130; i++) {
    const y = random() * 512;
    const h = 1 + random() * 15;

    ctx.fillStyle = `rgba(0, 0, 0, ${random() * 0.14})`;
    ctx.fillRect(0, y, 1024, h);
  }

  // Дрібні плями
  for (let i = 0; i < 1800; i++) {
    const x = random() * 1024;
    const y = random() * 512;
    const radius = 1 + random() * 5;

    ctx.fillStyle = random() > 0.5
        ? 'rgba(255,255,255,0.08)'
        : 'rgba(0,0,0,0.09)';

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  return texture;
}

// Орбіта
function createOrbit(radius) {
  const points = [];

  for (let i = 0; i <= 256; i++) {
    const angle = (i / 256) * Math.PI * 2;

    points.push(
        new THREE.Vector3(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
        )
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  const material = new THREE.LineBasicMaterial({
    color: 0x48516d,
    transparent: true,
    opacity: 0.35
  });

  const orbit = new THREE.LineLoop(geometry, material);
  scene.add(orbit);

  return orbit;
}

// Сонце
const sunGroup = new THREE.Group();
scene.add(sunGroup);

const sunGeometry = new THREE.SphereGeometry(2.6, 64, 64);

const sunMaterial = new THREE.MeshBasicMaterial({
  map: createPlanetTexture(
      ['#ff5100', '#ff9b18', '#ffe45c', '#ff7000'],
      12
  )
});

const sun = new THREE.Mesh(sunGeometry, sunMaterial);
sunGroup.add(sun);

// Світіння Сонця
const sunGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: 0xff8b18,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
);

sunGlow.scale.set(12, 12, 1);
sunGroup.add(sunGlow);

// Додатковий ореол
const sunHalo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: createGlowTexture(),
      color: 0xff4b08,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
);

sunHalo.scale.set(20, 20, 1);
sunGroup.add(sunHalo);

function createGlowTexture() {
  const canvas = document.createElement('canvas');

  canvas.width = 128;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(
      64, 64, 0,
      64, 64, 64
  );

  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(255,200,80,0.7)');
  gradient.addColorStop(0.5, 'rgba(255,100,20,0.2)');
  gradient.addColorStop(1, 'rgba(255,60,0,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  return new THREE.CanvasTexture(canvas);
}

// Супутники
function createMoon(parent, radius, distance, speed, color) {
  const moon = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 24, 24),
      new THREE.MeshStandardMaterial({
        color,
        roughness: 1
      })
  );

  const pivot = new THREE.Group();
  parent.add(pivot);

  moon.position.x = distance;
  pivot.add(moon);

  moon.userData.orbitSpeed = speed;

  return pivot;
}

// Дані планет
const planetData = [
  {
    id: 'mercury',
    name: 'Меркурій',
    description: 'Найменша планета Сонячної системи',
    distance: '57,9 млн км',
    period: '88 днів',
    radius: 0.42,
    orbit: 5,
    speed: 0.48,
    rotation: 0.5,
    colors: ['#5b514b', '#b2a49a', '#766b64']
  },
  {
    id: 'venus',
    name: 'Венера',
    description: 'Найгарячіша планета Сонячної системи',
    distance: '108,2 млн км',
    period: '225 днів',
    radius: 0.68,
    orbit: 7.5,
    speed: 0.35,
    rotation: -0.15,
    colors: ['#a65d24', '#f3c17a', '#bd7735']
  },
  {
    id: 'earth',
    name: 'Земля',
    description: 'Єдина відома планета з життям',
    distance: '149,6 млн км',
    period: '365 днів',
    radius: 0.75,
    orbit: 10.5,
    speed: 0.28,
    rotation: 0.8,
    colors: ['#102d77', '#2089a6', '#3b9b50', '#153d80']
  },
  {
    id: 'mars',
    name: 'Марс',
    description: 'Червона планета з поверхнею пустель',
    distance: '227,9 млн км',
    period: '687 днів',
    radius: 0.56,
    orbit: 13.5,
    speed: 0.22,
    rotation: 0.65,
    colors: ['#78351e', '#e47742', '#a64226']
  },
  {
    id: 'jupiter',
    name: 'Юпітер',
    description: 'Найбільша планета Сонячної системи',
    distance: '778,6 млн км',
    period: '11,9 років',
    radius: 1.65,
    orbit: 18,
    speed: 0.12,
    rotation: 1.2,
    colors: ['#a36d4d', '#e6c7a0', '#9b593b', '#d8b18c']
  },
  {
    id: 'saturn',
    name: 'Сатурн',
    description: 'Газовий гігант із виразними кільцями',
    distance: '1,43 млрд км',
    period: '29,4 років',
    radius: 1.35,
    orbit: 23,
    speed: 0.09,
    rotation: 0.9,
    colors: ['#9c8055', '#e4d0a0', '#b99b69'],
    rings: true
  },
  {
    id: 'uranus',
    name: 'Уран',
    description: 'Крижаний гігант із блакитною атмосферою',
    distance: '2,87 млрд км',
    period: '84 роки',
    radius: 0.98,
    orbit: 28,
    speed: 0.065,
    rotation: 0.7,
    colors: ['#74cbd0', '#b2e8e6', '#55aeb8']
  },
  {
    id: 'neptune',
    name: 'Нептун',
    description: 'Найвіддаленіша планета від Сонця',
    distance: '4,5 млрд км',
    period: '165 років',
    radius: 0.95,
    orbit: 33,
    speed: 0.05,
    rotation: 0.75,
    colors: ['#1248a0', '#397de1', '#163a91']
  }
];

const planets = [];
const interactiveObjects = [];

// Створення планет
planetData.forEach(data => {
  createOrbit(data.orbit);

  const pivot = new THREE.Group();
  scene.add(pivot);

  const group = new THREE.Group();
  group.position.x = data.orbit;
  pivot.add(group);

  const geometry = new THREE.SphereGeometry(
      data.radius,
      48,
      48
  );

  const material = new THREE.MeshStandardMaterial({
    map: createPlanetTexture(data.colors, data.orbit * 13),
    roughness: 0.9,
    metalness: 0
  });

  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  mesh.userData.planetId = data.id;

  interactiveObjects.push(mesh);

  // Атмосфера Землі
  if (data.id === 'earth') {
    const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(data.radius * 1.08, 32, 32),
        new THREE.MeshBasicMaterial({
          color: 0x3c9fff,
          transparent: true,
          opacity: 0.12,
          side: THREE.BackSide
        })
    );

    group.add(atmosphere);
  }

  // Кільця Сатурна
  if (data.rings) {
    const ring = new THREE.Mesh(
        new THREE.RingGeometry(
            data.radius * 1.35,
            data.radius * 2.25,
            96
        ),
        new THREE.MeshBasicMaterial({
          color: 0xcab58e,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.8
        })
    );

    ring.rotation.x = Math.PI / 2.5;
    group.add(ring);
  }

  // Супутники Землі та Юпітера
  if (data.id === 'earth') {
    createMoon(group, 0.15, 1.25, 0.8, 0xb9b9b9);
  }

  if (data.id === 'jupiter') {
    createMoon(group, 0.12, 2.1, 0.6, 0xd9c59b);
    createMoon(group, 0.16, 2.6, -0.4, 0x9b927f);
  }

  // Супутник Сатурна
  if (data.id === 'saturn') {
    createMoon(group, 0.13, 2.6, 0.35, 0xb7a27e);
  }

  planets.push({
    data,
    pivot,
    group,
    mesh,
    speed: data.speed,
    rotation: data.rotation
  });
});

// Інтерфейс
const info = {
  name: document.getElementById('planetName'),
  description: document.getElementById('planetDescription'),
  distance: document.getElementById('planetDistance'),
  period: document.getElementById('planetPeriod')
};

function showPlanet(data) {
  info.name.textContent = data.name;
  info.description.textContent = data.description;
  info.distance.textContent = data.distance;
  info.period.textContent = data.period;

  document.querySelectorAll('.planet-list button').forEach(button => {
    button.classList.toggle(
        'active',
        button.dataset.planet === data.id
    );
  });
}

const sunData = {
  id: 'sun',
  name: 'Сонце',
  description: 'Зоря в центрі нашої Сонячної системи',
  distance: 'Центр системи',
  period: '25-35 днів'
};

function selectPlanet(id) {
  if (id === 'sun') {
    showPlanet(sunData);
    return;
  }

  const planet = planets.find(item => item.data.id === id);

  if (planet) {
    showPlanet(planet.data);
  }
}

document.querySelectorAll('.planet-list button').forEach(button => {
  button.addEventListener('click', () => {
    selectPlanet(button.dataset.planet);
  });
});

// Наведення миші
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let hoveredPlanet = null;

renderer.domElement.addEventListener('pointermove', event => {
  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(
      interactiveObjects
  );

  if (intersects.length) {
    const object = intersects[0].object;
    const id = object.userData.planetId;

    if (hoveredPlanet !== id) {
      hoveredPlanet = id;
      selectPlanet(id);
    }

    renderer.domElement.style.cursor = 'pointer';
  } else {
    hoveredPlanet = null;
    renderer.domElement.style.cursor = 'grab';
  }
});

// Скидання камери
document.getElementById('resetView').addEventListener('click', () => {
  camera.position.set(0, 35, 58);
  controls.target.set(0, 0, 0);
  controls.update();

  selectPlanet('sun');
});

// Анімація
let isPaused = false;

document.getElementById('toggleAnimation').addEventListener('click', event => {
  isPaused = !isPaused;

  event.currentTarget.textContent = isPaused
      ? 'Продовжити'
      : 'Призупинити';
});

const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = Math.min(clock.getDelta(), 0.05);

  if (!isPaused) {
    planets.forEach(planet => {
      planet.pivot.rotation.y += planet.speed * delta;
      planet.mesh.rotation.y += planet.rotation * delta;
    });

    sun.rotation.y += 0.08 * delta;
    sunGlow.material.rotation += 0.02 * delta;

    stars.rotation.y += 0.00004;
  }

  controls.update();

  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  const w = container.clientWidth;
  const h = container.clientHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

selectPlanet('sun');
animate();
