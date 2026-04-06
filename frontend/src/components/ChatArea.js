import { MessageInput } from './MessageInput.js';

export const ChatArea = {
  currentChannelId: null,
  socket: null,
  
  render(container, channel, messages, socket) {
    this.socket = socket;
    this.currentChannelId = channel.id;
    
    if (channel.type !== 'text') {
      container.innerHTML = `
        <div class="voice-placeholder">
          <div class="voice-placeholder-icon">🎙️</div>
          <h3>Ты в голосовом канале</h3>
          <p>Нажми "Подключиться" чтобы начать разговор</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="chat-area">
        <div class="messages-container" id="messages-container">
          ${messages.map(msg => `
            <div class="message" data-message-id="${msg.id}">
              <span class="message-nickname" style="color: ${this.getColorForNickname(msg.nickname)}">${this.escapeHtml(msg.nickname)}</span>
              <span class="message-text">${this.escapeHtml(msg.text)}</span>
              <span class="message-time">${this.formatTime(msg.timestamp)}</span>
            </div>
          `).join('')}
        </div>
        <div class="message-input-container-wrapper" id="message-input-wrapper"></div>
      </div>
    `;
    
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    const inputWrapper = document.getElementById('message-input-wrapper');
    if (inputWrapper && socket) {
      MessageInput.render(inputWrapper, channel, socket);
    }
    
    this.setupSocketEvents();
  },
  
  setupSocketEvents() {
    if (!this.socket) return;
    
    // Убираем старые обработчики
    if (this._handlers) {
      Object.entries(this._handlers).forEach(([event, handler]) => {
        this.socket.off(event, handler);
      });
    }
    
    this._handlers = {
      'new-message': (message) => {
        if (message.channelId === this.currentChannelId) {
          this.appendMessage(message);
        }
      }
    };
    
    Object.entries(this._handlers).forEach(([event, handler]) => {
      this.socket.on(event, handler);
    });
  },
  
  appendMessage(message) {
    const container = document.getElementById('messages-container');
    if (!container) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'message';
    msgDiv.innerHTML = `
      <span class="message-nickname" style="color: ${this.getColorForNickname(message.nickname)}">${this.escapeHtml(message.nickname)}</span>
      <span class="message-text">${this.escapeHtml(message.text)}</span>
      <span class="message-time">${this.formatTime(message.timestamp)}</span>
    `;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
  },
  
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },
  
  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  },
  
  getColorForNickname(nickname) {
    const colors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245'];
    let hash = 0;
    for (let i = 0; i < nickname.length; i++) {
      hash = ((hash << 5) - hash) + nickname.charCodeAt(i);
      hash |= 0;
    }
    return colors[Math.abs(hash) % colors.length];
  }
};