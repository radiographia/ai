// modules/theme-controller.js

// 1. Создаем ОДНУ общую таблицу стилей для всех Shadow DOM
export const globalThemeSheet = new CSSStyleSheet();

// 2. Определяем палитры
const themes = {
  dark: {
    '--bg-color': '#121212',
    '--text-color': '#e0e0e0',
    '--header-bg': '#1f1f1f',
    '--nav-bg': '#1a1a1a',
    '--accent-color': '#b71c1c', // Красный акцент (логотип)
    '--border-color': '#333333',
    '--placeholder-bg': '#1a1a1a'
  },
  ivory: {
    '--bg-color': '#FFFFF0',       // Слоновая кость
    '--text-color': '#333333',
    '--header-bg': '#F5F5DC',      // Бежевый оттенок
    '--nav-bg': '#F0EAD6',         // Яичная скорлупа
    '--accent-color': '#8B0000',   // Темно-красный (для строгости на светлом)
    '--border-color': '#D4C4B1',   // Песочный
    '--placeholder-bg': '#E0D8CC'
  }
};

// 3. Функция применения темы
export function applyTheme(themeName) {
  const vars = themes[themeName];
  if (!vars) return;

  // Формируем CSS-строку для Shadow DOM
  let css = ':host { ';
  for (let k in vars) css += `${k}: ${vars[k]}; `;
  css += '}';
  
  // Применяем к общей таблице (она обновится во всех компонентах автоматически)
  globalThemeSheet.replaceSync(css);

  // Применяем переменные к <html> (для index.html и body)
  const root = document.documentElement;
  for (let k in vars) {
    root.style.setProperty(k, vars[k]);
  }

  // Сохраняем выбор
  localStorage.setItem('app-theme', themeName);
}

// 4. Инициализация при старте
export function initTheme() {
  const saved = localStorage.getItem('app-theme') || 'dark';
  applyTheme(saved);
}