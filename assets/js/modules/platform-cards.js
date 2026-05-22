export function initPlatformCards() {
  document.querySelectorAll('[data-copy-note]').forEach((button) => {
    button.addEventListener('click', async () => {
      const note = button.getAttribute('data-copy-note');
      try {
        await navigator.clipboard.writeText(note);
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Copy failed';
      }
    });
  });
}
