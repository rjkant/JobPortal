import CryptoJS from 'crypto-js';

const KEY = process.env.ENCRYPTION_KEY || 'jobpilot-secret-key-change-in-prod';

export function encrypt(text: string): string {
  return CryptoJS.AES.encrypt(text, KEY).toString();
}

export function decrypt(ciphertext: string): string {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
}
