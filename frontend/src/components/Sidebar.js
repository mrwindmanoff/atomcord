export const Sidebar = {
  render(container, servers, currentServer, currentChannel, onServerClick, onChannelClick, socket) {
    if (!servers || servers.length === 0) {
      container.innerHTML = `
        <div class="sidebar">
          <div class="sidebar-header">
            <div class="logo">⚛️ AtomCord</div>
            <button id="create-server-btn" class="add-channel-btn">+</button>
          </div>
          <div class="servers-empty">
            <p>Нет серверов</p>
            <button id="create-server-empty" class="create-server-btn">Создать сервер</button>
          </div>
        </div>
      `;
      
      const createBtn = document.getElementById('create-server-btn') || document.getElementById('create-server-empty');
      if (createBtn) {
        createBtn.addEventListener('click', () => {
          const name = prompt('Название сервера:');
          if (name?.trim()) {
            socket.emit('create-server', { name: name.trim() }, (res) => {
              if (res.success) location.reload();
              else alert(res.error);
            });
          }
        });
      }
      return;
    }
    
    container.innerHTML = `
      <div class="sidebar">
        <div class="sidebar-header">
          <div class="logo">⚛️ AtomCord</div>
          <button id="create-server-btn" class="add-channel-btn">+</button>
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
            <button id="create-channel-btn" class="category-add-btn">+</button>
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
      </div>
    `;
    
    // Клик по серверу
    container.querySelectorAll('.server').forEach(el => {
      el.addEventListener('click', () => onServerClick(el.dataset.serverId));
    });
    
    // Клик по каналу
    container.querySelectorAll('.channel').forEach(el => {
      el.addEventListener('click', () => onChannelClick(el.dataset.channelId, el.dataset.channelType));
    });
    
    // Создание сервера
    document.getElementById('create-server-btn')?.addEventListener('click', () => {
      const name = prompt('Название сервера:');
      if (name?.trim()) {
        socket.emit('create-server', { name: name.trim() }, (res) => {
          if (!res.success) alert(res.error);
        });
      }
    });
    
    // Создание канала
    document.getElementById('create-channel-btn')?.addEventListener('click', () => {
      const type = confirm('Голосовой канал? OK - да, Отмена - текстовый') ? 'voice' : 'text';
      const name = prompt('Название канала:');
      if (name?.trim() && currentServer) {
        socket.emit('create-channel', { serverId: currentServer.id, name: name.trim(), type });
      }
    });
  }
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}