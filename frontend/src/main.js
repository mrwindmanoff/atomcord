import { io } from 'socket.io-client';

const SERVER_URL = 'https://atomcord-backend.onrender.com';

let currentUser = null;
let socket = null;

// DOM элементы
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

// Рендер страницы входа
function renderLogin() {
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-logo">⚛️</div>
        <h1>AtomCord</h1>
        <p class="login-subtitle">Голосовой штаб нового поколения</p>
        
        <input type="text" id="nickname" class="login-input" placeholder="Никнейм" autocomplete="off">
        <input type="password" id="password" class="login-input" placeholder="Пароль" autocomplete="off">
        
        <button id="login-btn" class="login-button">Войти</button>
        <button id="register-btn" class="login-button secondary">📝 Создать аккаунт</button>
        
        <div id="error-msg" class="error-msg"></div>
      </div>
    </div>
  `;
  
  const nicknameInput = document.getElementById('nickname');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('register-btn');
  const errorDiv = document.getElementById('error-msg');
  
  let loading = false;
  
  const showError = (msg) => {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 3000);
  };
  
  const handleAuth = async (mode) => {
    if (loading) return;
    
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
    
    loading = true;
    loginBtn.disabled = true;
    registerBtn.disabled = true;
    loginBtn.textContent = mode === 'login' ? '⏳ Вход...' : '⏳ Регистрация...';
    errorDiv.style.display = 'none';
    
    // Подключаемся к серверу
    if (socket) socket.disconnect();
    
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true
    });
    
    socket.on('connect', () => {
      console.log('✅ Подключен к серверу');
      
      socket.emit(mode, { nickname, password }, (response) => {
        console.log('Ответ:', response);
        
        if (response && response.success) {
          currentUser = { nickname, userId: response.userId };
          saveUser({ nickname });
          renderMainApp();
        } else {
          showError(response?.error || 'Ошибка');
          loginBtn.disabled = false;
          registerBtn.disabled = false;
          loginBtn.textContent = 'Войти';
          registerBtn.textContent = '📝 Создать аккаунт';
        }
        loading = false;
      });
    });
    
    socket.on('connect_error', () => {
      showError('Не удалось подключиться к серверу');
      loginBtn.disabled = false;
      registerBtn.disabled = false;
      loginBtn.textContent = 'Войти';
      registerBtn.textContent = '📝 Создать аккаунт';
      loading = false;
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
  
  nicknameInput.focus();
}

// Рендер основного приложения (упрощённая версия)
function renderMainApp() {
  app.innerHTML = `
    <div style="display:flex; height:100vh;">
      <div style="width:260px; background:#1a1a2a; border-right:1px solid #2a2a3a; display:flex; flex-direction:column;">
        <div style="padding:20px; border-bottom:1px solid #2a2a3a;">
          <div style="font-size:20px; font-weight:bold;">⚛️ AtomCord</div>
          <div style="font-size:12px; color:#888; margin-top:8px;">${currentUser.nickname}</div>
        </div>
        <div style="padding:16px; flex:1;">
          <div style="color:#888; font-size:12px; margin-bottom:10px;">ТЕКСТОВЫЕ КАНАЛЫ</div>
          <div class="channel" data-channel="general" style="padding:8px; border-radius:8px; margin-bottom:4px; cursor:pointer;"># general</div>
          <div class="channel" data-channel="random" style="padding:8px; border-radius:8px; margin-bottom:4px; cursor:pointer;"># random</div>
          <div style="color:#888; font-size:12px; margin:16px 0 10px 0;">ГОЛОСОВЫЕ КАНАЛЫ</div>
          <div class="channel" data-channel="voice-lobby" style="padding:8px; border-radius:8px; margin-bottom:4px; cursor:pointer;">🎙️ Главный штаб</div>
        </div>
        <button id="logout-btn" style="margin:16px; padding:8px; background:#2a2a3a; border:none; border-radius:8px; color:white; cursor:pointer;">🚪 Выйти</button>
      </div>
      <div style="flex:1; display:flex; flex-direction:column;">
        <div style="padding:16px; border-bottom:1px solid #2a2a3a; background:#1a1a2a;">
          <h2 id="channel-name"># general</h2>
        </div>
        <div id="messages-container" style="flex:1; padding:20px; overflow-y:auto;">
          <div style="color:#888; text-align:center;">Выберите канал</div>
        </div>
        <div style="padding:16px; border-top:1px solid #2a2a3a; background:#1a1a2a;">
          <input type="text" id="message-input" placeholder="Введите сообщение..." style="width:100%; padding:12px; background:#2a2a3a; border:none; border-radius:8px; color:white;">
        </div>
      </div>
    </div>
  `;
  
  let currentChannel = 'general';
  
  // Обработчики каналов
  document.querySelectorAll('.channel').forEach(el => {
    el.onclick = () => {
      const channelId = el.dataset.channel;
      currentChannel = channelId;
      document.getElementById('channel-name').innerHTML = el.innerHTML;
      loadMessages(channelId);
    };
  });
  
  // Отправка сообщений
  const messageInput = document.getElementById('message-input');
  messageInput.onkeypress = (e) => {
    if (e.key === 'Enter' && messageInput.value.trim()) {
      socket.emit('send-message', {
        channelId: currentChannel,
        text: messageInput.value.trim()
      });
      messageInput.value = '';
    }
  };
  
  // Выход
  document.getElementById('logout-btn').onclick = () => {
    if (socket) socket.disconnect();
    clearSavedUser();
    currentUser = null;
    renderLogin();
  };
  
  // Загрузка сообщений
  function loadMessages(channelId) {
    socket.emit('join-text-channel', channelId);
  }
  
  // Получение сообщений
  socket.on('channel-history', ({ channelId, messages }) => {
    if (currentChannel === channelId) {
      const container = document.getElementById('messages-container');
      container.innerHTML = messages.map(msg => `
        <div style="margin-bottom:12px;">
          <strong style="color:#b392f0;">${escapeHtml(msg.nickname)}</strong>
          <span style="margin-left:8px;">${escapeHtml(msg.text)}</span>
        </div>
      `).join('');
      if (messages.length === 0) {
        container.innerHTML = '<div style="color:#888; text-align:center;">Нет сообщений. Напишите первым!</div>';
      }
      container.scrollTop = container.scrollHeight;
    }
  });
  
  socket.on('new-message', (message) => {
    if (currentChannel === message.channelId) {
      const container = document.getElementById('messages-container');
      const msgDiv = document.createElement('div');
      msgDiv.style.marginBottom = '12px';
      msgDiv.innerHTML = `<strong style="color:#b392f0;">${escapeHtml(message.nickname)}</strong> <span>${escapeHtml(message.text)}</span>`;
      container.appendChild(msgDiv);
      container.scrollTop = container.scrollHeight;
    }
  });
  
  // Присоединяемся к первому каналу
  loadMessages('general');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Запуск
const savedUser = getSavedUser();
if (savedUser && savedUser.nickname) {
  // Пытаемся восстановить сессию
  currentUser = savedUser;
  renderMainApp();
} else {
  renderLogin();
}