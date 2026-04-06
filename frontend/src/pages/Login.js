export const LoginPage = {
  render(container, onLogin) {
    // Проверяем сохранённого пользователя
    const savedUser = localStorage.getItem('atomcord_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user.nickname && user.socketId) {
          onLogin(user.nickname, user.socketId);
          return;
        }
      } catch(e) {}
    }
    
    container.innerHTML = `
      <div class="login-screen">
        <div class="login-card">
          <div class="login-logo">
            <span class="logo-atom">⚛️</span>
            <span class="logo-text">AtomCord</span>
          </div>
          <p class="login-subtitle">Голосовой штаб нового поколения</p>
          <input type="text" id="nickname" class="login-input" placeholder="Твой позывной" autocomplete="off">
          <button id="login-btn" class="login-button">Войти</button>
          <div id="error-msg" style="color:#ed4245; margin-top:12px; font-size:12px; display:none;"></div>
        </div>
      </div>
    `;
    
    const input = document.getElementById('nickname');
    const btn = document.getElementById('login-btn');
    const errorDiv = document.getElementById('error-msg');
    
    let loading = false;
    
    const login = async () => {
      if (loading) return;
      
      const nickname = input.value.trim();
      if (nickname.length < 2) {
        errorDiv.textContent = 'Минимум 2 символа';
        errorDiv.style.display = 'block';
        return;
      }
      
      loading = true;
      btn.disabled = true;
      btn.textContent = '⏳ Подключение...';
      errorDiv.style.display = 'none';
      
      try {
        await onLogin(nickname);
      } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Войти';
        loading = false;
      }
    };
    
    btn.addEventListener('click', login);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') login();
    });
    
    input.focus();
  }
};