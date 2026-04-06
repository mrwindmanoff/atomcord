import { Sidebar } from '../components/Sidebar.js';
import { ChatArea } from '../components/ChatArea.js';
import { VoicePanel } from '../components/VoicePanel.js';
import { UserList } from '../components/UserList.js';

export const MainApp = {
  render(container, socket, currentUser, onLogout) {
    // Защита от null socket
    if (!socket) {
      console.error('❌ Socket не инициализирован');
      container.innerHTML = '<div style="padding:20px; text-align:center;">Ошибка подключения. Перезагрузите страницу.</div>';
      return;
    }
    
    let currentChannel = { id: 'general', name: 'Общий', type: 'text' };
    let messagesCache = {};
    let onlineUsers = [];
    let channels = [
      { id: 'general', name: 'Общий', type: 'text' },
      { id: 'random', name: 'Случайный', type: 'text' },
      { id: 'voice-lobby', name: 'Главный штаб', type: 'voice' }
    ];
    
    function renderUI() {
      container.innerHTML = `
        <div class="sidebar-container"></div>
        <div class="main-container">
          <div class="chat-header">
            <h2>${currentChannel.type === 'voice' ? '🎙️' : '#'} ${currentChannel.name}</h2>
            <div class="chat-header-actions">
              <span style="font-size:12px; color:#888; margin-right:12px;">${escapeHtml(currentUser.nickname)}</span>
              <button id="logout-btn" class="logout-button" title="Выйти">🚪</button>
            </div>
          </div>
          <div class="chat-area-container"></div>
          <div class="voice-panel-container"></div>
        </div>
        <div class="userlist-container"></div>
      `;
      
      const sidebarContainer = container.querySelector('.sidebar-container');
      Sidebar.render(sidebarContainer, channels, currentChannel.id, onChannelChange, socket);
      
      const chatAreaContainer = container.querySelector('.chat-area-container');
      if (currentChannel.type === 'text') {
        ChatArea.render(chatAreaContainer, currentChannel, messagesCache[currentChannel.id] || [], socket);
      } else {
        chatAreaContainer.innerHTML = `
          <div class="voice-placeholder">
            <div class="voice-placeholder-icon">🎙️</div>
            <h3>Ты в голосовом канале</h3>
            <p>Нажми "Подключиться" чтобы начать разговор</p>
          </div>
        `;
      }
      
      const voicePanelContainer = container.querySelector('.voice-panel-container');
      if (currentChannel.type === 'voice') {
        VoicePanel.render(voicePanelContainer, currentChannel, socket);
      } else {
        voicePanelContainer.innerHTML = '';
      }
      
      const userlistContainer = container.querySelector('.userlist-container');
      UserList.render(userlistContainer, onlineUsers);
      
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', onLogout);
      }
      
      // Проверяем socket перед emit
      if (socket && currentChannel.type === 'text') {
        socket.emit('join-text-channel', currentChannel.id);
      }
    }
    
    function onChannelChange(channelId) {
      const channel = channels.find(c => c.id === channelId);
      if (channel) {
        currentChannel = channel;
        renderUI();
      }
    }
    
    function setupSocketEvents() {
      if (!socket) return;
      
      socket.on('channels-list', (channelsList) => {
        channels = channelsList;
        renderUI();
      });
      
      socket.on('channel-created', (newChannel) => {
        channels.push(newChannel);
        renderUI();
      });
      
      socket.on('channel-deleted', ({ channelId }) => {
        channels = channels.filter(c => c.id !== channelId);
        if (currentChannel.id === channelId) {
          currentChannel = channels.find(c => c.type === 'text') || channels[0];
        }
        renderUI();
      });
      
      socket.on('channel-history', ({ channelId, messages }) => {
        messagesCache[channelId] = messages;
        if (currentChannel.id === channelId && currentChannel.type === 'text') {
          const chatAreaContainer = document.querySelector('.chat-area-container');
          if (chatAreaContainer) {
            ChatArea.render(chatAreaContainer, currentChannel, messages, socket);
          }
        }
      });
      
      socket.on('new-message', (message) => {
        if (!messagesCache[message.channelId]) messagesCache[message.channelId] = [];
        messagesCache[message.channelId].push(message);
        if (currentChannel.id === message.channelId && currentChannel.type === 'text') {
          ChatArea.appendMessage(message);
        }
      });
      
      socket.on('users-list', (users) => {
        onlineUsers = users;
        const userlistContainer = document.querySelector('.userlist-container');
        if (userlistContainer) UserList.render(userlistContainer, onlineUsers);
      });
      
      socket.on('user-joined', ({ nickname }) => {
        const chatAreaContainer = document.querySelector('.chat-area-container');
        if (chatAreaContainer && currentChannel.type === 'text') {
          const sysDiv = document.createElement('div');
          sysDiv.className = 'system-message';
          sysDiv.textContent = `⚡ ${escapeHtml(nickname)} присоединился`;
          const messagesContainer = chatAreaContainer.querySelector('#messages-container');
          if (messagesContainer) {
            messagesContainer.appendChild(sysDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }
      });
      
      socket.on('user-left', ({ nickname }) => {
        const chatAreaContainer = document.querySelector('.chat-area-container');
        if (chatAreaContainer && currentChannel.type === 'text') {
          const sysDiv = document.createElement('div');
          sysDiv.className = 'system-message';
          sysDiv.textContent = `⚡ ${escapeHtml(nickname)} покинул`;
          const messagesContainer = chatAreaContainer.querySelector('#messages-container');
          if (messagesContainer) {
            messagesContainer.appendChild(sysDiv);
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }
      });
      
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    }
    
    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
    
    // Проверяем socket перед emit
    if (socket) {
      socket.emit('get-channels');
      socket.emit('get-users');
      setupSocketEvents();
    }
    
    renderUI();
  }
};