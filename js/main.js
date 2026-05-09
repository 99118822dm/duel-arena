import * as THREE from 'three';
import { initScene, updateSky, collisionObjects } from './scene.js';
import { Player } from './player.js';
import { initInput, resetInputFlags, inputState } from './input.js';
import { updateCamera } from './camera.js';
import { updateExplosions, spawnExplosion } from './effects.js';
import { showMenu, hideMenu, createHUD, updateCooldownIndicator, showMessage, showStatus, showRoomLink } from './ui.js';
import { initSound } from './sound.js';
import { NetworkManager } from './network.js';

// --- Рендерер, сцена, камера ---
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
initScene(scene);
initInput(renderer.domElement);

// --- Сеть ---
const net = new NetworkManager();
const urlParams = new URLSearchParams(window.location.search);
const roomParam = urlParams.get('room');

let localPlayer = null;
let remotePlayer = null;
let gameStarted = false;

function getRespawnPoint() {
  const minDistContainer = 10;
  const minDistPlayer = 15;
  const otherPos = remotePlayer && remotePlayer.alive
    ? remotePlayer.mesh.position.clone()
    : new THREE.Vector3(Infinity, 0, Infinity);
  const boxes = collisionObjects.filter(obj => obj.userData.isPlayer !== true || obj === localPlayer?.collider);
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = (Math.random() * 2 - 1) * 48;
    const z = (Math.random() * 2 - 1) * 48;
    const point = new THREE.Vector3(x, 0.5, z);
    let ok = true;
    for (const obj of boxes) {
      const box = new THREE.Box3().setFromObject(obj);
      if (point.distanceTo(box.getCenter(new THREE.Vector3())) < minDistContainer) {
        ok = false;
        break;
      }
    }
    if (!ok) continue;
    if (point.distanceTo(otherPos) < minDistPlayer) continue;
    return { x, z };
  }
  return { x: 15, z: 15 };
}

// --- Обработчики сети ---
net.onOpen = (peerId) => {
  if (net.isHost) {
    const link = `${window.location.origin}${window.location.pathname}?room=${peerId}`;
    showRoomLink(link);
  }
};

net.onConnect = () => {
  console.log('Соединение установлено! Начинаем игру.');
  const startXLocal = net.isHost ? -15 : 15;
  const startZLocal = net.isHost ? -15 : 15;
  const startXRemote = net.isHost ? 15 : -15;
  const startZRemote = net.isHost ? 15 : -15;

  localPlayer = new Player(scene, collisionObjects, true, (hitPoint) => {
    net.send({ type: 'hit', position: [hitPoint.x, hitPoint.y, hitPoint.z] });
    if (remotePlayer && remotePlayer.alive) {
      remotePlayer.die();
      spawnExplosion(scene, hitPoint);
    }
  });
  localPlayer.mesh.position.set(startXLocal, 0.5, startZLocal);
  localPlayer.collider.position.copy(localPlayer.mesh.position);

  remotePlayer = new Player(scene, collisionObjects, false);
  remotePlayer.mesh.position.set(startXRemote, 0.5, startZRemote);
  remotePlayer.collider.position.copy(remotePlayer.mesh.position);
  collisionObjects.push(remotePlayer.collider);

  hideMenu();
  if (!gameStarted) {
    gameStarted = true;
    createHUD();
    initSound(camera);
    showMessage('Бой начался!', 1500);
  } else {
    showMessage('Противник подключился!', 1500);
  }
};

net.onData = (data) => {
  if (!remotePlayer) return;
  switch (data.type) {
    case 'player_state':
      remotePlayer.setTarget(data.position[0], data.position[1], data.yaw);
      break;
    case 'hit':
      if (localPlayer && localPlayer.alive) {
        const pos = new THREE.Vector3(data.position[0], data.position[1], data.position[2]);
        spawnExplosion(scene, pos);
        localPlayer.die();
        showMessage('Вы убиты!', 1500);
        setTimeout(() => {
          if (!localPlayer) return;
          const pt = getRespawnPoint();
          localPlayer.respawn(pt.x, pt.z);
          net.send({ type: 'respawn', position: [pt.x, pt.z] });
          showMessage('Возрождение!', 1500);
        }, 3000);
      }
      break;
    case 'respawn':
      if (remotePlayer) {
        remotePlayer.respawn(data.position[0], data.position[1]);
        showMessage('Противник возродился', 1500);
      }
      break;
  }
};

net.onClose = () => {
  alert('Соединение потеряно. Обнови страницу.');
};

// --- Запуск ---
if (roomParam) {
  net.joinRoom(roomParam);
  showMenu(() => {});
  showStatus('Подключение к игре...');
} else {
  showMenu(() => {
    net.createRoom();
    showStatus('Ожидание игрока...');
  });
}

// --- Игровой цикл ---
const clock = new THREE.Clock();
const networkTickRate = 1 / 15;
let networkTimer = 0;

function animate() {
  const delta = Math.min(clock.getDelta(), 0.1);

  if (localPlayer) {
    localPlayer.update(delta, inputState);
    resetInputFlags();
    updateCamera(camera, localPlayer.mesh);
    updateCooldownIndicator(localPlayer);

    networkTimer += delta;
    if (networkTimer >= networkTickRate) {
      networkTimer -= networkTickRate;
      if (net.connection && net.connection.open) {
        net.send({
          type: 'player_state',
          position: [localPlayer.mesh.position.x, localPlayer.mesh.position.z],
          yaw: localPlayer.yaw,
        });
      }
    }
  }

  if (remotePlayer) {
    remotePlayer.update(delta, {});
  }

  updateExplosions(scene, delta);
  updateSky(camera);

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

console.log('Мультиплеер запущен');