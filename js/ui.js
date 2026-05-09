// Главное меню
let menuDiv = null;
let playButton = null;

// Элементы HUD
let crosshairEl = null;
let cooldownCanvas = null;
let cooldownCtx = null;
let messageEl = null;
let statusEl = null;

// Инициализация меню
export function showMenu(onPlay) {
  if (menuDiv) return;

  menuDiv = document.createElement('div');
  menuDiv.id = 'menu';
  menuDiv.innerHTML = `
    <div class="menu-box">
      <h1>Дуэльная арена</h1>
      <button id="play-btn">Создать игру</button>
      <div id="status" class="status"></div>
      <p class="hint">Управление: WASD — движение, мышь — поворот, ЛКМ — выстрел</p>
      <p class="hint">Перезарядка: 5 секунд</p>
    </div>
  `;
  document.body.appendChild(menuDiv);

  playButton = document.getElementById('play-btn');
  playButton.addEventListener('click', () => {
    if (onPlay) onPlay();
  });
}

export function hideMenu() {
  if (menuDiv) {
    menuDiv.style.display = 'none';
  }
}

export function showStatus(text) {
  if (!statusEl) statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.style.display = 'block';
  }
}

export function showRoomLink(link) {
  if (!statusEl) statusEl = document.getElementById('status');
  if (statusEl) {
    statusEl.innerHTML = `<p>Отправь ссылку сопернику:</p>
      <input type="text" value="${link}" readonly class="room-link" />
      <button id="copy-link">Копировать</button>`;
    document.getElementById('copy-link')?.addEventListener('click', () => {
      navigator.clipboard.writeText(link);
      showMessage('Ссылка скопирована!', 1000);
    });
    statusEl.style.display = 'block';
  }
}

export function createHUD() {
  crosshairEl = document.createElement('div');
  crosshairEl.id = 'crosshair';
  document.body.appendChild(crosshairEl);

  cooldownCanvas = document.createElement('canvas');
  cooldownCanvas.id = 'cooldown';
  cooldownCanvas.width = 80;
  cooldownCanvas.height = 80;
  document.body.appendChild(cooldownCanvas);
  cooldownCtx = cooldownCanvas.getContext('2d');

  messageEl = document.createElement('div');
  messageEl.id = 'message';
  document.body.appendChild(messageEl);
}

export function updateCooldownIndicator(player) {
  if (!cooldownCtx || !player) return;

  const remaining = player.shootTimer;
  const total = player.shootCooldown;
  const ready = player.canShoot;
  const progress = ready ? 1 : 1 - (remaining / total);

  const ctx = cooldownCtx;
  const size = cooldownCanvas.width;
  ctx.clearRect(0, 0, size, size);

  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(size/2, size/2);
  ctx.arc(size/2, size/2, size/2 - 6, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progress));
  ctx.closePath();
  ctx.fillStyle = ready ? '#00ff00' : '#ff3333';
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = ready ? '0' : Math.ceil(remaining).toString();
  ctx.fillText(text, size/2, size/2);
}

export function showMessage(text, duration = 2000) {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.style.opacity = '1';
  clearTimeout(messageEl._timeout);
  messageEl._timeout = setTimeout(() => {
    messageEl.style.opacity = '0';
  }, duration);
}