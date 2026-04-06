import { io } from 'socket.io-client';

const SERVER_URL = 'https://atomcord-backend.onrender.com';

let currentUser = null;
let socket = null;

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

// ========== СТРАНИЦА ВХОДА ==========
function renderLogin() {
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-logo">⚛️</div>
        <h1>AtomCord</h1>
        <p class="login-subtitle">Голосовой штаб нового поколения</p>
        
        <input type="text" id="login-nickname" class="login-input" placeholder="Никнейм" autocomplete="off">
        <input type="password" id="login-password" class="login-input" placeholder="Пароль" autocomplete="off">
        
        <button id="do-login-btn" class="login-button">Войти</button>
        <button id="go-to-register-btn" class="login-button secondary">📝 Создать аккаунт</button>
        
        <div id="login-error" class="error-msg"></div>
      </div>
    </div>
  `;
  
  const nicknameInput = document.getElementById('login-nickname');
  const passwordInput = document.getElementById('login-password');
  const loginBtn = document.getElementById('do-login-btn');
  const registerBtn = document.getElementById('go-to-register-btn');
  const errorDiv = document.getElementById('login-error');
  
  const showError = (msg) => {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 3000);
  };
  
  const handleLogin = async () => {
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
    loginBtn.textContent = '⏳ Вход...';
    errorDiv.style.display = 'none';
    
    if (socket) socket.disconnect();
    
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true
    });
    
    socket.on('connect', () => {
      socket.emit('login', { nickname, password }, (response) => {
        if (response && response.success) {
          currentUser = { nickname, userId: response.userId };
          saveUser({ nickname });
          renderMainApp();
        } else {
          showError(response?.error || 'Ошибка входа');
          loginBtn.disabled = false;
          loginBtn.textContent = 'Войти';
        }
      });
    });
    
    socket.on('connect_error', () => {
      showError('Не удалось подключиться к серверу');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Войти';
    });
  };
  
  loginBtn.onclick = handleLogin;
  registerBtn.onclick = () => renderRegister();
  
  nicknameInput.onkeypress = (e) => {
    if (e.key === 'Enter') handleLogin();
  };
  passwordInput.onkeypress = (e) => {
    if (e.key === 'Enter') handleLogin();
  };
  
  nicknameInput.focus();
}

// ========== СТРАНИЦА РЕГИСТРАЦИИ ==========
function renderRegister() {
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-logo">⚛️</div>
        <h1>Создать аккаунт</h1>
        <p class="login-subtitle">Присоединяйся к атомному штабу</p>
        
        <input type="text" id="reg-nickname" class="login-input" placeholder="Никнейм" autocomplete="off">
        <input type="password" id="reg-password" class="login-input" placeholder="Пароль" autocomplete="off">
        <input type="password" id="reg-confirm" class="login-input" placeholder="Подтвердите пароль" autocomplete="off">
        
        <button id="do-register-btn" class="login-button">Зарегистрироваться</button>
        <button id="back-to-login-btn" class="login-button secondary">← Назад к входу</button>
        
        <div id="reg-error" class="error-msg"></div>
      </div>
    </div>
  `;
  
  const nicknameInput = document.getElementById('reg-nickname');
  const passwordInput = document.getElementById('reg-password');
  const confirmInput = document.getElementById('reg-confirm');
  const registerBtn = document.getElementById('do-register-btn');
  const backBtn = document.getElementById('back-to-login-btn');
  const errorDiv = document.getElementById('reg-error');
  
  const showError = (msg) => {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 3000);
  };
  
  const handleRegister = async () => {
    const nickname = nicknameInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;
    
    if (nickname.length < 2) {
      showError('Никнейм минимум 2 символа');
      return;
    }
    
    if (password.length < 4) {
      showError('Пароль минимум 4 символа');
      return;
    }
    
    if (password !== confirm) {
      showError('Пароли не совпадают');
      return;
    }
    
    registerBtn.disabled = true;
    registerBtn.textContent = '⏳ Регистрация...';
    errorDiv.style.display = 'none';
    
    if (socket) socket.disconnect();
    
    socket = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true
    });
    
    socket.on('connect', () => {
      socket.emit('register', { nickname, password }, (response) => {
        if (response && response.success) {
          currentUser = { nickname, userId: response.userId };
          saveUser({ nickname });
          renderMainApp();
        } else {
          showError(response?.error || 'Ошибка регистрации');
          registerBtn.disabled = false;
          registerBtn.textContent = 'Зарегистрироваться';
        }
      });
    });
    
    socket.on('connect_error', () => {
      showError('Не удалось подключиться к серверу');
      registerBtn.disabled = false;
      registerBtn.textContent = 'Зарегистрироваться';
    });
  };
  
  registerBtn.onclick = handleRegister;
  backBtn.onclick = renderLogin;
  
  nicknameInput.onkeypress = (e) => {
    if (e.key === 'Enter') handleRegister();
  };
  passwordInput.onkeypress = (e) => {
    if (e.key === 'Enter') handleRegister();
  };
  confirmInput.onkeypress = (e) => {
    if (e.key === 'Enter') handleRegister();
  };
  
  nicknameInput.focus();
}

// ========== ОСНОВНОЕ ПРИЛОЖЕНИЕ ==========
function renderMainApp() {
  app.innerHTML = `
    <div style="display:flex; height:100vh;">
      <div style="width:260px; background:#1a1a2a; border-right:1px solid #2a2a3a; display:flex; flex-direction:column;">
        <div style="padding:20px; border-bottom:1px solid #2a2a3a;">
          <div style="font-size:20px; font-weight:bold;">⚛️ AtomCord</div>
          <div style="font-size:12px; color:#888; margin-top:8px;">${escapeHtml(currentUser.nickname)}</div>
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
  
  function loadMessages(channelId) {
    socket.emit('join-text-channel', channelId);
  }
  
  // Получение сообщений
  socket.on('channel-history', ({ channelId, messages }) => {
    if (currentChannel === channelId) {
      const container = document.getElementById('messages-container');
      if (messages.length === 0) {
        container.innerHTML = '<div style="color:#888; text-align:center;">Нет сообщений. Напишите первым!</div>';
      } else {
        container.innerHTML = messages.map(msg => `
          <div style="margin-bottom:12px;">
            <strong style="color:#b392f0;">${escapeHtml(msg.nickname)}</strong>
            <span style="margin-left:8px;">${escapeHtml(msg.text)}</span>
          </div>
        `).join('');
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
  
  loadMessages('general');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ========== ЗАПУСК ==========
const savedUser = getSavedUser();
if (savedUser && savedUser.nickname) {
  currentUser = savedUser;
  renderMainApp();
} else {
  renderLogin();
}