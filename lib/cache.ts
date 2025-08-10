import Redis from 'ioredis';

// Global Redis instance
let redis: Redis | null = null;

export function getRedisClient() {
  // Skip Redis connection if explicitly disabled or in development without Redis URL
  if (process.env.REDIS_DISABLED === 'true' || (process.env.NODE_ENV === 'development' && !process.env.REDIS_URL)) {
    return null;
  }

  // In development, use a local Redis instance if available
  // In production, use environment variables for Redis connection
  if (!redis) {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      redis = new Redis(redisUrl, {
        // Connection options
        maxRetriesPerRequest: 3,
        lazyConnect: true, // Don't connect immediately
        enableOfflineQueue: false, // Don't queue commands while offline
      });

      redis.on('error', (err) => {
        console.warn('Redis connection error:', err.message);
        // Don't throw error, just log it - app should work without Redis
      });

      redis.on('connect', () => {
        console.log('Redis connected successfully');
      });

    } catch (error) {
      console.warn('Redis initialization failed:', error);
      return null;
    }
  }
  return redis;
}

export class CacheService {
  private redis: Redis | null;

  constructor() {
    this.redis = getRedisClient();
  }

  private getKey(prefix: string, identifier: string): string {
    return `budget-tracker:${prefix}:${identifier}`;
  }

  async get<T>(prefix: string, identifier: string): Promise<T | null> {
    if (!this.redis) return null;

    try {
      const key = this.getKey(prefix, identifier);
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn('Cache get error:', error);
      return null;
    }
  }

  async set(prefix: string, identifier: string, data: unknown, ttlSeconds: number = 300): Promise<void> {
    if (!this.redis) return;

    try {
      const key = this.getKey(prefix, identifier);
      const value = JSON.stringify(data);
      await this.redis.setex(key, ttlSeconds, value);
    } catch (error) {
      console.warn('Cache set error:', error);
    }
  }

  async del(prefix: string, identifier: string): Promise<void> {
    if (!this.redis) return;

    try {
      const key = this.getKey(prefix, identifier);
      await this.redis.del(key);
    } catch (error) {
      console.warn('Cache delete error:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    if (!this.redis) return;

    try {
      const keys = await this.redis.keys(`budget-tracker:${pattern}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.warn('Cache invalidate pattern error:', error);
    }
  }

  // Specific cache methods for common data
  async getDashboardData(userId: string) {
    return this.get('dashboard', userId);
  }

  async setDashboardData(userId: string, data: unknown, ttlSeconds: number = 300) {
    return this.set('dashboard', userId, data, ttlSeconds);
  }

  async invalidateUserCache(userId: string) {
    await this.invalidatePattern(`*:${userId}`);
  }

  async getTransactions(userId: string, filters: string) {
    return this.get('transactions', `${userId}:${filters}`);
  }

  async setTransactions(userId: string, filters: string, data: unknown, ttlSeconds: number = 180) {
    return this.set('transactions', `${userId}:${filters}`, data, ttlSeconds);
  }

  async getAnalytics(userId: string, period: string) {
    return this.get('analytics', `${userId}:${period}`);
  }

  async setAnalytics(userId: string, period: string, data: unknown, ttlSeconds: number = 600) {
    return this.set('analytics', `${userId}:${period}`, data, ttlSeconds);
  }

  async getBudgetStatus(userId: string, month: string) {
    return this.get('budget-status', `${userId}:${month}`);
  }

  async setBudgetStatus(userId: string, month: string, data: unknown, ttlSeconds: number = 300) {
    return this.set('budget-status', `${userId}:${month}`, data, ttlSeconds);
  }

  // Cache warming - preload frequently accessed data
  async warmCache(userId: string) {
    // This would be called after login or data updates
    // to preload commonly accessed data
    try {
      // You can implement cache warming logic here
      // For example, preload dashboard data, recent transactions, etc.
      console.log(`Warming cache for user ${userId}`);
    } catch {
      console.warn('Cache warming error');
    }
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    if (!this.redis) return false;

    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }

  // Close connection (for graceful shutdown)
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }
}

// Export singleton instance
export const cache = new CacheService();