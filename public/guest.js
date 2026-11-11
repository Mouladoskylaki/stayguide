// Progressive enhancement only. Guest information remains readable without JavaScript.
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-copy]');
  if (!button) return;
  const input = document.getElementById(button.dataset.copy);
  if (!input) return;
  try {
    await navigator.clipboard.writeText(input.value);
    button.textContent = 'Copied ✓';
  } catch {
    input.focus(); input.select();
    button.textContent = 'Select & copy';
  }
});
