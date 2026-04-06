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

// ========== ВХОД ==========
function renderLogin() {
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-logo">⚛️</div>
        <h1>AtomCord</h1>
        <p class="login-subtitle">Голосовой штаб</p>
        <input type="text" id="nickname" class="login-input" placeholder="Никнейм" autocomplete="off">
        <input type="password" id="password" class="login-input" placeholder="Пароль" autocomplete="off">
        <button id="login-btn" class="login-button">Войти</button>
        <button id="register-btn" class="login-button secondary">Создать аккаунт</button>
        <div id="error" class="error-msg"></div>
      </div>
    </div>
  `;
  
  const nicknameInput = document.getElementById('nickname');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const errorDiv = document.getElementById('error');
  
  // Принудительный фокус
  setTimeout(() => {
    if (nicknameInput) {
      nicknameInput.focus();
      console.log('✅ Фокус на поле никнейма');
    }
  }, 200);
  
  const showError = (msg) => {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 3000);
  };
  
  const handleAuth = (mode) => {
    const nickname = nicknameInput.value.trim();
    const password = passwordInput.value;
    
    if (nickname.length < 2) {
      showError('Никнейм минимум 2 символа');
      return;
    }
    if (password.length < 4) {
      showError('Пароль минимум 4 символа');
      return;
    }
    
    loginBtn.disabled = true;
    registerBtn.disabled = true;
    loginBtn.textContent = mode === 'login' ? '⏳ Вход...' : '⏳ Регистрация...';
    
    if (socket) socket.disconnect();
    
    socket = io(SERVER_URL, { 
      transports: ['websocket', 'polling'],
      reconnection: true
    });
    
    socket.on('connect', () => {
      console.log('✅ Сокет подключен');
      socket.emit(mode, { nickname, password }, (response) => {
        console.log('Ответ сервера:', response);
        if (response?.success) {
          currentUser = { nickname, userId: response.userId };
          saveUser({ nickname });
          renderMainApp();
        } else {
          showError(response?.error || 'Ошибка');
          loginBtn.disabled = false;
          registerBtn.disabled = false;
          loginBtn.textContent = mode === 'login' ? 'Войти' : 'Создать аккаунт';
        }
      });
    });
    
    socket.on('connect_error', (err) => {
      console.error('Ошибка подключения:', err);
      showError('Сервер не отвечает');
      loginBtn.disabled = false;
      registerBtn.disabled = false;
      loginBtn.textContent = mode === 'login' ? 'Войти' : 'Создать аккаунт';
    });
  };
  
  loginBtn.onclick = () => handleAuth('login');
  registerBtn.onclick = () => handleAuth('register');
  
  nicknameInput.onkeypress = (e) => {
    if (e.key === 'Enter') handleAuth('login');
  };
  passwordInput.onkeypress = (e) => {
    if (e.key === 'Enter') handleAuth('login');
  };
}

// ========== ОСНОВНОЙ ЧАТ ==========
function renderMainApp() {
  app.innerHTML = `
    <div class="main-layout">
      <div class="sidebar">
        <div class="sidebar-header">
          <div class="logo">⚛️ AtomCord</div>
        </div>
        <div class="channels">
          <div class="channel-category">ТЕКСТОВЫЕ КАНАЛЫ</div>
          <div class="channel active" data-channel="general"># general</div>
          <div class="channel-category">ГОЛОСОВЫЕ КАНАЛЫ</div>
          <div class="channel" data-channel="voice">🎙️ Голосовой</div>
        </div>
        <div class="user-info">
          <span>👤 ${escapeHtml(currentUser.nickname)}</span>
          <button id="logout-btn" class="logout-btn">🚪</button>
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
  
  // СОЗДАЁМ ИНПУТ
  const inputArea = document.getElementById('message-input-area');
  if (inputArea) {
    inputArea.innerHTML = `
      <input type="text" id="message-input" class="message-input" placeholder="Введите сообщение..." autocomplete="off">
      <button id="send-btn" class="send-btn">📤</button>
    `;
  }
  
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  
  // НАСТРОЙКА ИНПУТА
  if (messageInput) {
    // Снимаем все блокировки
    messageInput.disabled = false;
    messageInput.readOnly = false;
    messageInput.tabIndex = 0;
    
    // Обработчик ввода
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const text = messageInput.value.trim();
        if (text && socket) {
          socket.emit('send-message', { channelId: 'general', text });
          messageInput.value = '';
        }
      }
    });
    
    // Дополнительная проверка на клик
    messageInput.addEventListener('click', () => {
      console.log('Инпут кликнут');
    });
    
    messageInput.addEventListener('focus', () => {
      console.log('✅ Инпут в фокусе');
    });
    
    // МНОГОКРАТНЫЙ ПРИНУДИТЕЛЬНЫЙ ФОКУС
    const focusInput = () => {
      messageInput.focus();
    };
    
    setTimeout(focusInput, 100);
    setTimeout(focusInput, 500);
    setTimeout(focusInput, 1000);
  }
  
  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const text = messageInput?.value.trim();
      if (text && socket) {
        socket.emit('send-message', { channelId: 'general', text });
        if (messageInput) messageInput.value = '';
        messageInput?.focus();
      }
    });
  }
  
  // Выход
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      if (socket) socket.disconnect();
      clearSavedUser();
      renderLogin();
    });
  }
  
  // Загружаем историю
  if (socket) {
    socket.emit('join-text-channel', 'general');
    
    // Убираем старые обработчики, чтобы не дублировать
    socket.off('channel-history');
    socket.off('new-message');
    
    socket.on('channel-history', ({ messages }) => {
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
    });
    
    socket.on('new-message', (message) => {
      if (message.channelId === 'general') {
        const container = document.getElementById('messages-container');
        if (container) {
          const msgDiv = document.createElement('div');
          msgDiv.className = 'message';
          msgDiv.innerHTML = `<strong style="color:#b392f0;">${escapeHtml(message.nickname)}</strong> <span>${escapeHtml(message.text)}</span>`;
          container.appendChild(msgDiv);
          container.scrollTop = container.scrollHeight;
          
          // Удаляем заглушку если была
          const empty = container.querySelector('.empty-messages');
          if (empty) empty.remove();
        }
      }
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== ЗАПУСК ==========
const savedUser = getSavedUser();
if (savedUser?.nickname) {
  currentUser = savedUser;
  socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
  socket.on('connect', () => {
    socket.emit('login', { nickname: currentUser.nickname, password: '' }, (res) => {
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