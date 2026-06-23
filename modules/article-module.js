// modules/article-module.js
import { ShadowModule } from './shadow-module.js';
import './article-section.js';

export class ArticleModule extends ShadowModule {
  constructor() {
    super();
    this._io           = null;
    this._onHashChange = null;
    this._onLinkClick  = null;

    this.setStyles(`
      :host {
        display: block;
      }
    `);
  }

  connectedCallback() {
    super.connectedCallback();

    if (!this.shadowRoot.querySelector('slot')) {
      this.shadowRoot.appendChild(document.createElement('slot'));
    }

    customElements.whenDefined('article-section').then(() => {
      this.querySelectorAll('article-section').forEach(el => {
        customElements.upgrade(el);
      });
      this.observe();
    });

    // ── Перехват кликов по якорным ссылкам ──────────────────────────────
    // <base href="/sayword/"> резолвит href="#2" как /sayword/#2 —
    // перехватываем и обновляем хэш вручную в формате #page/section
    this._onLinkClick = (e) => {
      const link = e.composedPath().find(
        el => el instanceof HTMLAnchorElement
           && el.getAttribute('href')?.startsWith('#')
      );
      if (!link) return;
      e.preventDefault();

      const sectionNum  = link.getAttribute('href').slice(1);       // "2"
      const currentPage = location.hash.slice(1).split('/')[0];     // "dev"

      // Стреляет hashchange → _onHashChange → _handleHash
      location.hash = currentPage + '/' + sectionNum;               // "#dev/2"
    };
    this.addEventListener('click', this._onLinkClick);

    // ── Навигация кнопками браузера (назад/вперёд) ───────────────────────
    this._onHashChange = () => {
      this._handleHash([...this.querySelectorAll('article-section')]);
    };
    window.addEventListener('hashchange', this._onHashChange);
  }

  disconnectedCallback() {
    this._io?.disconnect();
    this._io = null;
    this.removeEventListener('click', this._onLinkClick);
    window.removeEventListener('hashchange', this._onHashChange);
  }

  observe() {
    if (!this.isConnected) return;

    const sections = [...this.querySelectorAll('article-section')];
    console.log('article-module: observed', sections.length, 'sections');
    if (sections.length === 0) return;

    // ── id и scroll-margin прямо на элемент секции ───────────────────────
    sections.forEach((sec, i) => {
      sec.id = String(i + 1);
      sec.style.scrollMarginTop = 'var(--header-offset, 60px)';
    });

    // ── IntersectionObserver: ленивая активация ──────────────────────────
    this._io?.disconnect();
    this._io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const section = entry.target;
        if (typeof section.activate === 'function') {
          console.log('Activate section', section.getAttribute('src'));
          section.activate();
          this._io.unobserve(section);
        } else {
          console.warn('Section has no activate()', section);
        }
      });
    }, { rootMargin: '200px' });

    sections.forEach(sec => this._io.observe(sec));

    // ── Хэш при первой загрузке страницы ────────────────────────────────
    this._handleHash(sections);
  }

  // Формат хэша: "#dev/2" → страница dev, секция 2
  async _handleHash(sections) {
    const hash  = location.hash.slice(1);    // "dev/2" или "dev" или ""
    const parts = hash.split('/');
    const num   = parts[1] ?? parts[0];      // секция — вторая часть если есть
    const targetIndex = parseInt(num, 10) - 1;

    if (isNaN(targetIndex) || targetIndex < 0 || targetIndex >= sections.length) return;

    const target = sections[targetIndex];

    // Активируем все секции до целевой — иначе высоты нестабильны
    await Promise.all(
      sections.slice(0, targetIndex + 1).map(sec =>
        typeof sec.activate === 'function' ? sec.activate() : Promise.resolve()
      )
    );

    target.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
}

if (!customElements.get('article-module')) {
  customElements.define('article-module', ArticleModule);
}
