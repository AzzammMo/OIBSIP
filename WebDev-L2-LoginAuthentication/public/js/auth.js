const loginForm = document.querySelector('#login-form');
const registerForm = document.querySelector('#register-form');
const loginTab = document.querySelector('#login-tab');
const registerTab = document.querySelector('#register-tab');
const title = document.querySelector('#form-title');
const subtitle = document.querySelector('#form-subtitle');
const kicker = document.querySelector('#form-kicker');

function setMode(mode) {
  const isLogin = mode === 'login';
  loginForm.classList.toggle('hidden', !isLogin);
  registerForm.classList.toggle('hidden', isLogin);
  loginTab.classList.toggle('active', isLogin);
  registerTab.classList.toggle('active', !isLogin);
  loginTab.setAttribute('aria-selected', String(isLogin));
  registerTab.setAttribute('aria-selected', String(!isLogin));
  document.querySelector('.tab-switch').classList.toggle('register-mode', !isLogin);
  title.innerHTML = isLogin ? 'Sign in to your<br><em>workspace.</em>' : 'Create your<br><em>account.</em>';
  subtitle.textContent = isLogin ? 'Enter your details to access your account.' : 'A few details and you are ready to move forward.';
  kicker.textContent = isLogin ? 'WELCOME BACK' : 'YOUR NEXT CHAPTER STARTS HERE';
  clearMessages();
  requestAnimationFrame(() => {
    const activeForm = isLogin ? loginForm : registerForm;
    activeForm.classList.remove('form-enter');
    void activeForm.offsetWidth;
    activeForm.classList.add('form-enter');
  });
}

function clearMessages() {
  document.querySelectorAll('.form-message').forEach(node => {
    node.textContent = '';
    node.className = 'form-message';
  });
}

function showMessage(id, message, type = 'error') {
  const node = document.getElementById(id);
  node.textContent = message;
  node.className = `form-message ${type}`;
}

async function sendRequest(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed. Please try again.');
  return data;
}

function setLoading(form, loading, label) {
  const button = form.querySelector('.submit-button');
  button.disabled = loading;
  button.classList.toggle('is-loading', loading);
  button.querySelector('.submit-label').textContent = loading ? label : (form === loginForm ? 'Sign in' : 'Create account');
  button.querySelector('.submit-arrow').textContent = loading ? '…' : '↗';
}

loginTab.addEventListener('click', () => setMode('login'));
registerTab.addEventListener('click', () => setMode('register'));
document.querySelectorAll('[data-switch]').forEach(button => {
  button.addEventListener('click', () => setMode(button.dataset.switch));
});

document.querySelectorAll('[data-toggle]').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.toggle);
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    button.textContent = visible ? 'Hide' : 'Show';
    button.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
    input.focus();
  });
});

// Subtle input feedback: highlight valid fields without interrupting typing.
document.querySelectorAll('.input-wrap input').forEach(input => {
  const update = () => {
    const wrap = input.closest('.input-wrap');
    wrap.classList.toggle('has-value', input.value.length > 0);
    wrap.classList.toggle('is-valid', input.checkValidity() && input.value.length > 0);
  };
  input.addEventListener('input', update);
  input.addEventListener('blur', update);
});

// Live password strength and the two required registration rules.
const registerPassword = document.querySelector('#register-password');
if (registerPassword) {
  registerPassword.addEventListener('input', () => {
    const value = registerPassword.value;
    const hasLength = value.length >= 8;
    const hasNumber = /\d/.test(value);
    const hasUpper = /[A-Z]/.test(value);
    const hasSymbol = /[^A-Za-z0-9]/.test(value);
    const score = [hasLength, hasNumber, hasUpper, hasSymbol].filter(Boolean).length;
    const fill = document.querySelector('#strength-fill');
    const label = document.querySelector('#strength-label');
    const lengthRule = document.querySelector('#length-rule');
    const numberRule = document.querySelector('#number-rule');

    fill.style.width = `${[0, 28, 52, 77, 100][score]}%`;
    fill.dataset.level = score <= 1 ? 'weak' : score <= 2 ? 'fair' : score === 3 ? 'good' : 'strong';
    label.textContent = !value ? 'Password strength' : ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'][score];
    lengthRule.textContent = hasLength ? '✓' : '○';
    numberRule.textContent = hasNumber ? '✓' : '○';
    lengthRule.classList.toggle('rule-met', hasLength);
    numberRule.classList.toggle('rule-met', hasNumber);
  });
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearMessages();
  const identifier = loginForm.identifier.value.trim();
  const password = loginForm.password.value;
  if (!identifier || !password) {
    showMessage('login-message', 'Please complete both fields.');
    return;
  }

  setLoading(loginForm, true, 'Signing in');
  try {
    await sendRequest('/api/login', { identifier, password });
    showMessage('login-message', 'Access granted. Taking you to your workspace…', 'success');
    window.location.assign('/dashboard');
  } catch (error) {
    showMessage('login-message', error.message);
  } finally {
    setLoading(loginForm, false);
  }
});

registerForm.addEventListener('submit', async event => {
  event.preventDefault();
  clearMessages();
  const username = registerForm.username.value.trim();
  const email = registerForm.email.value.trim();
  const password = registerForm.password.value;
  if (!username || !email || !password) {
    showMessage('register-message', 'Please complete all fields.');
    return;
  }
  if (username.length < 3 || username.length > 24) {
    showMessage('register-message', 'Username must contain 3–24 characters.');
    return;
  }
  if (!registerForm.email.checkValidity()) {
    showMessage('register-message', 'Please enter a valid email address.');
    return;
  }
  if (password.length < 8 || !/\d/.test(password)) {
    showMessage('register-message', 'Password must be at least 8 characters and include one number.');
    return;
  }

  setLoading(registerForm, true, 'Creating account');
  try {
    await sendRequest('/api/register', { username, email, password });
    showMessage('register-message', 'Your account is ready. Opening your workspace…', 'success');
    window.location.assign('/dashboard');
  } catch (error) {
    showMessage('register-message', error.message);
  } finally {
    setLoading(registerForm, false);
  }
});

// Small pointer parallax on the decorative visual panel. Disabled on touch devices.
const visualPanel = document.querySelector('.visual-panel');
if (visualPanel && window.matchMedia('(pointer: fine)').matches) {
  visualPanel.addEventListener('pointermove', event => {
    const bounds = visualPanel.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    visualPanel.style.setProperty('--pointer-x', `${x * 18}px`);
    visualPanel.style.setProperty('--pointer-y', `${y * 18}px`);
  });
}

fetch('/api/me', { credentials: 'same-origin' }).then(response => {
  if (response.ok) window.location.replace('/dashboard');
}).catch(() => {});
