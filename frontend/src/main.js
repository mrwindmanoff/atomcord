import { io } from 'socket.io-client';

const SERVER_URL = 'https://atomcord-backend.onrender.com';

let currentUser = null;
let socket = null;
let currentServer = null;
let currentChannel = null;
let servers = [];
let messagesCache = {};
let voiceStream = null;
let peerConnections = new Map();

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

// ========== СТРАНИЦА ВХОДА ==========
function renderLogin() {
  app.innerHTML = `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-logo">
          <span class="logo-atom">⚛️</span>
          <span class="logo-text">AtomCord</span>
        </div>
        <p class="login-subtitle">Голосовой штаб нового поколения</p>
        <input type="text" id="nickname" class="login-input" placeholder="Никнейм" autocomplete="off">
        <input type="password" id="password" class="login-input" placeholder="Пароль" autocomplete="off">
        <button id="login-btn" class="login-button">Войти</button>
        <button id="go-to-register-btn" class="login-button secondary">📝 Создать аккаунт</button>
        <div id="error" class="error-msg"></div>
      </div>
    </div>
  `;
  
  const nicknameInput = document.getElementById('nickname');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');
  const registerBtn = document.getElementById('go-to-register-btn');
  const errorDiv = document.getElementById('error');
  
  if (nicknameInput) nicknameInput.focus();
  
  const showError = (msg) => {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 3000);
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
          saveUser({ nickname, password });
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
  
  loginBtn.onclick = handleLogin;
  registerBtn.onclick = () => renderRegister();
  nicknameInput.onkeypress = (e) => e.key === 'Enter' && handleLogin();
  passwordInput.onkeypress = (e) => e.key === 'Enter' && handleLogin();
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
        <button id="back-to-login-btn" class="login-button secondary">← Назад к входу</button>
        <div id="error" class="error-msg"></div>
      </div>
    </div>
  `;
  
  const nicknameInput = document.getElementById('reg-nickname');
  const passwordInput = document.getElementById('reg-password');
  const confirmInput = document.getElementById('reg-confirm');
  const registerBtn = document.getElementById('register-btn');
  const backBtn = document.getElementById('back-to-login-btn');
  const errorDiv = document.getElementById('error');
  
  if (nicknameInput) nicknameInput.focus();
  
  const showError = (msg) => {
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';
    setTimeout(() => errorDiv.style.display = 'none', 3000);
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
          saveUser({ nickname, password });
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

// ========== ОСНОВНОЕ ПРИЛОЖЕНИЕ ==========
function initApp() {
  socket.emit('get-servers', (serversList) => {
    servers = serversList || [];
    if (servers.length > 0) {
      selectServer(servers[0].id);
    } else {
      renderMainUI();
    }
  });
  
  setupSocketEvents();
  setupVoiceEvents();
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

function setupVoiceEvents() {
  socket.on('user-joined-voice', ({ socketId, nickname }) => {
    if (voiceStream && socketId !== socket.id) {
      createPeerConnection(socketId);
    }
  });
  
  socket.on('user-left-voice', ({ socketId }) => {
    const pc = peerConnections.get(socketId);
    if (pc) {
      pc.close();
      peerConnections.delete(socketId);
    }
  });
  
  socket.on('voice-offer', async ({ fromId, offer }) => {
    if (voiceStream) {
      await handleOffer(fromId, offer);
    }
  });
  
  socket.on('voice-answer', async ({ fromId, answer }) => {
    const pc = peerConnections.get(fromId);
    if (pc) {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  });
  
  socket.on('voice-ice-candidate', async ({ fromId, candidate }) => {
    const pc = peerConnections.get(fromId);
    if (pc) {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    }
  });
}

async function createPeerConnection(targetId) {
  const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };
  
  const pc = new RTCPeerConnection(configuration);
  peerConnections.set(targetId, pc);
  
  if (voiceStream) {
    voiceStream.getTracks().forEach(track => {
      pc.addTrack(track, voiceStream);
    });
  }
  
  pc.ontrack = (event) => {
    const audio = new Audio();
    audio.srcObject = event.streams[0];
    audio.autoplay = true;
  };
  
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('voice-ice-candidate', { targetId, candidate: event.candidate });
    }
  };
  
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  socket.emit('voice-offer', { targetId, offer });
}

async function handleOffer(fromId, offer) {
  const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };
  
  const pc = new RTCPeerConnection(configuration);
  peerConnections.set(fromId, pc);
  
  if (voiceStream) {
    voiceStream.getTracks().forEach(track => {
      pc.addTrack(track, voiceStream);
    });
  }
  
  pc.ontrack = (event) => {
    const audio = new Audio();
    audio.srcObject = event.streams[0];
    audio.autoplay = true;
  };
  
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('voice-ice-candidate', { targetId: fromId, candidate: event.candidate });
    }
  };
  
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  socket.emit('voice-answer', { targetId: fromId, answer });
}

async function joinVoiceChannel() {
  try {
    voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    socket.emit('join-voice', { channelId: currentChannel.id });
    alert('Подключено к голосовому каналу');
  } catch (err) {
    console.error('Microphone error:', err);
    alert('Не удалось получить доступ к микрофону');
  }
}

function leaveVoiceChannel() {
  if (voiceStream) {
    voiceStream.getTracks().forEach(track => track.stop());
    voiceStream = null;
  }
  peerConnections.forEach(pc => pc.close());
  peerConnections.clear();
  socket.emit('leave-voice', { channelId: currentChannel.id });
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
  if (!input) return;
  const text = input.value.trim();
  if (text && currentChannel?.type === 'text') {
    socket.emit('send-message', { channelId: currentChannel.id, text });
    input.value = '';
    input.focus();
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
        <strong>${escapeHtml(msg.nickname)}</strong>
        <span>${escapeHtml(msg.text)}</span>
      </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
  }
}

function appendMessage(message) {
  const container = document.getElementById('messages-container');
  if (!container) return;
  const msgDiv = document.createElement('div');
  msgDiv.className = 'message';
  msgDiv.innerHTML = `<strong>${escapeHtml(message.nickname)}</strong> <span>${escapeHtml(message.text)}</span>`;
  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

function renderMainUI() {
  app.innerHTML = `
    <div class="main-layout">
      <div class="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <span class="logo-atom">⚛️</span>
            <span class="logo-text">AtomCord</span>
          </div>
          <button id="create-server-btn" class="icon-btn" title="Создать сервер">+</button>
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
            <button id="create-channel-btn" class="icon-btn small" title="Создать канал">+</button>
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
          <button id="logout-btn" class="logout-btn">🚪</button>
        </div>
      </div>
      
      <div class="main-content">
        <div class="chat-header">
          <h2>${currentChannel ? (currentChannel.type === 'voice' ? '🎙️' : '#') + ' ' + escapeHtml(currentChannel.name) : 'Выберите канал'}</h2>
        </div>
        
        <div class="messages-container" id="messages-container">
          <div class="empty-messages">Загрузка...</div>
        </div>
        
        ${currentChannel?.type === 'text' ? `
          <div class="message-input-area">
            <input type="text" id="message-input" class="message-input" placeholder="Введите сообщение..." autocomplete="off">
            <button id="send-btn" class="send-btn">📤</button>
          </div>
        ` : currentChannel?.type === 'voice' ? `
          <div class="voice-placeholder">
            <div class="voice-icon">🎙️</div>
            <h3>Голосовой канал</h3>
            <button id="voice-connect-btn" class="voice-btn">Подключиться</button>
            <button id="voice-leave-btn" class="voice-btn leave" style="display:none;">Отключиться</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
  
  // Обработчики серверов
  document.querySelectorAll('.server').forEach(el => {
    el.onclick = () => selectServer(el.dataset.serverId);
  });
  
  // Обработчики каналов
  document.querySelectorAll('.channel').forEach(el => {
    el.onclick = () => selectChannel(el.dataset.channelId);
  });
  
  // Кнопки
  document.getElementById('create-server-btn')?.addEventListener('click', createServer);
  document.getElementById('create-channel-btn')?.addEventListener('click', createChannel);
  
  document.getElementById('logout-btn')?.addEventListener('click', () => {
    if (socket) socket.disconnect();
    clearSavedUser();
    renderLogin();
  });
  
  // Отправка сообщений
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  if (messageInput && sendBtn) {
    sendBtn.onclick = sendMessage;
    messageInput.onkeypress = (e) => {
      if (e.key === 'Enter') sendMessage();
    };
    setTimeout(() => messageInput.focus(), 100);
  }
  
  // Голос
  const voiceConnectBtn = document.getElementById('voice-connect-btn');
  const voiceLeaveBtn = document.getElementById('voice-leave-btn');
  if (voiceConnectBtn) {
    voiceConnectBtn.onclick = () => {
      joinVoiceChannel();
      voiceConnectBtn.style.display = 'none';
      if (voiceLeaveBtn) voiceLeaveBtn.style.display = 'block';
    };
  }
  if (voiceLeaveBtn) {
    voiceLeaveBtn.onclick = () => {
      leaveVoiceChannel();
      voiceLeaveBtn.style.display = 'none';
      if (voiceConnectBtn) voiceConnectBtn.style.display = 'block';
    };
  }
  
  if (currentChannel?.type === 'text') {
    renderMessages();
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