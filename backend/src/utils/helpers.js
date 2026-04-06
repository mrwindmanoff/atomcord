// Вспомогательные функции

export function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    error: '\x1b[31m',   // Red
    warn: '\x1b[33m',    // Yellow
    debug: '\x1b[90m'    // Gray
  };
  
  const reset = '\x1b[0m';
  const color = colors[type] || colors.info;
  
  console.log(`${color}[${timestamp}] [${type.toUpperCase()}]${reset} ${message}`);
}

export function generateId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function validateNickname(nickname) {
  if (!nickname) return false;
  if (nickname.length < 2) return false;
  if (nickname.length > 32) return false;
  if (!/^[a-zA-Zа-яА-Я0-9_]+$/.test(nickname)) return false;
  return true;
}

export function sanitizeText(text) {
  if (!text) return '';
  // Базовая санитизация HTML
  return text
    .replace(/[<>]/g, '')
    .substring(0, 2000);
}

export function getRandomColor() {
  const colors = ['#5865F2', '#57F287', '#FEE75C', '#EB459E', '#ED4245'];
  return colors[Math.floor(Math.random() * colors.length)];
}

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleTimeString();
}