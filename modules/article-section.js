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

    // ── Фиксируем Баг 1: выделенный контейнер для контента ───────────────
    // Не трогаем весь shadowRoot — только этот div
    // Стили из setStyles() остаются нетронутыми
    this._container = document.createElement('div');
    this.shadowRoot.appendChild(this._container);
  }

  connectedCallback() {
    super.connectedCallback();
    if (this._activated) return;

    // Пишем в контейнер, а не в shadowRoot напрямую
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

      // ── 1. Внешние шрифты и стили → document.head ──────────────────────
      doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !document.querySelector(`link[href="${href}"]`)) {
          document.head.appendChild(link.cloneNode(true));
        }
      });

      // ── 2. Инлайн-стили: обрабатываем и добавляем прямо в shadowRoot ───
      // Фиксируем Баг 2 и Баг 4:
      // - <style> теперь прямой потомок shadowRoot (не внутри article)
      // - body → :host, :root → :host чтобы работали базовые стили
      doc.querySelectorAll('style').forEach(style => {
        const el = document.createElement('style');
        el.textContent = style.textContent
          .replace(/\bbody\b\s*\{/g, ':host {')
          .replace(/:root\s*\{/g,   ':host {');
        this.shadowRoot.appendChild(el);
        style.remove(); // убираем из контента — уже обработан
      });

      // ── 3. Собираем скрипты в порядке документа, удаляем из doc ────────
      const scripts = [...doc.querySelectorAll('script')];
      scripts.forEach(s => s.remove());

      // ── 4. Рендерим контент (без скриптов и стилей) ─────────────────────
      this._container.innerHTML = `<article>${doc.body.innerHTML}</article>`;

      // ── Helpers ──────────────────────────────────────────────────────────
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

      const executeInlineScript = (original) => {
        const script = document.createElement('script');
        if (original.hasAttribute('type')) script.type = original.getAttribute('type');
        script.textContent = original.textContent;
        document.head.appendChild(script);
        document.head.removeChild(script);
      };

      // ── 5. Скрипты выполняются строго в порядке документа ───────────────
      // Фиксируем Баг 3: не разделяем на «инлайн сначала» —
      // порядок в HTML всегда осмысленен (конфиг пишется до библиотеки)
      for (const script of scripts) {
        if (!script.hasAttribute('src') && !script.textContent.trim()) continue;
        try {
          if (script.hasAttribute('src')) {
            await hoistExternalScript(script);
          } else {
            executeInlineScript(script);
          }
        } catch (e) {
          console.warn('[ArticleSection] Ошибка скрипта:', e.message);
        }
      }

      // ── 6. MathJax: явный типсет для Shadow DOM ─────────────────────────
      // Фиксируем Баг 5: MathJax наблюдает только document.body,
      // Shadow DOM он не видит автоматически
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
