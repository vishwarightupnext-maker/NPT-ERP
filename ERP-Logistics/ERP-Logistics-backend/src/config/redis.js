const Redis = require('ioredis');

// Fallback in-memory key-value store when Redis connection fails or is unavailable
class InMemoryStore {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }

  async set(key, value, mode, duration) {
    this.store.set(key, value);
    if (mode === 'EX' && typeof duration === 'number') {
      if (this.ttls.has(key)) clearTimeout(this.ttls.get(key));
      const timer = setTimeout(() => {
        this.store.delete(key);
        this.ttls.delete(key);
      }, duration * 1000);
      this.ttls.set(key, timer);
    }
    return 'OK';
  }

  async get(key) {
    return this.store.get(key) || null;
  }

  async del(key) {
    if (this.ttls.has(key)) {
      clearTimeout(this.ttls.get(key));
      this.ttls.delete(key);
    }
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }
}

const memoryStore = new InMemoryStore();

const rawHost = process.env.REDIS_HOST || '127.0.0.1';
const [redisHost, hostPort] = rawHost.includes(':') ? rawHost.split(':') : [rawHost, null];
const redisPort = Number(hostPort || process.env.REDIS_PORT || 6379);

let isConnected = false;
let hasLoggedError = false;

let redisClient;
try {
  redisClient = new Redis({
    host: redisHost,
    port: redisPort,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: (times) => {
      if (times > 2) {
        if (!hasLoggedError) {
          console.warn('[Redis] Host unavailable. Switching to in-memory session store.');
          hasLoggedError = true;
        }
        return null; // stop retrying
      }
      return 500;
    },
  });

  redisClient.on('connect', () => {
    console.log('Redis connected');
    isConnected = true;
  });

  redisClient.on('error', (err) => {
    if (!hasLoggedError) {
      console.warn(`[Redis] Notice (${err.message}). Using in-memory store.`);
      hasLoggedError = true;
    }
  });

  // Attempt non-blocking initial connection
  redisClient.connect().catch(() => {});
} catch (e) {
  console.warn('[Redis] Unable to create client. Using in-memory store.');
}

const proxyClient = {
  set: async (...args) => {
    if (isConnected && redisClient) {
      try { return await redisClient.set(...args); } catch { /* fallback */ }
    }
    return memoryStore.set(...args);
  },
  get: async (...args) => {
    if (isConnected && redisClient) {
      try { return await redisClient.get(...args); } catch { /* fallback */ }
    }
    return memoryStore.get(...args);
  },
  del: async (...args) => {
    if (isConnected && redisClient) {
      try { return await redisClient.del(...args); } catch { /* fallback */ }
    }
    return memoryStore.del(...args);
  },
  on: (event, handler) => {
    if (redisClient) redisClient.on(event, handler);
  },
};

module.exports = proxyClient;
