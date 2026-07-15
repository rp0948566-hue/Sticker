const container = document.querySelector('.container');
const registerBtn = document.querySelector('.register-btn');
const loginBtn = document.querySelector('.login-btn');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

registerBtn.addEventListener('click', () => {
  container.classList.add('active');
});

loginBtn.addEventListener('click', () => {
  container.classList.remove('active');
});

function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2200);
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = loginForm.email.value.trim();
  if (!email) return;
  localStorage.setItem('demoUserEmail', email);
  showToast('Logged in — redirecting...');
  setTimeout(() => { window.location.href = '/home'; }, 900);
});

signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = signupForm.name.value.trim();
  const email = signupForm.email.value.trim();
  if (!name || !email) return;
  localStorage.setItem('demoUserEmail', email);
  localStorage.setItem('demoUserName', name);
  showToast('Account created — redirecting...');
  setTimeout(() => { window.location.href = '/home'; }, 900);
});
