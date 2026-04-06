import { initSocket, disconnectSocket } from './socket/client.js';
import { LoginPage } from './pages/Login.js';
import { MainApp } from './pages/MainApp.js';
import './style.css';

let currentUser = null;
let socket = null;

// Сохраняем пользователя
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
  
  if (!currentUser) {
    LoginPage.render(app, handleLogin);
  } else {
    MainApp.render(app, socket, currentUser, handleLogout);
  }
}

function handleLogin(nickname) {
  return new Promise((resolve, reject) => {
    // Если есть сохранённый пользователь с таким же ником
    const saved = getSavedUser();
    if (saved && saved.nickname === nickname) {
      currentUser = saved;
      render();
      resolve();
      return;
    }
    
    socket = initSocket(nickname, (userData) => {
      currentUser = userData;
      saveUser(userData);
      render();
      resolve();
    }, (error) => {
      reject(new Error(error));
    });
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

// Проверяем сохранённого пользователя при загрузке
const savedUser = getSavedUser();
if (savedUser && savedUser.nickname) {
  // Переподключаемся с сохранённым ником
  socket = initSocket(savedUser.nickname, (userData) => {
    currentUser = userData;
    saveUser(userData);
    render();
  }, () => {
    // Если не получилось — показываем логин
    currentUser = null;
    render();
  });
} else {
  render();
}