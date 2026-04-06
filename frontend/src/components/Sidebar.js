export const Sidebar = {
  render(container, channels, activeChannelId, onChannelClick, socket) {
    const textChannels = channels.filter(c => c.type === 'text');
    const voiceChannels = channels.filter(c => c.type === 'voice');
    
    container.innerHTML = `
      <div class="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <span class="logo-atom">⚛️</span>
            <span class="logo-text">AtomCord</span>
          </div>
        </div>
        <div class="channels">
          <div class="channel-category">
            <span>ТЕКСТОВЫЕ КАНАЛЫ</span>
            <button class="category-add-btn" data-type="text" title="Создать текстовый канал">+</button>
          </div>
          ${textChannels.map(ch => `
            <div class="channel ${activeChannelId === ch.id ? 'active' : ''}" data-channel-id="${ch.id}" data-channel-type="text">
              <span class="channel-icon">#</span>
              <span class="channel-name">${escapeHtml(ch.name)}</span>
              ${!isDefaultChannel(ch.id) ? `
                <button class="channel-delete" data-channel-id="${ch.id}" title="Удалить">🗑️</button>
              ` : ''}
            </div>
          `).join('')}
          
          <div class="channel-category">
            <span>ГОЛОСОВЫЕ КАНАЛЫ</span>
            <button class="category-add-btn" data-type="voice" title="Создать голосовой канал">+</button>
          </div>
          ${voiceChannels.map(ch => `
            <div class="channel channel-voice ${activeChannelId === ch.id ? 'active' : ''}" data-channel-id="${ch.id}" data-channel-type="voice">
              <span class="channel-icon">🎙️</span>
              <span class="channel-name">${escapeHtml(ch.name)}</span>
              ${!isDefaultChannel(ch.id) ? `
                <button class="channel-delete" data-channel-id="${ch.id}" title="Удалить">🗑️</button>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    // Клик по каналу
    container.querySelectorAll('.channel').forEach(el => {
      const deleteBtn = el.querySelector('.channel-delete');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const channelId = deleteBtn.dataset.channelId;
          if (confirm('Удалить канал?')) {
            socket.emit('delete-channel', { channelId });
          }
        });
      }
      
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('channel-delete')) return;
        const channelId = el.dataset.channelId;
        onChannelClick(channelId);
      });
    });
    
    // Создание канала (только через плюсики у категорий)
    container.querySelectorAll('.category-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const type = btn.dataset.type;
        const name = prompt(`Введите название ${type === 'text' ? 'текстового' : 'голосового'} канала:`);
        if (name && name.trim()) {
          socket.emit('create-channel', { name: name.trim(), type }, (response) => {
            if (!response.success) {
              alert(response.error);
            }
          });
        }
      });
    });
  }
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function isDefaultChannel(channelId) {
  const defaults = ['general', 'random', 'voice-lobby'];
  return defaults.includes(channelId);
}