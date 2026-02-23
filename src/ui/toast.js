let hideTimer;

export function showToast(message, { duration = 2000 } = {}) {
  const host = document.body;
  if (!host) {
    alert(message);
    return;
  }

  let el = document.querySelector('.toast-message');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast-message';
    host.appendChild(el);
  }

  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => el.classList.remove('visible'), duration);
}
