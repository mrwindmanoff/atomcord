import { Sidebar } from '../components/Sidebar.js';
import { ChatArea } from '../components/ChatArea.js';
import { VoicePanel } from '../components/VoicePanel.js';
import { UserList } from '../components/UserList.js';

export const MainApp = {
  render(container, socket, currentUser, onLogout) {
    let currentChannel = { id: 'general', name: 'Общий', type: 'text' };
    let messagesCache = {};
    let onlineUsers = [];
    let channels = [
      { id: 'general', name: 'Общий', type: 'text' },
      { id: 'random', name: 'Случайный', type: 'text' },
      { id: 'voice-lobby', name: 'Главный штаб', type: 'voice' }
    ];
    
    // Функция отрисовки интерфейса
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
      
      // Sidebar
      const sidebarContainer = container.querySelector('.sidebar-container');
      Sidebar.render(sidebarContainer, channels, currentChannel.id, onChannelChange, socket);
      
      // ChatArea (только для текстовых каналов)
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
      
      // VoicePanel (только для голосовых каналов)
      const voicePanelContainer = container.querySelector('.voice-panel-container');
      if (currentChannel.type === 'voice') {
        VoicePanel.render(voicePanelContainer, currentChannel, socket);
      } else {
        voicePanelContainer.innerHTML = '';
      }
      
      // UserList
      const userlistContainer = container.querySelector('.userlist-container');
      UserList.render(userlistContainer, onlineUsers);
      
      // Кнопка выхода
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', onLogout);
      }
      
      // Если текстовый канал - запрашиваем историю
      if (currentChannel.type === 'text') {
        socket.emit('join-text-channel', currentChannel.id);
      }
    }
    
    // Смена канала
    function onChannelChange(channelId) {
      const channel = channels.find(c => c.id === channelId);
      if (channel) {
        currentChannel = channel;
        renderUI();
      }
    }
    
    // Настройка сокет событий
    function setupSocketEvents() {
      // Получение списка каналов
      socket.on('channels-list', (channelsList) => {
        channels = channelsList;
        renderUI();
      });
      
      // Создание нового канала
      socket.on('channel-created', (newChannel) => {
        channels.push(newChannel);
        renderUI();
      });
      
      // Удаление канала
      socket.on('channel-deleted', ({ channelId }) => {
        channels = channels.filter(c => c.id !== channelId);
        if (currentChannel.id === channelId) {
          const defaultChannel = channels.find(c => c.type === 'text');
          if (defaultChannel) currentChannel = defaultChannel;
        }
        renderUI();
      });
      
      // Получение истории сообщений
      socket.on('channel-history', ({ channelId, messages }) => {
        messagesCache[channelId] = messages;
        if (currentChannel.id === channelId && currentChannel.type === 'text') {
          const chatAreaContainer = container.querySelector('.chat-area-container');
          ChatArea.render(chatAreaContainer, currentChannel, messages, socket);
        }
      });
      
      // Новое сообщение
      socket.on('new-message', (message) => {
        if (!messagesCache[message.channelId]) {
          messagesCache[message.channelId] = [];
        }
        messagesCache[message.channelId].push(message);
        
        if (currentChannel.id === message.channelId && currentChannel.type === 'text') {
          ChatArea.appendMessage(message);
        }
      });
      
      // Список пользователей онлайн
      socket.on('users-list', (users) => {
        onlineUsers = users;
        const userlistContainer = container.querySelector('.userlist-container');
        if (userlistContainer) {
          UserList.render(userlistContainer, onlineUsers);
        }
      });
      
      // Пользователь присоединился
      socket.on('user-joined', ({ nickname }) => {
        const chatAreaContainer = container.querySelector('.chat-area-container');
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
      
      // Пользователь вышел
      socket.on('user-left', ({ nickname }) => {
        const chatAreaContainer = container.querySelector('.chat-area-container');
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
      
      // Ошибки
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    }
    
    // Функция escapeHtml для защиты от XSS
    function escapeHtml(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }
    
    // Запрашиваем начальные данные
    socket.emit('get-channels');
    socket.emit('get-users');
    
    // Настраиваем обработчики событий
    setupSocketEvents();
    
    // Отрисовываем интерфейс
    renderUI();
    
    // Возвращаем функцию очистки (опционально)
    return () => {
      socket.off('channels-list');
      socket.off('channel-created');
      socket.off('channel-deleted');
      socket.off('channel-history');
      socket.off('new-message');
      socket.off('users-list');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('error');
    };
  }
};