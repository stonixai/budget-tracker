// Performance monitoring utilities

export interface PerformanceMetrics {
  responseTime: number;
  timestamp: number;
  endpoint: string;
  method: string;
  userId?: string;
  success: boolean;
  error?: string;
}

export interface DatabaseMetrics {
  queryTime: number;
  query: string;
  success: boolean;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private dbMetrics: DatabaseMetrics[] = [];
  private maxEntries = 1000; // Keep last 1000 entries in memory

  // Track API response times
  trackApiCall(endpoint: string, method: string, startTime: number, success: boolean, userId?: string, error?: string) {
    const metric: PerformanceMetrics = {
      responseTime: Date.now() - startTime,
      timestamp: Date.now(),
      endpoint,
      method,
      userId,
      success,
      error,
    };

    this.metrics.push(metric);
    
    // Keep only recent entries
    if (this.metrics.length > this.maxEntries) {
      this.metrics = this.metrics.slice(-this.maxEntries);
    }

    // Log slow requests
    if (metric.responseTime > 1000) {
      console.warn(`Slow API call: ${method} ${endpoint} took ${metric.responseTime}ms`);
    }
  }

  // Track database query performance
  trackDatabaseQuery(query: string, startTime: number, success: boolean) {
    const metric: DatabaseMetrics = {
      queryTime: Date.now() - startTime,
      query: query.substring(0, 100), // Truncate long queries
      success,
      timestamp: Date.now(),
    };

    this.dbMetrics.push(metric);
    
    // Keep only recent entries
    if (this.dbMetrics.length > this.maxEntries) {
      this.dbMetrics = this.dbMetrics.slice(-this.maxEntries);
    }

    // Log slow queries
    if (metric.queryTime > 500) {
      console.warn(`Slow database query: ${metric.query} took ${metric.queryTime}ms`);
    }
  }

  // Get performance statistics
  getApiStats(timeWindow = 300000) { // Default 5 minutes
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    if (recentMetrics.length === 0) {
      return null;
    }

    const successful = recentMetrics.filter(m => m.success);
    const responseTimes = recentMetrics.map(m => m.responseTime);
    
    return {
      totalRequests: recentMetrics.length,
      successRate: (successful.length / recentMetrics.length) * 100,
      averageResponseTime: responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length,
      p95ResponseTime: this.percentile(responseTimes, 95),
      p99ResponseTime: this.percentile(responseTimes, 99),
      slowestEndpoint: this.getSlowgestEndpoint(recentMetrics),
    };
  }

  getDatabaseStats(timeWindow = 300000) {
    const cutoff = Date.now() - timeWindow;
    const recentMetrics = this.dbMetrics.filter(m => m.timestamp > cutoff);
    
    if (recentMetrics.length === 0) {
      return null;
    }

    const successful = recentMetrics.filter(m => m.success);
    const queryTimes = recentMetrics.map(m => m.queryTime);
    
    return {
      totalQueries: recentMetrics.length,
      successRate: (successful.length / recentMetrics.length) * 100,
      averageQueryTime: queryTimes.reduce((a, b) => a + b, 0) / queryTimes.length,
      p95QueryTime: this.percentile(queryTimes, 95),
      p99QueryTime: this.percentile(queryTimes, 99),
    };
  }

  private percentile(arr: number[], p: number): number {
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private getSlowgestEndpoint(metrics: PerformanceMetrics[]): string {
    const endpointTimes = new Map<string, number[]>();
    
    metrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      if (!endpointTimes.has(key)) {
        endpointTimes.set(key, []);
      }
      endpointTimes.get(key)!.push(metric.responseTime);
    });

    let slowest = '';
    let slowestTime = 0;

    endpointTimes.forEach((times, endpoint) => {
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      if (avg > slowestTime) {
        slowestTime = avg;
        slowest = endpoint;
      }
    });

    return slowest;
  }

  // Clear old metrics
  cleanup() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // Keep 24 hours
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    this.dbMetrics = this.dbMetrics.filter(m => m.timestamp > cutoff);
  }

  // Get health check status
  getHealthStatus() {
    const stats = this.getApiStats();
    const dbStats = this.getDatabaseStats();
    
    return {
      timestamp: Date.now(),
      api: stats ? {
        status: stats.successRate > 95 && stats.averageResponseTime < 200 ? 'healthy' : 'degraded',
        successRate: stats.successRate,
        averageResponseTime: stats.averageResponseTime,
      } : { status: 'unknown' },
      database: dbStats ? {
        status: dbStats.successRate > 95 && dbStats.averageQueryTime < 100 ? 'healthy' : 'degraded',
        successRate: dbStats.successRate,
        averageQueryTime: dbStats.averageQueryTime,
      } : { status: 'unknown' },
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Middleware helper for API routes
export function withPerformanceTracking(handler: Function) {
  return async (request: any, context?: any) => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const endpoint = url.pathname;
    const method = request.method;
    
    try {
      const result = await handler(request, context);
      performanceMonitor.trackApiCall(endpoint, method, startTime, true);
      return result;
    } catch (error) {
      performanceMonitor.trackApiCall(
        endpoint,
        method,
        startTime,
        false,
        undefined,
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  };
}

// Database query wrapper
export function trackDatabaseQuery<T>(queryPromise: Promise<T>, queryString: string): Promise<T> {
  const startTime = Date.now();
  
  return queryPromise
    .then(result => {
      performanceMonitor.trackDatabaseQuery(queryString, startTime, true);
      return result;
    })
    .catch(error => {
      performanceMonitor.trackDatabaseQuery(queryString, startTime, false);
      throw error;
    });
}

// Cleanup job - call this periodically
setInterval(() => {
  performanceMonitor.cleanup();
}, 60 * 60 * 1000); // Every hour