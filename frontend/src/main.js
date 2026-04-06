import { io } from 'socket.io-client';

const SERVER_URL = 'https://atomcord-backend.onrender.com';

let currentUser = null;
let socket = null;
let currentServer = null;
let currentChannel = null;
let servers = [];
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

// ========== СТРАНИЦА ВХОДА ==========
function renderLogin() {
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-logo">⚛️</div>
        <h1>AtomCord</h1>
        <p class="login-subtitle">Голосовой штаб нового поколения</p>
        
        <input type="text" id="login-nickname" class="login-input" placeholder="Никнейм">
        <input type="password" id="login-password" class="login-input" placeholder="Пароль">
        
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
  
  const handleLogin = () => {
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
    
    if (socket) socket.disconnect();
    
    socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    
    socket.on('connect', () => {
      socket.emit('login', { nickname, password }, (response) => {
        if (response?.success) {
          currentUser = { nickname, userId: response.userId };
          saveUser({ nickname });
          initApp();
        } else {
          showError(response?.error || 'Ошибка входа');
          loginBtn.disabled = false;
          loginBtn.textContent = 'Войти';
        }
      });
    });
    
    socket.on('connect_error', () => {
      showError('Сервер не отвечает');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Войти';
    });
  };
  
  const goToRegister = () => {
    renderRegister();
  };
  
  loginBtn.onclick = handleLogin;
  registerBtn.onclick = goToRegister;
  nicknameInput.onkeypress = (e) => e.key === 'Enter' && handleLogin();
  passwordInput.onkeypress = (e) => e.key === 'Enter' && handleLogin();
}

// ========== СТРАНИЦА РЕГИСТРАЦИИ ==========
function renderRegister() {
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-logo">⚛️</div>
        <h1>Регистрация</h1>
        <p class="login-subtitle">Создай аккаунт</p>
        
        <input type="text" id="reg-nickname" class="login-input" placeholder="Никнейм">
        <input type="password" id="reg-password" class="login-input" placeholder="Пароль">
        <input type="password" id="reg-confirm" class="login-input" placeholder="Подтвердите пароль">
        
        <button id="do-register-btn" class="login-button">Зарегистрироваться</button>
        <button id="back-to-login-btn" class="login-button secondary">← Назад</button>
        
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
  
  const handleRegister = () => {
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
    
    if (socket) socket.disconnect();
    
    socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    
    socket.on('connect', () => {
      socket.emit('register', { nickname, password }, (response) => {
        if (response?.success) {
          currentUser = { nickname, userId: response.userId };
          saveUser({ nickname });
          initApp();
        } else {
          showError(response?.error || 'Ошибка регистрации');
          registerBtn.disabled = false;
          registerBtn.textContent = 'Зарегистрироваться';
        }
      });
    });
    
    socket.on('connect_error', () => {
      showError('Сервер не отвечает');
      registerBtn.disabled = false;
      registerBtn.textContent = 'Зарегистрироваться';
    });
  };
  
  registerBtn.onclick = handleRegister;
  backBtn.onclick = renderLogin;
  nicknameInput.onkeypress = (e) => e.key === 'Enter' && handleRegister();
  passwordInput.onkeypress = (e) => e.key === 'Enter' && handleRegister();
  confirmInput.onkeypress = (e) => e.key === 'Enter' && handleRegister();
}

// ========== ОСНОВНОЕ ПРИЛОЖЕНИЕ (с серверами) ==========
function initApp() {
  // Загружаем сервера
  socket.emit('get-servers', (serversList) => {
    servers = serversList || [];
    if (servers.length > 0) {
      selectServer(servers[0].id);
    } else {
      renderMainUI();
    }
  });
  
  setupSocketEvents();
}

function setupSocketEvents() {
  socket.on('server-created', (newServer) => {
    servers.push(newServer);
    renderMainUI();
  });
  
  socket.on('server-channels', (channels) => {
    if (currentServer) {
      currentServer.channels = channels;
      if (channels.length > 0 && !currentChannel) {
        currentChannel = channels[0];
      }
      renderMainUI();
    }
  });
  
  socket.on('channel-created', (newChannel) => {
    if (currentServer && newChannel.serverId === currentServer.id) {
      if (!currentServer.channels) currentServer.channels = [];
      currentServer.channels.push(newChannel);
      renderMainUI();
    }
  });
  
  socket.on('channel-history', ({ channelId, messages }) => {
    messagesCache[channelId] = messages;
    if (currentChannel?.id === channelId) {
      renderMessages();
    }
  });
  
  socket.on('new-message', (message) => {
    if (!messagesCache[message.channelId]) messagesCache[message.channelId] = [];
    messagesCache[message.channelId].push(message);
    if (currentChannel?.id === message.channelId) {
      appendMessage(message);
    }
  });
}

function selectServer(serverId) {
  currentServer = servers.find(s => s.id === serverId);
  if (currentServer) {
    socket.emit('join-server', { serverId: currentServer.id });
  }
}

function selectChannel(channelId) {
  currentChannel = currentServer?.channels?.find(c => c.id === channelId);
  if (currentChannel?.type === 'text') {
    socket.emit('join-text-channel', currentChannel.id);
  }
  renderMainUI();
}

function createServer() {
  const name = prompt('Название сервера:');
  if (name?.trim()) {
    socket.emit('create-server', { name: name.trim() });
  }
}

function createChannel() {
  const type = confirm('Голосовой канал? OK - да, Отмена - текстовый') ? 'voice' : 'text';
  const name = prompt('Название канала:');
  if (name?.trim() && currentServer) {
    socket.emit('create-channel', {
      serverId: currentServer.id,
      name: name.trim(),
      type: type
    });
  }
}

function sendMessage() {
  const input = document.getElementById('message-input');
  const text = input?.value.trim();
  if (text && currentChannel?.type === 'text') {
    socket.emit('send-message', {
      channelId: currentChannel.id,
      text: text
    });
    input.value = '';
  }
}

function renderMessages() {
  const container = document.getElementById('messages-container');
  if (!container) return;
  
  const messages = messagesCache[currentChannel?.id] || [];
  if (messages.length === 0) {
    container.innerHTML = '<div class="empty-messages">Нет сообщений. Напишите первым!</div>';
  } else {
    container.innerHTML = messages.map(msg => `
      <div class="message">
        <strong style="color:#b392f0;">${escapeHtml(msg.nickname)}</strong>
        <span>${escapeHtml(msg.text)}</span>
      </div>
    `).join('');
  }
  container.scrollTop = container.scrollHeight;
}

function appendMessage(message) {
  const container = document.getElementById('messages-container');
  if (!container) return;
  
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message';
  msgDiv.innerHTML = `<strong style="color:#b392f0;">${escapeHtml(message.nickname)}</strong> <span>${escapeHtml(message.text)}</span>`;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function renderMainUI() {
  app.innerHTML = `
    <div class="main-layout">
      <!-- Сайдбар -->
      <div class="sidebar">
        <div class="sidebar-header">
          <div class="logo">⚛️ AtomCord</div>
          <button class="icon-btn" id="create-server-btn" title="Создать сервер">+</button>
        </div>
        
        <div class="servers-list">
          ${servers.map(server => `
            <div class="server ${currentServer?.id === server.id ? 'active' : ''}" data-server-id="${server.id}">
              <div class="server-icon">${server.name.charAt(0).toUpperCase()}</div>
              <div class="server-name">${escapeHtml(server.name)}</div>
            </div>
          `).join('')}
        </div>
        
        ${currentServer ? `
          <div class="channels-header">
            <span>КАНАЛЫ</span>
            <button class="icon-btn small" id="create-channel-btn" title="Создать канал">+</button>
          </div>
          <div class="channels-list">
            ${currentServer.channels?.map(ch => `
              <div class="channel ${currentChannel?.id === ch.id ? 'active' : ''}" data-channel-id="${ch.id}" data-channel-type="${ch.type}">
                <span class="channel-icon">${ch.type === 'voice' ? '🎙️' : '#'}</span>
                <span class="channel-name">${escapeHtml(ch.name)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
        
        <div class="user-info">
          <span>👤 ${escapeHtml(currentUser.nickname)}</span>
          <button id="logout-btn" class="logout-btn" title="Выйти">🚪</button>
        </div>
      </div>
      
      <!-- Основная область -->
      <div class="main-content">
        <div class="chat-header">
          <h2>${currentChannel ? (currentChannel.type === 'voice' ? '🎙️' : '#') + ' ' + escapeHtml(currentChannel.name) : 'Выберите канал'}</h2>
        </div>
        
        <div class="messages-container" id="messages-container">
          <div class="empty-messages">Выберите канал</div>
        </div>
        
        ${currentChannel?.type === 'text' ? `
          <div class="message-input-area">
            <input type="text" id="message-input" class="message-input" placeholder="Введите сообщение...">
            <button id="send-btn" class="send-btn">📤</button>
          </div>
        ` : currentChannel?.type === 'voice' ? `
          <div class="voice-placeholder">
            <div class="voice-icon">🎙️</div>
            <h3>Голосовой канал</h3>
            <button id="voice-connect-btn" class="voice-btn">Подключиться</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  // Обработчики
  document.querySelectorAll('.server').forEach(el => {
    el.onclick = () => {
      selectServer(el.dataset.serverId);
    };
  });
  
  document.querySelectorAll('.channel').forEach(el => {
    el.onclick = () => {
      selectChannel(el.dataset.channelId);
    };
  });
  
  document.getElementById('create-server-btn')?.addEventListener('click', createServer);
  document.getElementById('create-channel-btn')?.addEventListener('click', createChannel);
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    socket.disconnect();
    clearSavedUser();
    renderLogin();
  });
  document.getElementById('send-btn')?.addEventListener('click', sendMessage);
  document.getElementById('message-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
  document.getElementById('voice-connect-btn')?.addEventListener('click', () => {
    alert('Голосовой чат в разработке');
  });
  
  if (currentChannel?.type === 'text') {
    renderMessages();
  }
}

function escapeHtml(str) {
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
        initApp();
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