const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/;

const RESERVED_USERNAMES = new Set([
  'admin',
  'postmaster',
  'abuse',
  'support',
  'info',
  'root',
  'webmaster',
  'noreply',
  'no-reply',
  'mailer-daemon',
  'hostmaster',
  'ssl',
  'ftp',
  'mail',
  'www',
  'test',
  '_apitest',
]);

function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    return { valid: false, error: 'Username is required.' };
  }

  const normalized = username.toLowerCase().trim();

  if (normalized.length < 1 || normalized.length > 30) {
    return { valid: false, error: 'Username must be 1–30 characters.' };
  }

  if (RESERVED_USERNAMES.has(normalized)) {
    return { valid: false, error: 'This username is reserved.' };
  }

  if (!USERNAME_REGEX.test(normalized)) {
    return {
      valid: false,
      error:
        'Username must start and end with a letter or digit, and may contain letters, digits, dots, hyphens, and underscores.',
    };
  }

  return { valid: true, username: normalized };
}

function validatePassword(password, confirmPassword) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required.' };
  }

  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters.' };
  }

  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match.' };
  }

  return { valid: true };
}

function validateCaptchaAnswer(answer, expected) {
  if (answer === undefined || answer === null || answer === '') {
    return { valid: false, error: 'Please solve the captcha.' };
  }

  const parsed = Number.parseInt(String(answer).trim(), 10);
  if (Number.isNaN(parsed) || parsed !== expected) {
    return { valid: false, error: 'Incorrect captcha answer.' };
  }

  return { valid: true };
}

function generateCaptcha() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return {
    question: `${a} + ${b} = ?`,
    answer: a + b,
  };
}

function getPasswordStrength(password) {
  if (!password) return { score: 0, label: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very strong'];
  return { score: Math.min(score, 4), label: labels[Math.min(score, 4)] };
}

module.exports = {
  USERNAME_REGEX,
  RESERVED_USERNAMES,
  validateUsername,
  validatePassword,
  validateCaptchaAnswer,
  generateCaptcha,
  getPasswordStrength,
};
