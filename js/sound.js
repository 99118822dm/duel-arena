import * as THREE from 'three';

let audioListener = null;
let audioLoader = null;

// Буферы для синтезированных звуков
let laserBuffer = null;
let explosionBuffer = null;

// Инициализация звуковой системы
export function initSound(camera) {
  audioListener = new THREE.AudioListener();
  camera.add(audioListener);

  audioLoader = new THREE.AudioLoader();

  // Синтезируем звук выстрела (короткий высокий писк)
  laserBuffer = createLaserBuffer(audioListener.context);
  // Синтезируем звук взрыва (шум с затуханием)
  explosionBuffer = createExplosionBuffer(audioListener.context);
}

// Создание позиционного звука из буфера
function createPositionalSound(buffer) {
  if (!audioListener) return null;
  const sound = new THREE.PositionalAudio(audioListener);
  sound.setBuffer(buffer);
  sound.setRefDistance(5);
  sound.setVolume(0.8);
  return sound;
}

// Воспроизвести выстрел в точке
export function playLaserSound(position) {
  if (!laserBuffer || !audioListener) return;
  const sound = createPositionalSound(laserBuffer);
  if (!sound) return;
  sound.position.copy(position);
  sound.play();
  // Удаляем после окончания
  sound.onEnded = () => {
    if (sound.parent) sound.parent.remove(sound);
  };
  // Временно добавляем в сцену, чтобы звук был слышен
  const dummy = new THREE.Object3D();
  dummy.position.copy(position);
  dummy.add(sound);
  // Добавим в сцену через доступ к сцене (передадим позже)
  // Проще: использовать глобальную сцену из main через импорт, но для изоляции понадобится ссылка.
  // Пока оставим так, чуть позже подкорректируем в main.
}

// Воспроизвести взрыв в точке
export function playExplosionSound(position) {
  if (!explosionBuffer || !audioListener) return;
  const sound = createPositionalSound(explosionBuffer);
  if (!sound) return;
  sound.position.copy(position);
  sound.play();
  sound.onEnded = () => {
    if (sound.parent) sound.parent.remove(sound);
  };
  const dummy = new THREE.Object3D();
  dummy.position.copy(position);
  dummy.add(sound);
}

// Синтез лазерного выстрела
function createLaserBuffer(ctx) {
  const duration = 0.3;
  const length = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / ctx.sampleRate;
    // Частота падает с 1500 до 800 Гц
    const freq = 1500 - 700 * (t / duration);
    data[i] = Math.sin(2 * Math.PI * freq * t) * (1 - t / duration);
  }
  return buffer;
}

// Синтез взрыва (белый шум с быстрым затуханием)
function createExplosionBuffer(ctx) {
  const duration = 1.0;
  const length = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / ctx.sampleRate;
    // Шум с экспоненциальным спадом
    data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 4);
  }
  return buffer;
}