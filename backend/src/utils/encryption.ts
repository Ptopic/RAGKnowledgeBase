import * as crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT = 'rag-kb-salt';

// Lazy singleton — scryptSync is ~100ms; derive once, cache forever
let _derivedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (_derivedKey) return _derivedKey;

  const key = process.env.API_ENCRYPTION_KEY;
  if (!key) {
    throw new Error('API_ENCRYPTION_KEY environment variable is not set');
  }
  _derivedKey = crypto.scryptSync(key, SALT, 32);
  return _derivedKey;
}

/**
 * Invalidate the cached derived key (e.g. after API_ENCRYPTION_KEY rotation).
 * Next encrypt/decrypt call will re-derive from the current env var.
 */
export function invalidateEncryptionKeyCache(): void {
  _derivedKey = null;
}

export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

export function decrypt(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
