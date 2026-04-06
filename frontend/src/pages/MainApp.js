import { Sidebar } from '../components/Sidebar.js';
import { ChatArea } from '../components/ChatArea.js';
import { VoicePanel } from '../components/VoicePanel.js';
import { UserList } from '../components/UserList.js';

export const MainApp = {
  render(container, socket, currentUser, onLogout) {
    let servers = [];
    let currentServer = null;
    let currentChannel = null;
    let messagesCache = {};
    let onlineUsers = [];
    
    function renderUI() {
      container.innerHTML = `
        <div class="sidebar-container"></div>
        <div class="main-container">
          <div class="chat-header">
            <h2>
              ${currentChannel?.type === 'voice' ? '🎙️' : '#'} 
              ${currentChannel?.name || 'Выберите канал'}
            </h2>
            <div class="chat-header-actions">
              <span style="font-size:12px; color:#888;">${currentUser.nickname}</span>
              <button id="logout-btn" class="logout-button" title="Выйти">🚪</button>
            </div>
          </div>
          <div class="chat-area-container"></div>
          <div class="voice-panel-container"></div>
        </div>
        <div class="userlist-container"></div>
      `;
      
      const sidebarContainer = container.querySelector('.sidebar-container');
      Sidebar.render(sidebarContainer, servers, currentServer, currentChannel, onServerClick, onChannelClick, socket);
      
      const chatAreaContainer = container.querySelector('.chat-area-container');
      if (currentChannel && currentChannel.type === 'text') {
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
      if (currentChannel && currentChannel.type === 'voice') {
        VoicePanel.render(voicePanelContainer, currentChannel, socket);
      } else {
        voicePanelContainer.innerHTML = '';
      }
      
      const userlistContainer = container.querySelector('.userlist-container');
      UserList.render(userlistContainer, onlineUsers);
      
      document.getElementById('logout-btn')?.addEventListener('click', onLogout);
      
      if (currentChannel && currentChannel.type === 'text') {
        socket.emit('join-text-channel', currentChannel.id);
      }
    }
    
    async function onServerClick(serverId) {
      currentServer = servers.find(s => s.id === serverId);
      if (currentServer) {
        socket.emit('join-server', { serverId });
        socket.emit('get-server-channels', { serverId }, (channels) => {
          currentServer.channels = channels;
          if (channels.length > 0) {
            currentChannel = channels[0];
          }
          renderUI();
        });
      }
    }
    
    function onChannelClick(channelId, channelType) {
      const channel = currentServer?.channels?.find(c => c.id === channelId);
      if (channel) {
        currentChannel = channel;
        renderUI();
      }
    }
    
    function setupSocketEvents() {
      socket.on('servers-list', (serversList) => {
        servers = serversList;
        if (servers.length > 0 && !currentServer) {
          onServerClick(servers[0].id);
        } else {
          renderUI();
        }
      });
      
      socket.on('server-created', (newServer) => {
        servers.push(newServer);
        renderUI();
      });
      
      socket.on('channel-created', (newChannel) => {
        if (currentServer && newChannel.serverId === currentServer.id) {
          if (!currentServer.channels) currentServer.channels = [];
          currentServer.channels.push(newChannel);
          renderUI();
        }
      });
      
      socket.on('channel-deleted', ({ channelId }) => {
        if (currentServer?.channels) {
          currentServer.channels = currentServer.channels.filter(c => c.id !== channelId);
          if (currentChannel?.id === channelId) {
            currentChannel = currentServer.channels[0];
          }
          renderUI();
        }
      });
      
      socket.on('channel-history', ({ channelId, messages }) => {
        messagesCache[channelId] = messages;
        if (currentChannel?.id === channelId) {
          const chatAreaContainer = document.querySelector('.chat-area-container');
          ChatArea.render(chatAreaContainer, currentChannel, messages, socket);
        }
      });
      
      socket.on('new-message', (message) => {
        if (!messagesCache[message.channelId]) messagesCache[message.channelId] = [];
        messagesCache[message.channelId].push(message);
        if (currentChannel?.id === message.channelId) {
          ChatArea.appendMessage(message);
        }
      });
      
      socket.on('users-list', (users) => {
        onlineUsers = users;
        const userlistContainer = document.querySelector('.userlist-container');
        if (userlistContainer) UserList.render(userlistContainer, onlineUsers);
      });
    }
    
    socket.emit('get-servers', (serversList) => {
      servers = serversList;
      if (servers.length > 0 && !currentServer) {
        onServerClick(servers[0].id);
      } else {
        renderUI();
      }
    });
    socket.emit('get-users');
    
    setupSocketEvents();
    renderUI();
  }
};