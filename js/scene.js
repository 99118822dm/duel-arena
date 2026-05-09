import * as THREE from 'three';

// ---------- Текстуры (временные, через Canvas) ----------
function createFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#444444';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#666666';
  ctx.lineWidth = 2;
  const step = 64;
  for (let i = step; i < 512; i += step) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

function createSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#1a2a6c');
  gradient.addColorStop(0.5, '#b21f1f');
  gradient.addColorStop(1, '#fdbb2d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return new THREE.CanvasTexture(canvas);
}

export const collisionObjects = [];
export let skySphere;

export function initScene(scene) {
  // Небо
  const skyGeo = new THREE.SphereGeometry(500, 64, 32);
  const skyTex = createSkyTexture();
  skyTex.mapping = THREE.EquirectangularReflectionMapping;
  const skyMat = new THREE.MeshBasicMaterial({
    map: skyTex,
    side: THREE.BackSide,
  });
  skySphere = new THREE.Mesh(skyGeo, skyMat);
  scene.add(skySphere);

  // Пол
  const floorTex = createFloorTexture();
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(200, 200);
  const floorGeo = new THREE.PlaneGeometry(100, 100);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorTex });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  scene.add(floor);

  // Освещение
  const ambient = new THREE.AmbientLight(0x404040, 0.3);
  scene.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(50, 100, 50);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 0.5;
  dirLight.shadow.camera.far = 200;
  dirLight.shadow.camera.left = -80;
  dirLight.shadow.camera.right = 80;
  dirLight.shadow.camera.top = 80;
  dirLight.shadow.camera.bottom = -80;
  dirLight.shadow.bias = -0.0001;
  scene.add(dirLight);

  // Невидимые стены
  const wallMat = new THREE.MeshBasicMaterial({ visible: false });
  const wallHeight = 3;
  const positions = [
    { pos: [0, wallHeight/2, -50.5], size: [101, wallHeight, 1] },
    { pos: [0, wallHeight/2, 50.5], size: [101, wallHeight, 1] },
    { pos: [-50.5, wallHeight/2, 0], size: [1, wallHeight, 101] },
    { pos: [50.5, wallHeight/2, 0], size: [1, wallHeight, 101] },
  ];
  positions.forEach(({ pos, size }) => {
    const geo = new THREE.BoxGeometry(...size);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(...pos);
    mesh.visible = false;
    scene.add(mesh);
    collisionObjects.push(mesh);
  });

  // Контейнеры – увеличена высота до 4 м (центр Y=2)
  const containerPositions = [
    [10, 2, 10],
    [-10, 2, 10],
    [10, 2, -10],
    [-10, 2, -10],
    [20, 2, 0],
    [-20, 2, 0],
    [0, 2, 0],
  ];
  const containerGeo = new THREE.BoxGeometry(2, 4, 3); // высота 4
  const containerVisMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
  const containerColMat = new THREE.MeshBasicMaterial({ visible: false });

  containerPositions.forEach(([x, y, z]) => {
    const visual = new THREE.Mesh(containerGeo, containerVisMat);
    visual.position.set(x, y, z);
    visual.castShadow = true;
    visual.receiveShadow = true;
    scene.add(visual);

    const collider = new THREE.Mesh(containerGeo, containerColMat);
    collider.position.set(x, y, z);
    collider.visible = false;
    scene.add(collider);
    collisionObjects.push(collider);
  });

  console.log('Сцена построена. Объектов коллизии:', collisionObjects.length);
}

export function updateSky(camera) {
  if (skySphere) {
    skySphere.position.copy(camera.position);
  }
}