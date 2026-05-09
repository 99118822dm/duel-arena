import * as THREE from 'three';
import { collisionObjects, generatorHP, setGeneratorHP } from './scene.js';

const drones = [];
let waveNumber = 0;
let dronesSpawnedThisWave = 0;
let dronesToSpawnThisWave = 0;
let maxDronesOnScreen = 5;
let waveActive = false;
let restTimer = 0;
const REST_DURATION = 10;

export function getWaveNumber() {
  return waveNumber;
}

export function startWave() {
  waveNumber++;
  dronesSpawnedThisWave = 0;
  dronesToSpawnThisWave = 10 + (waveNumber - 1) * 2;
  maxDronesOnScreen = 5 + (waveNumber - 1) * 1;
  waveActive = true;
}

export function updateDrones(delta, scene, generatorPosition) {
  // Если волна не активна, но отдых кончился, начинаем новую
  if (!waveActive && restTimer <= 0) {
    startWave();
  }

  // Таймер отдыха между волнами
  if (!waveActive && restTimer > 0) {
    restTimer -= delta;
    return;
  }

  // Спавн дронов, если нужно
  if (waveActive && drones.length < maxDronesOnScreen && dronesSpawnedThisWave < dronesToSpawnThisWave) {
    spawnDrone(scene);
  }

  // Обновление существующих дронов
  for (let i = drones.length - 1; i >= 0; i--) {
    const drone = drones[i];

    // Движение к генератору
    const dir = new THREE.Vector3().subVectors(generatorPosition, drone.mesh.position).normalize();
    drone.mesh.position.add(dir.multiplyScalar(drone.speed * delta));
    drone.collider.position.copy(drone.mesh.position);

    // Проверка достижения генератора
    if (drone.mesh.position.distanceTo(generatorPosition) < 1.5) {
      setGeneratorHP(generatorHP - 1);
      destroyDrone(drone, scene);
      if (generatorHP <= 0) {
        // Обработка поражения в main.js
      }
    }
  }

  // Проверка окончания волны
  if (waveActive && dronesSpawnedThisWave >= dronesToSpawnThisWave && drones.length === 0) {
    waveActive = false;
    restTimer = REST_DURATION;
  }
}

function spawnDrone(scene) {
  const speed = 4 * (1 + 0.2 * (waveNumber - 1)); // базовая 4 м/с, растёт
  const geo = new THREE.BoxGeometry(1, 4, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x330000 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = false;

  // Случайная позиция по периметру арены (граница 48)
  const side = Math.floor(Math.random() * 4);
  const edge = 48;
  let x, z;
  switch (side) {
    case 0: x = -edge; z = (Math.random() - 0.5) * 2 * edge; break; // левая сторона
    case 1: x = edge; z = (Math.random() - 0.5) * 2 * edge; break;  // правая
    case 2: z = -edge; x = (Math.random() - 0.5) * 2 * edge; break; // верхняя
    case 3: z = edge; x = (Math.random() - 0.5) * 2 * edge; break;  // нижняя
  }
  mesh.position.set(x, 2, z); // центр высоты 4 (Y=2)
  scene.add(mesh);

  // Коллизионный невидимый меш (для рейкастинга)
  const collider = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ visible: false }));
  collider.position.copy(mesh.position);
  collider.visible = false;
  collider.userData.isDrone = true;
  scene.add(collider);
  collisionObjects.push(collider);

  drones.push({
    mesh,
    collider,
    speed,
  });
  dronesSpawnedThisWave++;
}

function destroyDrone(drone, scene) {
  if (!drone) return;
  scene.remove(drone.mesh);
  scene.remove(drone.collider);

  const idx = collisionObjects.indexOf(drone.collider);
  if (idx > -1) collisionObjects.splice(idx, 1);

  const droneIdx = drones.indexOf(drone);
  if (droneIdx > -1) drones.splice(droneIdx, 1);
}

export function tryDestroyDrone(collider) {
  const drone = drones.find(d => d.collider === collider);
  if (drone) {
    // Взрыв будет создан в player.js, здесь только удаление
    // Сцену передадим через замыкание? Придётся добавить параметр.
    // Вызывается из player.fire, где есть this.scene, но мы не можем получить сцену отсюда.
    // Лучше перенести логику уничтожения в player.fire, а здесь оставить только поиск.
    return drone;
  }
  return null;
}

// Очистка всех дронов (для рестарта)
export function clearDrones(scene) {
  while (drones.length > 0) {
    const drone = drones.pop();
    scene.remove(drone.mesh);
    scene.remove(drone.collider);
    const idx = collisionObjects.indexOf(drone.collider);
    if (idx > -1) collisionObjects.splice(idx, 1);
  }
  waveNumber = 0;
  dronesSpawnedThisWave = 0;
  dronesToSpawnThisWave = 0;
  maxDronesOnScreen = 5;
  waveActive = false;
  restTimer = 0;
}