/**
 * Validates a password based on strict criteria:
 * 1. Length: Min 12, Better 14-16+
 * 2. Character Types: Uppercase, Lowercase, Number, Special symbol (@ # $ % & *)
 * 3. Avoid Common Passwords: 123456, password, qwerty, admin
 * 4. Avoid Personal Information: Name, username, email parts, birthdate/year (19xx/20xx), phone number (7+ digits), school/college keywords.
 */
export function validatePassword(password, userDetails = {}) {
  const { name = '', username = '', email = '' } = userDetails;
  const errors = [];
  const checks = {
    lengthMin: password.length >= 12,
    lengthBetter: password.length >= 14,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[@#$%\&*]/.test(password),
    notCommon: true,
    noPersonalInfo: true,
  };

  // Check Common Passwords
  const commonPasswords = ['123456', 'password', 'qwerty', 'admin'];
  const lowerPassword = password.toLowerCase();
  for (const common of commonPasswords) {
    if (lowerPassword.includes(common)) {
      checks.notCommon = false;
      errors.push(`Password cannot contain the common phrase "${common}".`);
    }
  }

  // Check Personal Information
  // 1. Name check (split by space to check individual names, e.g. "Daksh" in "Daksh Gupta")
  if (name) {
    const nameParts = name.toLowerCase().split(/\s+/).filter(part => part.length >= 3);
    for (const part of nameParts) {
      if (lowerPassword.includes(part)) {
        checks.noPersonalInfo = false;
        errors.push(`Password cannot contain your name ("${part}").`);
      }
    }
  }

  // 2. Username check
  if (username && username.length >= 3) {
    if (lowerPassword.includes(username.toLowerCase())) {
      checks.noPersonalInfo = false;
      errors.push(`Password cannot contain your username ("${username}").`);
    }
  }

  // 3. Email prefix check
  if (email) {
    const emailPrefix = email.split('@')[0].toLowerCase();
    if (emailPrefix && emailPrefix.length >= 3) {
      if (lowerPassword.includes(emailPrefix)) {
        checks.noPersonalInfo = false;
        errors.push(`Password cannot contain part of your email ("${emailPrefix}").`);
      }
    }
  }

  // 4. Birthdate / Years (e.g. 19xx or 20xx)
  const birthdateRegex = /(19\d{2}|20\d{2})/;
  if (birthdateRegex.test(password)) {
    checks.noPersonalInfo = false;
    errors.push('Password cannot contain a birth year or date (e.g., 2008).');
  }

  // 5. Phone number (7+ digits)
  if (/\d{7,}/.test(password)) {
    checks.noPersonalInfo = false;
    errors.push('Password cannot contain phone numbers or long digit sequences.');
  }

  // 6. School / College keywords
  const schoolKeywords = ['school', 'college', 'university', 'dps', 'lpu', 'iit', 'mit', 'schoolname'];
  for (const word of schoolKeywords) {
    if (lowerPassword.includes(word)) {
      checks.noPersonalInfo = false;
      errors.push(`Password should not contain school/college references ("${word}").`);
    }
  }

  // Consolidate validation
  const isValid = 
    checks.lengthMin &&
    checks.hasUppercase &&
    checks.hasLowercase &&
    checks.hasNumber &&
    checks.hasSpecial &&
    checks.notCommon &&
    checks.noPersonalInfo;

  return {
    isValid,
    checks,
    errors,
  };
}
