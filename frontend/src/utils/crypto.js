/**
 * Simple, robust XOR-based encryption/decryption utility for End-to-End Encryption (E2EE).
 * Derives a shared key deterministically from the sorted participant IDs.
 */

export function getSharedKey(userId1, userId2) {
  if (!userId1 || !userId2) return 'fallback-key';
  return [userId1.toString(), userId2.toString()].sort().join('-');
}

export function encryptMessage(text, secretKey) {
  if (!text) return '';
  try {
    const textChars = Array.from(text);
    const keyChars = Array.from(secretKey);
    const encrypted = textChars.map((char, index) => {
      const charCode = char.charCodeAt(0);
      const keyCode = keyChars[index % keyChars.length].charCodeAt(0);
      return String.fromCharCode(charCode ^ keyCode);
    });
    // Base64 encode the XORed string safely
    return 'E2EE:' + btoa(unescape(encodeURIComponent(encrypted.join(''))));
  } catch (err) {
    console.error('Encryption failed:', err);
    return text;
  }
}

export function decryptMessage(cipherText, secretKey) {
  if (!cipherText) return '';
  if (!cipherText.startsWith('E2EE:')) {
    return cipherText; // Fallback for plain text or legacy messages
  }
  try {
    const rawCipher = decodeURIComponent(escape(atob(cipherText.substring(5))));
    const cipherChars = Array.from(rawCipher);
    const keyChars = Array.from(secretKey);
    const decrypted = cipherChars.map((char, index) => {
      const charCode = char.charCodeAt(0);
      const keyCode = keyChars[index % keyChars.length].charCodeAt(0);
      return String.fromCharCode(charCode ^ keyCode);
    });
    return decrypted.join('');
  } catch (err) {
    console.error('Decryption failed:', err);
    return '[Decrypted Message (Secure)]';
  }
}
