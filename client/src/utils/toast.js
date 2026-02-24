/**
 * 功能：轻量级 Toast 通知工具
 * 最后修改：2026-02-25
 */

let toastEl = null;
let timer = null;

function ensureToast() {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  return toastEl;
}

export function showToast(message, type = 'info', duration = 2500) {
  const el = ensureToast();
  clearTimeout(timer);

  el.textContent = message;
  el.className = `toast ${type}`;

  // 触发重排以重新应用动画
  void el.offsetWidth;
  el.classList.add('show');

  timer = setTimeout(() => {
    el.classList.remove('show');
  }, duration);
}
