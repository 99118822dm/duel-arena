import * as THREE from 'three';
import { initScene, updateSky, collisionObjects, generator, generatorHP, setGeneratorHP } from './scene.js';
import { Player } from './player.js';
import { initInput, resetInputFlags, inputState } from './input.js';
import { updateCamera } from './camera.js';
import { updateExplosions } from './effects.js';
import { showMenu, hideMenu, createHUD, updateCooldownIndicator, showMessage, updateHPBar } from './ui.js';
import { initSound } from './sound.js';
import { startWave, updateDrones, getWaveNumber, clearDrones } from './drones.js';

// --- Рендерер, сцена, камера ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
window.gameScene = scene; // для доступа из drones.js

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);

// --- Инициализация сцены и ввода ---
initScene(scene);
initInput(renderer.domElement);

// --- Переменные игры ---
let localPlayer = null;
let gameOver = false;
let gameStarted = false;

// --- Функция начала игры ---
function startGame() {
  // Сброс состояния
  gameOver = false;
  setGeneratorHP(10);
  clearDrones(scene);

  // Удалим старого игрока если есть
  if (localPlayer) {
    scene.remove(localPlayer.mesh);
    scene.remove(localPlayer.collider);
  }

  // Создаём игрока
  localPlayer = new Player(scene, collisionObjects);
  localPlayer.mesh.position.set(15, 0.5, 15);
  localPlayer.collider.position.copy(localPlayer.mesh.position);
  localPlayer.collider.position.y = 3; // высота коллайдера

  // Запускаем HUD и звук
  createHUD();
  initSound(camera);

  // Первая волна
  startWave();
  showMessage('Защитите генератор!', 2000);
  gameStarted = true;
}

// --- Главное меню ---
showMenu(() => {
  hideMenu();
  startGame();
});

// --- Игровой цикл ---
const clock = new THREE.Clock();

function animate() {
  const delta = Math.min(clock.getDelta(), 0.1);

  if (localPlayer && !gameOver && gameStarted) {
    // Обновление игрока
    localPlayer.update(delta, inputState);
    resetInputFlags();
    updateCamera(camera, localPlayer.mesh);
    updateCooldownIndicator(localPlayer);

    // Вращение генератора в зависимости от здоровья
    if (generator) {
      const maxSpeed = 2 * Math.PI * 2; // 2 оборота в секунду (рад/с)
      const speed = (generatorHP / 10) * maxSpeed;
      generator.rotation.y += speed * delta;
    }

    // Обновление дронов
    updateDrones(delta, scene, new THREE.Vector3(0, 4, 0)); // позиция генератора

    // Проверка поражения
    if (generatorHP <= 0) {
      gameOver = true;
      showMessage(`Поражение! Отбито волн: ${getWaveNumber()}`, 0);
      // Показать меню с возможностью перезапуска
      setTimeout(() => {
        showMenu(() => {
          startGame();
        });
      }, 2000);
    }

    // Обновление HP-бара
    updateHPBar(generatorHP, 10);
  }

  // Общие обновления
  updateExplosions(scene, delta);
  updateSky(camera);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

// --- Ресайз ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('Игра "Защита базы" запущена');