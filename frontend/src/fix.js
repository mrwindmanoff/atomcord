// Файл fix.js - экстренный фикс клавиатуры
(function fixKeyboard() {
  console.log('🔧 Запуск фикса клавиатуры...');
  
  // Функция пересоздания всех полей ввода
  function recreateAllInputs() {
    const inputs = document.querySelectorAll('input, textarea');
    console.log(`Найдено полей: ${inputs.length}`);
    
    inputs.forEach((oldInput, index) => {
      try {
        // Создаём новый элемент
        const newInput = document.createElement(oldInput.tagName);
        
        // Копируем все атрибуты
        for (let attr of oldInput.attributes) {
          newInput.setAttribute(attr.name, attr.value);
        }
        
        // Копируем стили
        newInput.className = oldInput.className;
        newInput.style.cssText = oldInput.style.cssText;
        
        // Копируем значение
        if (oldInput.value) newInput.value = oldInput.value;
        
        // Заменяем
        oldInput.parentNode.replaceChild(newInput, oldInput);
        
        // Добавляем обработчик для гарантии
        newInput.addEventListener('input', (e) => {
          console.log(`✅ Ввод в поле ${index}:`, e.target.value);
        });
        
        console.log(`✅ Поле ${index} пересоздано`);
      } catch(e) {
        console.error(`Ошибка при пересоздании поля ${index}:`, e);
      }
    });
  }
  
  // Запускаем несколько раз с задержкой
  setTimeout(recreateAllInputs, 100);
  setTimeout(recreateAllInputs, 500);
  setTimeout(recreateAllInputs, 1000);
  
  // Следим за новыми полями
  const observer = new MutationObserver(() => {
    console.log('🔍 Обнаружены изменения в DOM');
    setTimeout(recreateAllInputs, 50);
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Фикс клавиатуры активирован');
})();