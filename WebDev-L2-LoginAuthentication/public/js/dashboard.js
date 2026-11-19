async function loadDashboard() {
  try {
    const response = await fetch('/api/me', { credentials: 'same-origin' });
    if (!response.ok) {
      window.location.replace('/');
      return;
    }
    const { user } = await response.json();
    document.querySelector('#welcome-name').textContent = user.username;
    document.querySelector('#account-username').textContent = user.username;
    document.querySelector('#account-email').textContent = user.email;
  } catch {
    window.location.replace('/');
  }
}

loadDashboard();

document.querySelector('#logout-button').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  button.textContent = 'Signing out…';
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  } finally {
    window.location.replace('/');
  }
});
