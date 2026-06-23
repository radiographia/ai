// modules/lazy-module.js
import { ShadowModule } from './shadow-module.js';

export class LazyModule extends ShadowModule {
  constructor() {
    super();
    this._activated = false;
  }

  // Важно вызвать super для надежности
  connectedCallback() {
    super.connectedCallback();
  }

  activate() {
    if (this._activated) return;
    this._activated = true;
    this.onActivate();
  }

  // Переопределяется наследниками
  async onActivate() {}
}