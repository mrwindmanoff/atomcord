export const Sidebar = {
  render(container, servers, currentServer, currentChannel, currentUser, onServerClick, onChannelClick, socket) {
    // Если нет серверов — показываем пустое состояние
    if (!servers || servers.length === 0) {
      container.innerHTML = `
        <div class="sidebar">
          <div class="sidebar-header">
            <div class="logo">
              <span class="logo-atom">⚛️</span>
              <span class="logo-text">AtomCord</span>
            </div>
            <button id="create-server-btn" class="add-channel-btn" title="Создать сервер">+</button>
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
          const name = prompt('Введите название сервера:');
          if (name && name.trim()) {
            socket.emit('create-server', { name: name.trim() }, (response) => {
              if (response.success) {
                location.reload();
              } else {
                alert(response.error);
              }
            });
          }
        });
      }
      return;
    }
    
    // Отрисовка с серверами
    container.innerHTML = `
      <div class="sidebar">
        <div class="sidebar-header">
          <div class="logo">
            <span class="logo-atom">⚛️</span>
            <span class="logo-text">AtomCord</span>
          </div>
          <button id="create-server-btn" class="add-channel-btn" title="Создать сервер">+</button>
        </div>
        
        <!-- Список серверов -->
        <div class="servers-list">
          ${servers.map(server => `
            <div class="server ${currentServer?.id === server.id ? 'active' : ''}" data-server-id="${server.id}">
              <div class="server-icon">${escapeHtml(server.name.charAt(0).toUpperCase())}</div>
              <div class="server-name">${escapeHtml(server.name)}</div>
            </div>
          `).join('')}
        </div>
        
        ${currentServer ? `
          <!-- Каналы текущего сервера -->
          <div class="channels-header">
            <span>КАНАЛЫ</span>
            <button id="create-channel-btn" class="category-add-btn" title="Создать канал">+</button>
          </div>
          <div class="channels-list">
            ${currentServer.channels?.map(ch => `
              <div class="channel ${currentChannel?.id === ch.id ? 'active' : ''}" data-channel-id="${ch.id}" data-channel-type="${ch.type}">
                <span class="channel-icon">${ch.type === 'voice' ? '🎙️' : '#'}</span>
                <span class="channel-name">${escapeHtml(ch.name)}</span>
              </div>
            `).join('')}
          </div>
          
          <!-- Секция инвайтов (только для владельца) -->
          ${currentServer.ownerId === currentUser?.id ? `
            <div class="invite-section">
              <button id="create-invite-btn" class="invite-button">
                📎 Создать приглашение
              </button>
            </div>
          ` : ''}
        ` : ''}
      </div>
    `;
    
    // === ОБРАБОТЧИКИ СОБЫТИЙ ===
    
    // Клик по серверу
    container.querySelectorAll('.server').forEach(el => {
      el.addEventListener('click', () => {
        const serverId = el.dataset.serverId;
        onServerClick(serverId);
      });
    });
    
    // Клик по каналу
    container.querySelectorAll('.channel').forEach(el => {
      el.addEventListener('click', () => {
        const channelId = el.dataset.channelId;
        const channelType = el.dataset.channelType;
        onChannelClick(channelId, channelType);
      });
    });
    
    // Создание сервера (кнопка в хедере)
    const createServerBtn = document.getElementById('create-server-btn');
    if (createServerBtn) {
      createServerBtn.addEventListener('click', () => {
        const name = prompt('Введите название сервера:');
        if (name && name.trim()) {
          socket.emit('create-server', { name: name.trim() }, (response) => {
            if (response.success) {
              location.reload();
            } else {
              alert(response.error);
            }
          });
        }
      });
    }
    
    // Создание канала
    const createChannelBtn = document.getElementById('create-channel-btn');
    if (createChannelBtn && currentServer) {
      createChannelBtn.addEventListener('click', () => {
        const type = confirm('Создать голосовой канал? (OK - голосовой, Отмена - текстовый)') ? 'voice' : 'text';
        const name = prompt('Введите название канала:');
        if (name && name.trim()) {
          socket.emit('create-channel', {
            serverId: currentServer.id,
            name: name.trim(),
            type: type
          }, (response) => {
            if (!response.success) {
              alert(response.error);
            }
          });
        }
      });
    }
    
    // Создание инвайта
    const createInviteBtn = document.getElementById('create-invite-btn');
    if (createInviteBtn && currentServer) {
      createInviteBtn.addEventListener('click', () => {
        const maxUses = prompt('Максимум использований (0 - безлимит):', '0');
        const days = prompt('Срок действия (дней):', '7');
        
        socket.emit('create-invite', {
          serverId: currentServer.id,
          maxUses: parseInt(maxUses) || 0,
          expiresInHours: (parseInt(days) || 7) * 24
        }, (response) => {
          if (response.success) {
            navigator.clipboard.writeText(response.inviteUrl);
            alert(`✅ Ссылка-приглашение скопирована!\n\n${response.inviteUrl}\n\n⚠️ Никому не давай эту ссылку, если не хочешь посторонних в сервере!`);
          } else {
            alert(response.error);
          }
        });
      });
    }
  }
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}