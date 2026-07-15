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

// Where to send the user back to after logging in — the page they came from,
// passed as ?return=/path, falling back to the referrer, then Home.
function getReturnPath() {
  const fromParam = new URLSearchParams(window.location.search).get('return');
  if (fromParam) return fromParam;
  if (document.referrer && new URL(document.referrer).origin === window.location.origin) {
    return new URL(document.referrer).pathname;
  }
  return '/home';
}

function setSession(user) {
  localStorage.setItem('cc_user', JSON.stringify(user));
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = loginForm.email.value.trim();
  if (!email) return;
  setSession({ name: email.split('@')[0], email, loggedInAt: Date.now() });
  showToast('Logged in — redirecting...');
  setTimeout(() => { window.location.href = getReturnPath(); }, 900);
});

signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = signupForm.name.value.trim();
  const email = signupForm.email.value.trim();
  if (!name || !email) return;
  setSession({ name, email, loggedInAt: Date.now() });
  showToast('Account created — redirecting...');
  setTimeout(() => { window.location.href = getReturnPath(); }, 900);
});

const forgotLink = document.querySelector('.forgot-link a');
if (forgotLink) {
  forgotLink.addEventListener('click', (e) => {
    e.preventDefault();
    const email = loginForm.email.value.trim();
    if (!email) {
      showToast('Please enter your email above first!');
    } else {
      showToast('Reset link sent to your email!');
    }
  });
}
