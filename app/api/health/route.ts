import { NextRequest, NextResponse } from 'next/server';
import { performanceMonitor } from '@/lib/performance';
import { cache } from '@/lib/cache';
import { db } from '@/app/db';
import { sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const health = {
      status: 'healthy' as 'healthy' | 'degraded' | 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {} as any,
      performance: performanceMonitor.getHealthStatus(),
      uptime: process.uptime(),
      responseTime: 0,
      version: process.env.npm_package_version || '1.0.0',
    };

    // Database health check
    try {
      await db.run(sql`SELECT 1`);
      health.services.database = {
        status: 'healthy',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      health.services.database = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Database connection failed',
      };
      health.status = 'unhealthy';
    }

    // Cache health check
    try {
      const cacheHealthy = await cache.isHealthy();
      health.services.cache = {
        status: cacheHealthy ? 'healthy' : 'degraded',
        note: cacheHealthy ? 'Redis available' : 'Redis unavailable - app will work without cache',
      };
      
      // Cache issues are not critical, just degraded performance
      if (!cacheHealthy && health.status === 'healthy') {
        health.status = 'degraded';
      }
    } catch (error) {
      health.services.cache = {
        status: 'degraded',
        error: 'Cache health check failed',
        note: 'App will work without cache',
      };
      if (health.status === 'healthy') {
        health.status = 'degraded';
      }
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    health.services.memory = {
      status: memUsage.heapUsed < 500 * 1024 * 1024 ? 'healthy' : 'degraded', // 500MB threshold
      heapUsed: `${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      heapTotal: `${(memUsage.heapTotal / 1024 / 1024).toFixed(2)}MB`,
      external: `${(memUsage.external / 1024 / 1024).toFixed(2)}MB`,
    };

    // Overall response time
    health.responseTime = Date.now() - startTime;

    // Set appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Health check failed',
        responseTime: Date.now() - startTime,
      },
      { status: 503 }
    );
  }
}