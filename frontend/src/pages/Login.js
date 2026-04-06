export const LoginPage = {
  render(container, onLogin) {
    // Проверяем сохранённого пользователя
    const savedUser = localStorage.getItem('atomcord_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        if (user.nickname && user.token) {
          onLogin(user.nickname, user.password, user.token);
          return;
        }
      } catch(e) {}
    }
    
    let isLoginMode = true; // true = вход, false = регистрация
    
    function toggleMode() {
      isLoginMode = !isLoginMode;
      const title = document.getElementById('modal-title');
      const submitBtn = document.getElementById('submit-btn');
      const toggleBtn = document.getElementById('toggle-mode-btn');
      
      if (title) title.textContent = isLoginMode ? 'Вход в AtomCord' : 'Регистрация в AtomCord';
      if (submitBtn) submitBtn.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
      if (toggleBtn) toggleBtn.textContent = isLoginMode ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти';
    }
    
    container.innerHTML = `
      <div class="login-screen">
        <div class="login-card">
          <div class="login-logo">
            <span class="logo-atom">⚛️</span>
            <span class="logo-text">AtomCord</span>
          </div>
          <p class="login-subtitle">Голосовой штаб нового поколения</p>
          
          <input type="text" id="nickname" class="login-input" placeholder="Никнейм" autocomplete="off">
          <input type="password" id="password" class="login-input" placeholder="Пароль" autocomplete="off">
          
          <button id="submit-btn" class="login-button">Войти</button>
          <button id="toggle-mode-btn" class="login-button toggle">Нет аккаунта? Зарегистрироваться</button>
          
          <div id="error-msg" style="color:#ed4245; margin-top:12px; font-size:12px; display:none;"></div>
        </div>
      </div>
    `;
    
    const nicknameInput = document.getElementById('nickname');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submit-btn');
    const toggleBtn = document.getElementById('toggle-mode-btn');
    const errorDiv = document.getElementById('error-msg');
    
    let loading = false;
    
    // Добавляем стиль для кнопки переключения
    const style = document.createElement('style');
    style.textContent = `
      .login-button.toggle {
        background: transparent;
        border: 1px solid var(--accent-primary);
        margin-top: 8px;
        color: var(--accent-primary);
      }
      .login-button.toggle:hover {
        background: rgba(88, 101, 242, 0.1);
        transform: none;
      }
    `;
    document.head.appendChild(style);
    
    const handleSubmit = async () => {
      if (loading) return;
      
      const nickname = nicknameInput.value.trim();
      const password = passwordInput.value;
      
      if (nickname.length < 2) {
        errorDiv.textContent = 'Никнейм должен быть минимум 2 символа';
        errorDiv.style.display = 'block';
        return;
      }
      
      if (password.length < 4) {
        errorDiv.textContent = 'Пароль должен быть минимум 4 символа';
        errorDiv.style.display = 'block';
        return;
      }
      
      loading = true;
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Подключение...';
      errorDiv.style.display = 'none';
      
      try {
        await onLogin(nickname, password, null, isLoginMode ? 'login' : 'register');
      } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.textContent = isLoginMode ? 'Войти' : 'Зарегистрироваться';
        loading = false;
      }
    };
    
    submitBtn.addEventListener('click', handleSubmit);
    toggleBtn.addEventListener('click', () => {
      toggleMode();
      errorDiv.style.display = 'none';
      nicknameInput.value = '';
      passwordInput.value = '';
    });
    
    nicknameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSubmit();
    });
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSubmit();
    });
    
    nicknameInput.focus();
  }
};