import * as THREE from 'three';

export function updateCamera(camera, playerMesh) {
  if (!playerMesh) return;

  // Локальные смещения: сзади на 10 м, вверх на 5 м
  const offset = new THREE.Vector3(0, 5, -10);
  // Применяем поворот игрока
  offset.applyEuler(new THREE.Euler(0, playerMesh.rotation.y, 0));
  
  // Позиция камеры
  camera.position.copy(playerMesh.position).add(offset);

  // Точка взгляда: впереди на 3 м, высота 1.5 м
  const lookAtOffset = new THREE.Vector3(0, 1.5, 3);
  lookAtOffset.applyEuler(new THREE.Euler(0, playerMesh.rotation.y, 0));
  const target = playerMesh.position.clone().add(lookAtOffset);
  
  camera.lookAt(target);
}