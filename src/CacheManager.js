// ============================
// Cache Management System
// ============================
class CacheManager {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }
  
  set(key, data, ttlMinutes = 10) {
    const ttlMs = ttlMinutes * 60 * 1000;
    this.cache.set(key, data);
    this.timestamps.set(key, {
      created: Date.now(),
      expires: Date.now() + ttlMs,
      ttl: ttlMs
    });
  }
  
  get(key) {
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() < timestamp.expires) {
      return {
        data: this.cache.get(key),
        age: Date.now() - timestamp.created,
        fromCache: true
      };
    }
    return null;
  }
  
  getAge(key) {
    const timestamp = this.timestamps.get(key);
    if (!timestamp) return null;
    return Date.now() - timestamp.created;
  }
  
  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }
  
  getCacheStats() {
    const stats = {
      totalItems: this.cache.size,
      memoryItems: this.cache.size,
      storageItems: 0,
      oldestItem: null,
      newestItem: null
    };
    
    let oldest = Infinity;
    let newest = 0;
    
    this.timestamps.forEach((timestamp, key) => {
      if (timestamp.created < oldest) {
        oldest = timestamp.created;
        stats.oldestItem = { key, age: Date.now() - timestamp.created };
      }
      if (timestamp.created > newest) {
        newest = timestamp.created;
        stats.newestItem = { key, age: Date.now() - timestamp.created };
      }
    });
    
    return stats;
  }
}
// const cacheManager = new CacheManager();
export {CacheManager};