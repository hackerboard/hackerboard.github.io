(function () {
  var KEY = 'hb-theme';

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.querySelector('.hdark');
    if (btn) btn.textContent = theme === 'dark' ? '[light]' : '[dark]';
  }

  var stored = localStorage.getItem(KEY) || '';
  apply(stored);

  window.toggleDark = function () {
    var next = document.documentElement.getAttribute('data-theme') === 'dark' ? '' : 'dark';
    localStorage.setItem(KEY, next);
    apply(next);
  };
})();