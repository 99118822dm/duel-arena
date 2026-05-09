import * as THREE from 'three';
import { spawnExplosion } from './effects.js';
import { playLaserSound } from './sound.js';
import { generatorHP, setGeneratorHP } from './scene.js';
import { tryDestroyDrone } from './drones.js';

// ---------- Заглушка модели платформы ----------
function createDummyPlatform() {
  const group = new THREE.Group();

  // --- Корпус (основной блок) ---
  const bodyGeo = new THREE.BoxGeometry(2, 1, 3);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3366cc });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // --- Пушка (Gun) ---
  const gunGroup = new THREE.Group();
  gunGroup.name = 'Gun';
  const barrelGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.2, 8);
  const barrelMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
  const barrel = new THREE.Mesh(barrelGeo, barrelMat);
  barrel.name = 'GunBarrel';
  barrel.position.y = 0.6;
  barrel.castShadow = true;
  gunGroup.add(barrel);
  const baseGeo = new THREE.BoxGeometry(0.4, 0.3, 0.4);
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const base = new THREE.Mesh(baseGeo, baseMat);
  base.position.y = 0.15;
  base.castShadow = true;
  gunGroup.add(base);
  gunGroup.position.set(0, 2.2, 1.5);
  group.add(gunGroup);

  // --- Колёса (4 омни-колеса) ---
  const wheelNames = ['Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR'];
  const positions = [
    [-1, 0.3,  1.2],
    [ 1, 0.3,  1.2],
    [-1, 0.3, -1.2],
    [ 1, 0.3, -1.2],
  ];
  const wheelGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });

  wheelNames.forEach((name, i) => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.name = name;
    wheel.rotation.z = Math.PI / 2; // ось X вдоль вращения
    const [x, y, z] = positions[i];
    wheel.position.set(x, y, z);
    wheel.castShadow = true;
    wheel.receiveShadow = true;
    group.add(wheel);
  });

  return group;
}

// ---------- Класс игрока ----------
export class Player {
  constructor(scene, collisionObjectsRef) {
    this.scene = scene;

    // 3D-модель
    this.mesh = createDummyPlatform();
    this.mesh.position.y = 0.5;
    scene.add(this.mesh);

    // Доступ к частям модели
    this.gun = this.mesh.getObjectByName('Gun');
    this.gunBarrel = this.mesh.getObjectByName('GunBarrel');
    this.wheels = {
      FL: this.mesh.getObjectByName('Wheel_FL'),
      FR: this.mesh.getObjectByName('Wheel_FR'),
      RL: this.mesh.getObjectByName('Wheel_RL'),
      RR: this.mesh.getObjectByName('Wheel_RR'),
    };

    // Коллизионный невидимый меш (высокий хитбокс)
    const colGeo = new THREE.BoxGeometry(2, 6, 3);
    const colMat = new THREE.MeshBasicMaterial({ visible: false });
    this.collider = new THREE.Mesh(colGeo, colMat);
    this.collider.position.copy(this.mesh.position);
    this.collider.position.y = 3;
    this.collider.visible = false;
    this.collider.userData.isPlayer = true;
    scene.add(this.collider);

    this.collisionObjects = collisionObjectsRef || [];
    this.collisionObjects.push(this.collider);

    // Состояние движения
    this.speed = 8;
    this.yaw = 0;
    this.moveForward = 0;
    this.moveStrafe = 0;

    // Перезарядка
    this.shootCooldown = 5;
    this.shootTimer = 0;
    this.canShoot = true;

    // Анимация отдачи
    this.recoilActive = false;
    this.recoilTime = 0;
    this.originalGunZ = this.gun ? this.gun.position.z : 0;

    // Лучи выстрелов
    this.activeBeams = [];
  }

  // Получить Box3 коллизии игрока в мировых координатах
  getCollisionBox() {
    return new THREE.Box3().setFromObject(this.collider);
  }

  // Проверка столкновений (дроны игнорируются)
  checkCollision() {
    const playerBox = this.getCollisionBox();
    for (const obj of this.collisionObjects) {
      if (obj === this.collider) continue;
      if (obj.userData.isDrone) continue; // призраки
      const objBox = new THREE.Box3().setFromObject(obj);
      if (playerBox.intersectsBox(objBox)) {
        return true;
      }
    }
    return false;
  }

  // Мировые координаты кончика ствола
  getGunWorldPosition() {
    if (this.gunBarrel) {
      const barrelWorldPos = new THREE.Vector3();
      this.gunBarrel.getWorldPosition(barrelWorldPos);
      const forwardDir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
      return barrelWorldPos.clone().add(forwardDir.multiplyScalar(0.6));
    } else {
      const pos = this.mesh.position.clone();
      const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
      pos.add(dir.multiplyScalar(1.5 + 1.2));
      pos.y += 2.2 + 0.6;
      return pos;
    }
  }

  // Направление выстрела
  getGunDirection() {
    return new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion);
  }

  // Создание визуального луча
  createLaserBeam(start, end) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();
    const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

    const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, length, 4);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.copy(midPoint);
    beam.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.clone().normalize()
    );
    this.scene.add(beam);
    this.activeBeams.push({ mesh: beam, timer: 0.2 });
  }

  // Обновление игрока
  update(delta, input) {
    // Удаление старых лучей
    for (let i = this.activeBeams.length - 1; i >= 0; i--) {
      const beamData = this.activeBeams[i];
      beamData.timer -= delta;
      if (beamData.timer <= 0) {
        this.scene.remove(beamData.mesh);
        this.activeBeams.splice(i, 1);
      }
    }

    // Поворот от мыши
    if (input.rotateDelta) {
      this.yaw += input.rotateDelta;
    }

    // Движение
    const forwardInput = (input.keys.forward ? 1 : 0) - (input.keys.backward ? 1 : 0);
    const strafeInput = (input.keys.left ? 1 : 0) - (input.keys.right ? 1 : 0);
    this.moveForward = forwardInput;
    this.moveStrafe = strafeInput;

    const direction = new THREE.Vector3();
    direction.z = forwardInput;
    direction.x = strafeInput;
    direction.normalize();
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const moveDistance = this.speed * delta;
    const velocity = direction.multiplyScalar(moveDistance);

    const originalPos = this.mesh.position.clone();

    // Движение по X с проверкой коллизии
    this.mesh.position.x += velocity.x;
    this.mesh.position.y = 0.5;
    this.collider.position.x = this.mesh.position.x;
    this.collider.position.y = 3;
    this.collider.position.z = this.mesh.position.z;
    if (this.checkCollision()) {
      this.mesh.position.x = originalPos.x;
      this.collider.position.x = originalPos.x;
    }

    // Движение по Z с проверкой коллизии
    this.mesh.position.z += velocity.z;
    this.mesh.position.y = 0.5;
    this.collider.position.x = this.mesh.position.x;
    this.collider.position.y = 3;
    this.collider.position.z = this.mesh.position.z;
    if (this.checkCollision()) {
      this.mesh.position.z = originalPos.z;
      this.collider.position.z = originalPos.z;
    }

    this.mesh.position.y = 0.5;
    this.collider.position.x = this.mesh.position.x;
    this.collider.position.z = this.mesh.position.z;
    this.collider.position.y = 3;
    this.mesh.rotation.y = this.yaw;

    // Анимация колёс
    this.updateWheels(delta, forwardInput, strafeInput, 0);

    // Перезарядка
    this.shootTimer -= delta;
    if (this.shootTimer <= 0) {
      this.canShoot = true;
    }
    if (input.shoot && this.canShoot) {
      this.fire();
      input.shoot = false;
    }

    // Анимация отдачи
    if (this.recoilActive) {
      this.recoilTime -= delta;
      if (this.recoilTime <= 0) {
        if (this.gun) this.gun.position.z = this.originalGunZ;
        this.recoilActive = false;
      } else {
        const progress = 1 - (this.recoilTime / 0.2);
        const recoilOffset = -0.2 * Math.sin(progress * Math.PI);
        if (this.gun) this.gun.position.z = this.originalGunZ + recoilOffset;
      }
    }
  }

  // Выстрел
  fire() {
    if (!this.canShoot) return;
    this.canShoot = false;
    this.shootTimer = this.shootCooldown;

    // Анимация отдачи
    this.recoilActive = true;
    this.recoilTime = 0.2;
    if (this.gun) {
      this.gun.position.z = this.originalGunZ - 0.2;
    }

    const origin = this.getGunWorldPosition();
    const direction = this.getGunDirection();
    const raycaster = new THREE.Raycaster(origin, direction, 0, 200);
    // Исключаем свой коллайдер
    const targets = this.collisionObjects.filter(obj => obj !== this.collider);
    const intersects = raycaster.intersectObjects(targets);

    let hitPoint = null;
    if (intersects.length > 0) {
      const hit = intersects[0];
      hitPoint = hit.point;

      if (hit.object.userData.isGenerator) {
        // Лечение генератора
        setGeneratorHP(generatorHP + 0.2);
        // Можно добавить эффект лечения (пока без визуала)
      } else if (hit.object.userData.isDrone) {
        // Уничтожение дрона
        tryDestroyDrone(hit.object);
        spawnExplosion(this.scene, hitPoint);
      } else {
        // Попадание в препятствие
        spawnExplosion(this.scene, hitPoint);
      }
    }

    // Визуальный луч
    const endPoint = hitPoint || origin.clone().add(direction.clone().multiplyScalar(200));
    this.createLaserBeam(origin, endPoint);

    // Звук выстрела
    playLaserSound(origin);
  }

  // Анимация колёс (устаревший вариант, не используется)
  updateWheelsFromInput(forward, strafe, rotateDir) {
    const wheelRadius = 0.3;
    const angularBase = this.speed / wheelRadius;
    const speeds = { FL: 0, FR: 0, RL: 0, RR: 0 };

    if (forward !== 0) {
      const dir = forward > 0 ? 1 : -1;
      speeds.FL += dir * angularBase;
      speeds.FR += dir * angularBase;
      speeds.RL += dir * angularBase;
      speeds.RR += dir * angularBase;
    }
    if (strafe !== 0) {
      const dir = strafe > 0 ? 1 : -1;
      speeds.FL -= dir * angularBase;
      speeds.FR += dir * angularBase;
      speeds.RL += dir * angularBase;
      speeds.RR -= dir * angularBase;
    }
    if (rotateDir !== 0) {
      const dir = rotateDir > 0 ? 1 : -1;
      speeds.FL -= dir * angularBase;
      speeds.FR += dir * angularBase;
      speeds.RL -= dir * angularBase;
      speeds.RR += dir * angularBase;
    }

    for (const name of ['FL', 'FR', 'RL', 'RR']) {
      const wheel = this.wheels[name];
      if (wheel) wheel.rotation.x += speeds[name] * 0.016;
    }
  }

  // Анимация колёс с учётом delta
  updateWheels(delta, forward, strafe, rotateDir) {
    const wheelRadius = 0.3;
    const angularBase = this.speed / wheelRadius;
    const speeds = { FL: 0, FR: 0, RL: 0, RR: 0 };

    if (forward !== 0) {
      const dir = forward > 0 ? 1 : -1;
      speeds.FL += dir * angularBase;
      speeds.FR += dir * angularBase;
      speeds.RL += dir * angularBase;
      speeds.RR += dir * angularBase;
    }
    if (strafe !== 0) {
      const dir = strafe > 0 ? 1 : -1;
      speeds.FL -= dir * angularBase;
      speeds.FR += dir * angularBase;
      speeds.RL += dir * angularBase;
      speeds.RR -= dir * angularBase;
    }
    if (rotateDir !== 0) {
      const dir = rotateDir > 0 ? 1 : -1;
      speeds.FL -= dir * angularBase;
      speeds.FR += dir * angularBase;
      speeds.RL -= dir * angularBase;
      speeds.RR += dir * angularBase;
    }

    for (const name of ['FL', 'FR', 'RL', 'RR']) {
      const wheel = this.wheels[name];
      if (wheel) wheel.rotation.x += speeds[name] * delta;
    }
  }
}