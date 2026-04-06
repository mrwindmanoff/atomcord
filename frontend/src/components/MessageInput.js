export const MessageInput = {
  render(container, channel, socket) {
    if (channel.type !== 'text') {
      container.innerHTML = '';
      return;
    }
    
    container.innerHTML = `
      <div class="message-input-wrapper">
        <div class="message-input-container">
          <textarea 
            id="message-input-field" 
            class="message-input-field" 
            placeholder="Введи сообщение в #${channel.name}..."
            rows="1"
            maxlength="2000"
          ></textarea>
          <button id="message-send-btn" class="message-send-btn">📤</button>
        </div>
      </div>
    `;
    
    const textarea = document.getElementById('message-input-field');
    const sendBtn = document.getElementById('message-send-btn');
    
    const sendMessage = () => {
      const text = textarea.value.trim();
      if (!text) return;
      
      socket.emit('send-message', {
        channelId: channel.id,
        text: text
      });
      
      textarea.value = '';
      textarea.style.height = 'auto';
    };
    
    textarea.addEventListener('input', () => {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });
    
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    
    sendBtn.addEventListener('click', sendMessage);
    textarea.focus();
  }
};