import * as THREE from 'three';
import { playExplosionSound } from './sound.js';

const MAX_EXPLOSIONS = 5;
const activeExplosions = [];

function createDummySpriteSheet() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  const cols = 4, rows = 4;
  const frameW = canvas.width / cols;
  const frameH = canvas.height / rows;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = col * frameW + frameW / 2;
      const cy = row * frameH + frameH / 2;
      const frameIndex = row * cols + col;
      const progress = frameIndex / (cols * rows - 1);
      const radius = (1 - progress) * frameW * 0.45;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
      gradient.addColorStop(0, 'rgba(255, 200, 0, 1)');
      gradient.addColorStop(0.6, 'rgba(255, 80, 0, 0.8)');
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();
    }
  }
  return new THREE.CanvasTexture(canvas);
}

let spriteSheetTex = null;
function getSpriteSheet() {
  if (!spriteSheetTex) spriteSheetTex = createDummySpriteSheet();
  return spriteSheetTex;
}

export function spawnExplosion(scene, position) {
  if (activeExplosions.length >= MAX_EXPLOSIONS) {
    const old = activeExplosions.shift();
    if (old && old.sprite) scene.remove(old.sprite);
  }

  const texture = getSpriteSheet();
  const material = new THREE.SpriteMaterial({
    map: texture,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    color: 0xffffff,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4, 4, 1);
  sprite.position.copy(position);
  scene.add(sprite);

  activeExplosions.push({
    sprite,
    timer: 0,
    totalDuration: 0.48,
    cols: 4,
    rows: 4,
  });

  // Звук взрыва
  playExplosionSound(position);
}

export function updateExplosions(scene, delta) {
  for (let i = activeExplosions.length - 1; i >= 0; i--) {
    const data = activeExplosions[i];
    data.timer += delta;
    const frameIndex = Math.min(Math.floor(data.timer / 0.03), data.cols * data.rows - 1);
    const col = frameIndex % data.cols;
    const row = Math.floor(frameIndex / data.cols);
    const offsetX = col / data.cols;
    const offsetY = 1 - (row + 1) / data.rows;
    data.sprite.material.map.offset.set(offsetX, offsetY);
    data.sprite.material.map.repeat.set(1 / data.cols, 1 / data.rows);

    if (data.timer >= data.totalDuration) {
      scene.remove(data.sprite);
      activeExplosions.splice(i, 1);
    }
  }
}