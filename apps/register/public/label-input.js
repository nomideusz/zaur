/**
 * Floating label inputs — inspired by sv-animations label-input.
 * Syncs filled state and optional password visibility toggles.
 */
(function () {
  const EYE =
    '<svg class="z-label-input__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
  const EYE_OFF =
    '<svg class="z-label-input__icon" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9.9 4.24A10.94 10.94 0 0 1 12 4c6.5 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19M6.12 6.12A18.5 18.5 0 0 0 2 12s3.5 7 10 7a10.94 10.94 0 0 0 5.1-1.24M14.12 14.12a3 3 0 1 1-4.24-4.24"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M3 3l18 18"/></svg>';

  function syncFilled(wrap) {
    const input = wrap.querySelector('.z-label-input__field');
    if (!input) return;
    const hasValue =
      input.value.length > 0 ||
      (input.type === 'number' && input.value !== '' && !Number.isNaN(Number(input.value)));
    wrap.classList.toggle('is-filled', hasValue);
  }

  function bindPasswordToggle(wrap, input) {
    if (input.type !== 'password' && input.dataset.passwordToggle !== 'true') return;

    let toggle = wrap.querySelector('.z-label-input__toggle');
    if (!toggle) {
      toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'z-label-input__toggle';
      toggle.setAttribute('aria-label', 'Show password');
      toggle.setAttribute('aria-pressed', 'false');
      toggle.innerHTML = EYE;
      wrap.appendChild(toggle);
      wrap.classList.add('z-label-input--password');
    }

    toggle.addEventListener('click', () => {
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      toggle.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
      toggle.setAttribute('aria-pressed', showing ? 'false' : 'true');
      toggle.innerHTML = showing ? EYE : EYE_OFF;
      input.focus();
    });
  }

  function initWrap(wrap) {
    if (wrap.dataset.labelInputInit === 'true') return;
    wrap.dataset.labelInputInit = 'true';

    const input = wrap.querySelector('.z-label-input__field');
    if (!input) return;

    if (!input.placeholder) {
      input.placeholder = ' ';
    }

    const sync = () => syncFilled(wrap);
    input.addEventListener('input', sync);
    input.addEventListener('change', sync);
    sync();

    bindPasswordToggle(wrap, input);
  }

  function init(root = document) {
    root.querySelectorAll('.z-label-input').forEach(initWrap);
  }

  function syncAll(root = document) {
    root.querySelectorAll('.z-label-input').forEach(syncFilled);
  }

  window.ZaurLabelInput = { init, syncAll };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => init());
  } else {
    init();
  }
})();
