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
          
          <button id="login-btn" class="login-button">Войти</button>
          <button id="go-to-register-btn" class="login-button secondary">Создать аккаунт</button>
          
          <div id="error-msg" style="color:#ed4245; margin-top:12px; font-size:12px; display:none;"></div>
        </div>
      </div>
    `;
    
    const nicknameInput = document.getElementById('nickname');
    const passwordInput = document.getElementById('password');
    const loginBtn = document.getElementById('login-btn');
    const registerBtn = document.getElementById('go-to-register-btn');
    const errorDiv = document.getElementById('error-msg');
    
    let loading = false;
    
    const handleLogin = async () => {
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
      loginBtn.disabled = true;
      loginBtn.textContent = '⏳ Вход...';
      errorDiv.style.display = 'none';
      
      try {
        await onLogin(nickname, password, null, 'login');
      } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
        loginBtn.disabled = false;
        loginBtn.textContent = 'Войти';
        loading = false;
      }
    };
    
    const goToRegister = () => {
      // Импортируем и рендерим страницу регистрации
      import('./Register.js').then(module => {
        const RegisterPage = module.RegisterPage;
        RegisterPage.render(container, onLogin);
      });
    };
    
    loginBtn.addEventListener('click', handleLogin);
    registerBtn.addEventListener('click', goToRegister);
    
    nicknameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleLogin();
    });
    
    nicknameInput.focus();
  }
};