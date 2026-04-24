(function () {
  var THEME_KEY   = 'hb-theme';
  var VISITED_KEY = 'hb-visited';

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

  /* ── Visited badge ── */
  var visited = JSON.parse(localStorage.getItem(VISITED_KEY) || '[]');

  function markVisited(a) {
    a.classList.add('visited');
  }

  document.querySelectorAll('.posts .pt a').forEach(function (a) {
    if (visited.indexOf(a.href) !== -1) markVisited(a);
    a.addEventListener('click', function () {
      if (visited.indexOf(a.href) === -1) {
        visited.push(a.href);
        localStorage.setItem(VISITED_KEY, JSON.stringify(visited));
      }
    });
  });
})();
