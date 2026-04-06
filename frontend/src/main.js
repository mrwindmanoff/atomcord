import { initSocket, disconnectSocket } from './socket/client.js';
import { LoginPage } from './pages/Login.js';
import { RegisterPage } from './pages/Register.js';
import { MainApp } from './pages/MainApp.js';
import { InviteHandler } from './pages/InviteHandler.js';
import './style.css';

let currentUser = null;
let socket = null;
let pendingInviteCode = null;

// Проверяем URL на наличие инвайта
const path = window.location.pathname;
const inviteMatch = path.match(/\/invite\/([a-zA-Z0-9]+)/);
if (inviteMatch) {
  pendingInviteCode = inviteMatch[1];
}

function saveUser(user) {
  localStorage.setItem('atomcord_user', JSON.stringify(user));
}

function getSavedUser() {
  const saved = localStorage.getItem('atomcord_user');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch(e) {
      return null;
    }
  }
  return null;
}

function clearSavedUser() {
  localStorage.removeItem('atomcord_user');
}

function render() {
  const app = document.getElementById('app');
  
  // Если есть инвайт и нет пользователя — показываем специальную страницу
  if (pendingInviteCode && !currentUser) {
    InviteHandler.render(app, pendingInviteCode, handleInviteAccept);
    return;
  }
  
  if (!currentUser) {
    LoginPage.render(app, handleAuth);
  } else {
    if (!socket || !socket.connected) {
      handleAuth(currentUser.nickname, currentUser.password, currentUser.token, 'login');
      return;
    }
    MainApp.render(app, socket, currentUser, handleLogout);
  }
}

function handleInviteAccept(code) {
  // Если пользователь уже залогинен — сразу присоединяемся
  if (currentUser && socket) {
    joinServerByInvite(code);
  } else {
    // Сохраняем инвайт и показываем логин
    pendingInviteCode = code;
    LoginPage.render(document.getElementById('app'), (nickname, password, token, mode) => {
      return handleAuth(nickname, password, token, mode).then(() => {
        joinServerByInvite(code);
      });
    });
  }
}

function joinServerByInvite(code) {
  socket.emit('join-server-by-invite', { code }, (response) => {
    if (response.success) {
      window.location.href = '/';
    } else {
      alert(response.error);
      window.location.href = '/';
    }
  });
}

function handleAuth(nickname, password, savedToken, mode = 'login') {
  return new Promise((resolve, reject) => {
    if (savedToken) {
      currentUser = { nickname, token: savedToken };
      socket = initSocket(nickname, password, (userData) => {
        currentUser = userData;
        render();
        resolve();
      }, (error) => {
        clearSavedUser();
        currentUser = null;
        reject(new Error(error));
      }, mode);
      return;
    }
    
    socket = initSocket(nickname, password, (userData) => {
      currentUser = userData;
      saveUser({ ...userData, password });
      
      // Если есть ожидающий инвайт — присоединяемся
      if (pendingInviteCode) {
        joinServerByInvite(pendingInviteCode);
        pendingInviteCode = null;
      }
      
      render();
      resolve();
    }, (error) => {
      reject(new Error(error));
    }, mode);
  });
}

function handleLogout() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  clearSavedUser();
  currentUser = null;
  render();
}

render();