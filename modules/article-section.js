// modules/article-section.js
import { LazyModule } from './lazy-module.js';

export class ArticleSection extends LazyModule {
  constructor() {
    super();
    this.setStyles(`
      :host {
        display: block;
        min-height: 100vh;
        border-bottom: 1px solid var(--border-color);
      }
      .placeholder {
        color: var(--text-color);
        opacity: 0.5;
        padding: 20px;
      }
    `);
    this._container = document.createElement('div');
    this.shadowRoot.appendChild(this._container);
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._activated) return;
    this._container.innerHTML = `
      <div class="placeholder">Section placeholder...</div>
    `;
  }

  async onActivate() {
    const src = this.getAttribute('src');
    if (!src) return;

    const baseEl = document.querySelector('base');
    const base = baseEl ? baseEl.getAttribute('href') : '/';
    const cleanSrc = src.replace(/^\//, '');
    const fullUrl = base + cleanSrc;
    console.log('Fetching', fullUrl);

    try {
      const response = await fetch(fullUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (!this.isConnected) return;

      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');

      // Внешние стили → document.head
      doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !document.querySelector(`link[href="${href}"]`)) {
          document.head.appendChild(link.cloneNode(true));
        }
      });

      // Инлайн-стили → shadowRoot
      doc.querySelectorAll('style').forEach(style => {
        const el = document.createElement('style');
        el.textContent = style.textContent
          .replace(/\bbody\b\s*\{/g, ':host {')
          .replace(/:root\s*\{/g,   ':host {');
        this.shadowRoot.appendChild(el);
        style.remove();
      });

      // Скрипты – собираем и удаляем из doc
      const scripts = [...doc.querySelectorAll('script')];
      scripts.forEach(s => s.remove());

      // Рендерим контент
      this._container.innerHTML = `<article>${doc.body.innerHTML}</article>`;

      // ── Вспомогательные функции ──────────────────────────────────────
      const hoistExternalScript = (original) => {
        const scriptSrc = original.getAttribute('src');
        if (document.querySelector(`script[src="${scriptSrc}"]`)) {
          return Promise.resolve();
        }
        return new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = scriptSrc;
          for (const attr of ['type', 'crossorigin', 'integrity', 'referrerpolicy']) {
            if (original.hasAttribute(attr)) {
              script.setAttribute(attr, original.getAttribute(attr));
            }
          }
          script.onload = resolve;
          script.onerror = () => reject(new Error(`Не удалось загрузить: ${scriptSrc}`));
          document.head.appendChild(script);
        });
      };

      // ── Исправленная функция выполнения инлайн-скрипта ──────────────
      const executeInlineScript = (original, root, host) => {
        // Передаём root и host через глобальные переменные
        window.__playerRoot = root;
        window.__playerHost = host;
        const script = document.createElement('script');
        if (original.hasAttribute('type')) script.type = original.getAttribute('type');
        script.textContent = original.textContent;
        document.head.appendChild(script);
        document.head.removeChild(script);
        // Очищаем после выполнения
        delete window.__playerRoot;
        delete window.__playerHost;
      };

      // ── Выполняем скрипты строго по порядку ────────────────────────
      for (const script of scripts) {
        if (!script.hasAttribute('src') && !script.textContent.trim()) continue;
        try {
          if (script.hasAttribute('src')) {
            await hoistExternalScript(script);
          } else {
            // Передаём текущий shadowRoot и сам элемент section
            executeInlineScript(script, this.shadowRoot, this);
          }
        } catch (e) {
          console.warn('[ArticleSection] Ошибка скрипта:', e.message);
        }
      }

      // MathJax (если есть)
      if (window.MathJax?.typesetPromise) {
        await window.MathJax.typesetPromise([this._container]);
      }

    } catch (e) {
      this._container.innerHTML = `
        <div style="color: var(--accent-color);">Ошибка загрузки: ${e.message}</div>
      `;
    }
  }
}

customElements.define('article-section', ArticleSection);
