// \www\modules\shadow-module.js
import { globalThemeSheet } from './theme-controller.js';

export class ShadowModule extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    
    // Подключаем глобальную тему
    this.shadowRoot.adoptedStyleSheets = [globalThemeSheet];
    
    // Локальная таблица для стилей конкретного компонента
    this.stylesSheet = new CSSStyleSheet();
    this.shadowRoot.adoptedStyleSheets.push(this.stylesSheet);
  }

  // ВАЖНО: Заглушка метода, чтобы super.connectedCallback() работал у наследников
  connectedCallback() {}

  // Метод для установки локальных стилей
  setStyles(cssString) {
    this.stylesSheet.replaceSync(cssString);
  }
}

// Не регистрируем как тег, это базовый класс