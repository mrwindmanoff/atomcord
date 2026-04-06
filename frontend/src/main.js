import { io } from 'socket.io-client';

const SERVER_URL = 'https://atomcord-backend.onrender.com';

let currentUser = null;
let socket = null;
let currentChannel = { id: 'general', name: 'Общий', type: 'text' };
let messagesCache = {};

const app = document.getElementById('app');

function saveUser(user) {
  localStorage.setItem('atomcord_user', JSON.stringify(user));
}

function getSavedUser() {
  const saved = localStorage.getItem('atomcord_user');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch(e) {
      return null;
    }
  }
  return null;
}

function clearSavedUser() {
  localStorage.removeItem('atomcord_user');
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ===== ВЕЧНЫЙ ФИКС КЛАВИАТУРЫ =====
function fixAllInputs() {
  const inputs = document.querySelectorAll('input, textarea');
  inputs.forEach(input => {
    if (input.hasAttribute('data-fixed')) return;
    
    // Сохраняем значение и атрибуты
    const value = input.value;
    const id = input.id;
    const className = input.className;
    const placeholder = input.placeholder;
    const inputType = input.type;
    
    // Создаём новый элемент
    const newInput = document.createElement(input.tagName);
    newInput.id = id;
    newInput.className = className;
    newInput.placeholder = placeholder;
    if (inputType) newInput.type = inputType;
    newInput.value = value;
    newInput.autocomplete = 'off';
    
    // Копируем все data-атрибуты
    for (let attr of input.attributes) {
      if (attr.name.startsWith('data-')) {
        newInput.setAttribute(attr.name, attr.value);
      }
    }
    
    // Жёсткие стили для гарантии работы
    newInput.style.cssText = `
      pointer-events: auto !important;
      user-select: text !important;
      -webkit-user-select: text !important;
      opacity: 1 !important;
      visibility: visible !important;
    `;
    
    newInput.setAttribute('data-fixed', 'true');
    
    // Заменяем старый элемент новым
    input.parentNode.replaceChild(newInput, input);
  });
}

// ========== СТРАНИЦА ВХОДА ==========
function renderLogin() {
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-logo">
          <span class="logo-atom">⚛️</span>
          <span class="logo-text">AtomCord</span>
        </div>
        <p class="login-subtitle">Голосовой штаб</p>
        <input type="text" id="nickname" class="login-input" placeholder="Никнейм" autocomplete="off">
        <input type="password" id="password" class="login-input" placeholder="Пароль" autocomplete="off">
        <button id="login-btn" class="login-button">Войти</button>
        <button id="go-to-register-btn" class="login-button secondary">📝 Создать аккаунт</button>
        <div id="error" class="error-msg"></div>
      </div>
    </div>
  `;
  
  // ВЕЧНЫЙ ФИКС
  setTimeout(() => fixAllInputs(), 50);
  setTimeout(() => fixAllInputs(), 200);
  setTimeout(() => fixAllInputs(), 500);
  
  const nicknameInput = document.getElementById('nickname');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('go-to-register-btn');
  const errorDiv = document.getElementById('error');
  
  const setFocus = () => {
    if (nicknameInput) nicknameInput.focus();
  };
  setTimeout(setFocus, 100);
  setTimeout(setFocus, 300);
  setTimeout(setFocus, 600);
  
  const showError = (msg) => {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 3000);
  };
  
  const handleLogin = () => {
    const nickname = nicknameInput?.value.trim();
    const password = passwordInput?.value;
    
    if (!nickname || nickname.length < 2) {
      showError('Никнейм минимум 2 символа');
      return;
    }
    if (!password || password.length < 4) {
      showError('Пароль минимум 4 символа');
      return;
    }
    
    loginBtn.disabled = true;
    loginBtn.textContent = '⏳ Вход...';
    
    if (socket) socket.disconnect();
    
    socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    
    socket.on('connect', () => {
      socket.emit('login', { nickname, password }, (response) => {
        if (response?.success) {
          currentUser = { nickname, userId: response.userId };
          saveUser({ nickname, password });
          renderMainApp();
        } else {
          showError(response?.error || 'Ошибка входа');
          loginBtn.disabled = false;
          loginBtn.textContent = 'Войти';
          setTimeout(() => nicknameInput?.focus(), 100);
        }
      });
    });
    
    socket.on('connect_error', () => {
      showError('Сервер не отвечает');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Войти';
      setTimeout(() => nicknameInput?.focus(), 100);
    });
  };
  
  loginBtn.onclick = handleLogin;
  registerBtn.onclick = () => renderRegister();
  nicknameInput?.addEventListener('keypress', (e) => e.key === 'Enter' && handleLogin());
  passwordInput?.addEventListener('keypress', (e) => e.key === 'Enter' && handleLogin());
}

// ========== СТРАНИЦА РЕГИСТРАЦИИ ==========
function renderRegister() {
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-logo">
          <span class="logo-atom">⚛️</span>
          <span class="logo-text">AtomCord</span>
        </div>
        <p class="login-subtitle">Создай аккаунт</p>
        <input type="text" id="reg-nickname" class="login-input" placeholder="Никнейм" autocomplete="off">
        <input type="password" id="reg-password" class="login-input" placeholder="Пароль" autocomplete="off">
        <input type="password" id="reg-confirm" class="login-input" placeholder="Подтвердите пароль" autocomplete="off">
        <button id="register-btn" class="login-button">Зарегистрироваться</button>
        <button id="back-to-login-btn" class="login-button secondary">← Назад</button>
        <div id="error" class="error-msg"></div>
      </div>
    </div>
  `;
  
  // ВЕЧНЫЙ ФИКС
  setTimeout(() => fixAllInputs(), 50);
  setTimeout(() => fixAllInputs(), 200);
  setTimeout(() => fixAllInputs(), 500);
  
  const nicknameInput = document.getElementById('reg-nickname');
  const passwordInput = document.getElementById('reg-password');
  const confirmInput = document.getElementById('reg-confirm');
  const registerBtn = document.getElementById('register-btn');
  const backBtn = document.getElementById('back-to-login-btn');
  const errorDiv = document.getElementById('error');
  
  const setFocus = () => {
    if (nicknameInput) nicknameInput.focus();
  };
  setTimeout(setFocus, 100);
  setTimeout(setFocus, 300);
  setTimeout(setFocus, 600);
  
  const showError = (msg) => {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 3000);
  };
  
  const handleRegister = () => {
    const nickname = nicknameInput?.value.trim();
    const password = passwordInput?.value;
    const confirm = confirmInput?.value;
    
    if (!nickname || nickname.length < 2) {
      showError('Никнейм минимум 2 символа');
      return;
    }
    if (!password || password.length < 4) {
      showError('Пароль минимум 4 символа');
      return;
    }
    if (password !== confirm) {
      showError('Пароли не совпадают');
      return;
    }
    
    registerBtn.disabled = true;
    registerBtn.textContent = '⏳ Регистрация...';
    
    if (socket) socket.disconnect();
    
    socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    
    socket.on('connect', () => {
      socket.emit('register', { nickname, password }, (response) => {
        if (response?.success) {
          currentUser = { nickname, userId: response.userId };
          saveUser({ nickname, password });
          renderMainApp();
        } else {
          showError(response?.error || 'Ошибка регистрации');
          registerBtn.disabled = false;
          registerBtn.textContent = 'Зарегистрироваться';
          setTimeout(() => nicknameInput?.focus(), 100);
        }
      });
    });
    
    socket.on('connect_error', () => {
      showError('Сервер не отвечает');
      registerBtn.disabled = false;
      registerBtn.textContent = 'Зарегистрироваться';
      setTimeout(() => nicknameInput?.focus(), 100);
    });
  };
  
  registerBtn.onclick = handleRegister;
  backBtn.onclick = renderLogin;
  nicknameInput?.addEventListener('keypress', (e) => e.key === 'Enter' && handleRegister());
  passwordInput?.addEventListener('keypress', (e) => e.key === 'Enter' && handleRegister());
  confirmInput?.addEventListener('keypress', (e) => e.key === 'Enter' && handleRegister());
}

// ========== ОСНОВНОЙ ЧАТ ==========
function renderMainApp() {
  app.innerHTML = `
    <div class="main-layout">
      <div class="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <span class="logo-atom">⚛️</span>
            <span class="logo-text">AtomCord</span>
          </div>
        </div>
        <div class="channels">
          <div class="channel-category">ТЕКСТОВЫЕ КАНАЛЫ</div>
          <div class="channel active" data-channel="general"># general</div>
          <div class="channel" data-channel="random"># random</div>
          <div class="channel-category">ГОЛОСОВЫЕ КАНАЛЫ</div>
          <div class="channel" data-channel="voice-lobby">🎙️ Главный штаб</div>
          <div class="channel" data-channel="voice-gaming">🎙️ Игровая комната</div>
        </div>
        <div class="user-info">
          <span>👤 ${escapeHtml(currentUser.nickname)}</span>
          <button id="logout-btn" class="logout-btn" title="Выйти">🚪</button>
        </div>
      </div>
      <div class="main-content">
        <div class="chat-header">
          <h2 id="channel-name"># general</h2>
        </div>
        <div class="messages-container" id="messages-container">
          <div class="empty-messages">Загрузка сообщений...</div>
        </div>
        <div class="message-input-area" id="message-input-area"></div>
      </div>
    </div>
  `;
  
  const inputArea = document.getElementById('message-input-area');
  if (inputArea) {
    inputArea.innerHTML = `
      <input type="text" id="message-input" class="message-input" placeholder="Введите сообщение..." autocomplete="off">
      <button id="send-btn" class="send-btn">📤</button>
    `;
  }
  
  // ВЕЧНЫЙ ФИКС для инпута в чате
  setTimeout(() => fixAllInputs(), 50);
  setTimeout(() => fixAllInputs(), 200);
  
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  
  if (messageInput) {
    const setFocus = () => messageInput.focus();
    setTimeout(setFocus, 200);
    setTimeout(setFocus, 500);
    setTimeout(setFocus, 1000);
    
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const text = messageInput.value.trim();
        if (text && socket) {
          socket.emit('send-message', { channelId: currentChannel.id, text });
          messageInput.value = '';
        }
      }
    });
  }
  
  if (sendBtn) {
    sendBtn.onclick = () => {
      const text = messageInput?.value.trim();
      if (text && socket) {
        socket.emit('send-message', { channelId: currentChannel.id, text });
        if (messageInput) messageInput.value = '';
        messageInput?.focus();
      }
    };
  }
  
  document.querySelectorAll('.channel').forEach(el => {
    el.onclick = () => {
      const channelId = el.dataset.channel;
      const channelName = el.innerText.trim();
      document.getElementById('channel-name').innerHTML = channelName;
      currentChannel.id = channelId;
      currentChannel.name = channelName.replace(/[#🎙️]/g, '').trim();
      socket.emit('join-text-channel', channelId);
      setTimeout(() => {
        const input = document.getElementById('message-input');
        if (input) input.focus();
      }, 100);
    };
  });
  
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      if (socket) socket.disconnect();
      clearSavedUser();
      renderLogin();
    };
  }
  
  if (socket) {
    socket.emit('join-text-channel', 'general');
    
    socket.off('channel-history');
    socket.off('new-message');
    
    socket.on('channel-history', ({ channelId, messages }) => {
      if (channelId === currentChannel.id) {
        const container = document.getElementById('messages-container');
        if (container) {
          if (!messages || messages.length === 0) {
            container.innerHTML = '<div class="empty-messages">Нет сообщений. Напишите первым!</div>';
          } else {
            container.innerHTML = messages.map(msg => `
              <div class="message">
                <strong style="color:#b392f0;">${escapeHtml(msg.nickname)}</strong>
                <span>${escapeHtml(msg.text)}</span>
              </div>
            `).join('');
            container.scrollTop = container.scrollHeight;
          }
        }
      }
    });
    
    socket.on('new-message', (message) => {
      if (message.channelId === currentChannel.id) {
        const container = document.getElementById('messages-container');
        if (container) {
          const msgDiv = document.createElement('div');
          msgDiv.className = 'message';
          msgDiv.innerHTML = `<strong style="color:#b392f0;">${escapeHtml(message.nickname)}</strong> <span>${escapeHtml(message.text)}</span>`;
          container.appendChild(msgDiv);
          container.scrollTop = container.scrollHeight;
          const empty = container.querySelector('.empty-messages');
          if (empty) empty.remove();
        }
      }
    });
  }
}

// ========== ЗАПУСК ==========
const savedUser = getSavedUser();
if (savedUser?.nickname) {
  currentUser = savedUser;
  socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  socket.on('connect', () => {
    socket.emit('login', { nickname: currentUser.nickname, password: savedUser.password }, (res) => {
      if (res?.success) {
        renderMainApp();
      } else {
        clearSavedUser();
        renderLogin();
      }
    });
  });
  socket.on('connect_error', () => {
    clearSavedUser();
    renderLogin();
  });
} else {
  renderLogin();
}