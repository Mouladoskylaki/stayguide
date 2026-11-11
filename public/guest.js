// Progressive enhancement only. Passwords and guide anchors work without this file.
for (const button of document.querySelectorAll('[data-copy]')) button.hidden = false;
document.addEventListener('click', async event => {
  const button = event.target.closest('[data-copy]');
  if (!button || button.disabled) return;
  const password = document.getElementById(button.dataset.copy);
  const status = document.getElementById('wifi-copy-status');
  if (!password || !status) return;
  button.disabled = true;
  status.textContent = 'Copying password…';
  try {
    await navigator.clipboard.writeText(password.textContent);
    button.textContent = 'Copied ✓';
    status.textContent = 'Wi-Fi password copied.';
  } catch {
    password.focus();
    const range = document.createRange();
    range.selectNodeContents(password);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    button.textContent = 'Copy password';
    status.textContent = 'Couldn’t copy automatically. Select the password above and copy it manually.';
  } finally {
    button.disabled = false;
  }
});
