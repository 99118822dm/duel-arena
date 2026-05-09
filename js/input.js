// Объект состояния ввода
export const inputState = {
  keys: {
    forward: false,
    backward: false,
    left: false,
    right: false,
  },
  shoot: false,        // одиночный клик (устанавливается обработчиком)
  rotateDelta: 0,      // накопленный угол поворота с прошлого кадра
  mouseDown: false,    // зажата ли ЛКМ
};

let locked = false;

// Инициализация ввода
export function initInput(canvas) {
  // --- Клавиатура ---
  document.addEventListener('keydown', (e) => {
    switch (e.code) {
      case 'KeyW': inputState.keys.forward = true; break;
      case 'KeyS': inputState.keys.backward = true; break;
      case 'KeyA': inputState.keys.left = true; break;
      case 'KeyD': inputState.keys.right = true; break;
      default: break;
    }
  });

  document.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'KeyW': inputState.keys.forward = false; break;
      case 'KeyS': inputState.keys.backward = false; break;
      case 'KeyA': inputState.keys.left = false; break;
      case 'KeyD': inputState.keys.right = false; break;
      default: break;
    }
  });

  // --- Мышь (Pointer Lock) ---
  canvas.addEventListener('click', () => {
    if (!locked) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === canvas;
  });

  // Движение мыши — поворот
  const sensitivity = 0.004;
  document.addEventListener('mousemove', (e) => {
    if (!locked) return;
    inputState.rotateDelta -= e.movementX * sensitivity;
    // ограничивать не будем, чтобы не сбрасывать
  });

  // ЛКМ (выстрел)
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // левая кнопка
      inputState.shoot = true;
      inputState.mouseDown = true;
    }
  });

  canvas.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
      inputState.mouseDown = false;
    }
  });
}

// Сброс флагов, которые считываются один раз за кадр
export function resetInputFlags() {
  inputState.rotateDelta = 0;
  inputState.shoot = false; // мы сбрасываем флаг выстрела после обработки
}