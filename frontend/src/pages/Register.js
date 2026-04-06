export const RegisterPage = {
  render(container, onRegisterSuccess) {
    container.innerHTML = `
      <div class="login-screen">
        <div class="login-card">
          <div class="login-logo">
            <span class="logo-atom">⚛️</span>
            <span class="logo-text">AtomCord</span>
          </div>
          <p class="login-subtitle">Создай свой атомный аккаунт</p>
          
          <input type="text" id="nickname" class="login-input" placeholder="Никнейм" autocomplete="off" maxlength="20">
          <input type="password" id="password" class="login-input" placeholder="Пароль" autocomplete="off">
          <input type="password" id="confirm-password" class="login-input" placeholder="Подтвердите пароль" autocomplete="off">
          
          <button id="register-btn" class="login-button">Зарегистрироваться</button>
          <button id="go-to-login-btn" class="login-button secondary">Уже есть аккаунт? Войти</button>
          
          <div id="error-msg" style="color:#ed4245; margin-top:12px; font-size:12px; display:none;"></div>
        </div>
      </div>
    `;
    
    const nicknameInput = document.getElementById('nickname');
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirm-password');
    const registerBtn = document.getElementById('register-btn');
    const loginBtn = document.getElementById('go-to-login-btn');
    const errorDiv = document.getElementById('error-msg');
    
    let loading = false;
    
    const handleRegister = async () => {
      if (loading) return;
      
      const nickname = nicknameInput.value.trim();
      const password = passwordInput.value;
      const confirm = confirmInput.value;
      
      if (nickname.length < 2) {
        errorDiv.textContent = 'Никнейм должен быть минимум 2 символа';
        errorDiv.style.display = 'block';
        return;
      }
      
      if (nickname.length > 20) {
        errorDiv.textContent = 'Никнейм должен быть максимум 20 символов';
        errorDiv.style.display = 'block';
        return;
      }
      
      if (password.length < 4) {
        errorDiv.textContent = 'Пароль должен быть минимум 4 символа';
        errorDiv.style.display = 'block';
        return;
      }
      
      if (password !== confirm) {
        errorDiv.textContent = 'Пароли не совпадают';
        errorDiv.style.display = 'block';
        return;
      }
      
      loading = true;
      registerBtn.disabled = true;
      registerBtn.textContent = '⏳ Регистрация...';
      errorDiv.style.display = 'none';
      
      try {
        // Регистрация
        await onRegisterSuccess(nickname, password, null, 'register');
      } catch (err) {
        errorDiv.textContent = err.message;
        errorDiv.style.display = 'block';
        registerBtn.disabled = false;
        registerBtn.textContent = 'Зарегистрироваться';
        loading = false;
      }
    };
    
    const goToLogin = () => {
      import('./Login.js').then(module => {
        const LoginPage = module.LoginPage;
        LoginPage.render(container, onRegisterSuccess);
      });
    };
    
    registerBtn.addEventListener('click', handleRegister);
    loginBtn.addEventListener('click', goToLogin);
    
    nicknameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleRegister();
    });
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleRegister();
    });
    confirmInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleRegister();
    });
    
    nicknameInput.focus();
  }
};