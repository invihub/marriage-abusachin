/**
 * "Back" links on Our Story and the Guest List ([data-back-link]) return to
 * the section of the invitation the guest was last looking at (remembered by
 * js/main.js). The invitation then skips the temple gate (script in its <head>).
 */
(function () {
  var id = 'hero';
  try {
    id = sessionStorage.getItem('as-last-section') || 'hero';
  } catch (e) { /* storage blocked: back to the top */ }
  if (!/^[\w-]+$/.test(id)) id = 'hero';

  document.querySelectorAll('[data-back-link]').forEach(function (link) {
    link.href = 'index.html#' + id;
  });
})();
