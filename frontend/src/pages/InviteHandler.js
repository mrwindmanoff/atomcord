export const InviteHandler = {
  render(container, code, onSuccess) {
    container.innerHTML = `
      <div class="login-screen">
        <div class="login-card">
          <div class="login-logo">⚛️</div>
          <h1>Присоединение к серверу</h1>
          <p id="invite-status" style="margin: 20px 0;">Проверка приглашения...</p>
          <div id="invite-actions" style="display: none;">
            <button id="join-btn" class="login-button">Присоединиться</button>
            <button id="cancel-btn" class="login-button secondary">Отмена</button>
          </div>
        </div>
      </div>
    `;
    
    const statusDiv = document.getElementById('invite-status');
    const actionsDiv = document.getElementById('invite-actions');
    
    // Проверяем инвайт через бекенд
    fetch(`https://atomcord-backend.onrender.com/api/invite/${code}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          statusDiv.textContent = `Приглашение в "${data.serverName}"`;
          actionsDiv.style.display = 'block';
          
          document.getElementById('join-btn').addEventListener('click', () => {
            onSuccess(code);
          });
          document.getElementById('cancel-btn').addEventListener('click', () => {
            window.location.href = '/';
          });
        } else {
          statusDiv.textContent = 'Приглашение недействительно или истекло';
          statusDiv.style.color = '#ed4245';
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      })
      .catch(() => {
        statusDiv.textContent = 'Ошибка проверки приглашения';
        statusDiv.style.color = '#ed4245';
      });
  }
};