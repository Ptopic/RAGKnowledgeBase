const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  key: string;
  expiresAt: number;
}

export class ApiKeyCache {
  private cache = new Map<string, CacheEntry>();

  get(id: string): string | undefined {
    const entry = this.cache.get(id);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(id);
      return undefined;
    }
    return entry.key;
  }

  set(id: string, decryptedKey: string): void {
    this.cache.set(id, { key: decryptedKey, expiresAt: Date.now() + TTL_MS });
  }

  delete(id: string): void {
    this.cache.delete(id);
  }

  clear(): void {
    this.cache.clear();
  }
}

export const apiKeyCache = new ApiKeyCache();
