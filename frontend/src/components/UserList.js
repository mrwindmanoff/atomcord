export const UserList = {
  render(container, users) {
    if (!users || users.length === 0) {
      container.innerHTML = `
        <div class="userlist">
          <div class="userlist-header">ОНЛАЙН — 0</div>
          <div class="userlist-empty">Никого нет</div>
        </div>
      `;
      return;
    }
    
    container.innerHTML = `
      <div class="userlist">
        <div class="userlist-header">ОНЛАЙН — ${users.length}</div>
        <div class="userlist-items">
          ${users.map(user => `
            <div class="userlist-item">
              <span class="userlist-status"></span>
              <span class="userlist-name">${this.escapeHtml(user.nickname)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },
  
  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};