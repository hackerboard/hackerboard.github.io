(function () {
  var THEME_KEY = 'hb-theme';

  /* ── Dark mode ── */
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.querySelector('.hdark');
    if (btn) btn.textContent = theme === 'dark' ? '[light]' : '[dark]';
  }

  apply(localStorage.getItem(THEME_KEY) || '');

  window.toggleDark = function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? '' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    apply(next);
  };
})();
