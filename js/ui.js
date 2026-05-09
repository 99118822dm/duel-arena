// Главное меню
let menuDiv = null;

// Элементы HUD
let crosshairEl = null;
let cooldownCanvas = null;
let cooldownCtx = null;
let messageEl = null;
let hpBarContainer = null;
let hpFillEl = null;
let hpTextEl = null;

// Инициализация меню
export function showMenu(onPlay) {
  if (menuDiv) {
    menuDiv.style.display = 'flex';
    return;
  }

  menuDiv = document.createElement('div');
  menuDiv.id = 'menu';
  menuDiv.innerHTML = `
    <div class="menu-box">
      <h1>Защита базы</h1>
      <button id="play-btn">Начать игру</button>
      <p class="hint">Уничтожай красных дронов, не подпускай их к синему столбу!</p>
      <p class="hint">Выстрел в столб восстанавливает ему 0.2 HP</p>
    </div>
  `;
  document.body.appendChild(menuDiv);

  document.getElementById('play-btn').addEventListener('click', () => {
    hideMenu();
    if (onPlay) onPlay();
  });
}

export function hideMenu() {
  if (menuDiv) {
    menuDiv.style.display = 'none';
  }
}

// Создание HUD (перекрестие, индикатор перезарядки, полоса здоровья)
export function createHUD() {
  // Перекрестие
  if (!crosshairEl) {
    crosshairEl = document.createElement('div');
    crosshairEl.id = 'crosshair';
    document.body.appendChild(crosshairEl);
  }

  // Индикатор перезарядки (canvas)
  if (!cooldownCanvas) {
    cooldownCanvas = document.createElement('canvas');
    cooldownCanvas.id = 'cooldown';
    cooldownCanvas.width = 80;
    cooldownCanvas.height = 80;
    document.body.appendChild(cooldownCanvas);
    cooldownCtx = cooldownCanvas.getContext('2d');
  }

  // Полоса здоровья генератора
  if (!hpBarContainer) {
    hpBarContainer = document.createElement('div');
    hpBarContainer.id = 'hp-bar';
    hpBarContainer.innerHTML = '<div id="hp-fill"></div><span id="hp-text">10 / 10</span>';
    document.body.appendChild(hpBarContainer);
    hpFillEl = document.getElementById('hp-fill');
    hpTextEl = document.getElementById('hp-text');
  }

  // Сообщения
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'message';
    document.body.appendChild(messageEl);
  }
}

// Обновление индикатора перезарядки
export function updateCooldownIndicator(player) {
  if (!cooldownCtx || !player) return;

  const remaining = player.shootTimer;
  const total = player.shootCooldown;
  const ready = player.canShoot;
  const progress = ready ? 1 : 1 - (remaining / total);

  const ctx = cooldownCtx;
  const size = cooldownCanvas.width;
  ctx.clearRect(0, 0, size, size);

  // Фон круга
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fill();

  // Дуга прогресса
  ctx.beginPath();
  ctx.moveTo(size / 2, size / 2);
  ctx.arc(size / 2, size / 2, size / 2 - 6, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
  ctx.closePath();
  ctx.fillStyle = ready ? '#00ff00' : '#ff3333';
  ctx.fill();

  // Текст оставшихся секунд
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = ready ? '0' : Math.ceil(remaining).toString();
  ctx.fillText(text, size / 2, size / 2);
}

// Обновление полосы здоровья генератора
export function updateHPBar(current, max) {
  if (!hpFillEl || !hpTextEl) return;
  const pct = (current / max) * 100;
  hpFillEl.style.width = `${Math.max(0, pct)}%`;
  hpTextEl.textContent = `${Math.max(0, Math.ceil(current))} / ${max}`;
}

// Показать сообщение в центре экрана
export function showMessage(text, duration = 2000) {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.style.opacity = '1';
  clearTimeout(messageEl._timeout);
  messageEl._timeout = setTimeout(() => {
    messageEl.style.opacity = '0';
  }, duration);
}