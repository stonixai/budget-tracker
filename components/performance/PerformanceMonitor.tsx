'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { SkeletonDashboard } from '../ui/LoadingSkeleton';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database?: {
      status: string;
      responseTime?: number;
      error?: string;
    };
    cache?: {
      status: string;
      note?: string;
      error?: string;
    };
    memory?: {
      status: string;
      heapUsed: string;
      heapTotal: string;
      external: string;
    };
  };
  performance: {
    api?: {
      status: string;
      successRate?: number;
      averageResponseTime?: number;
    };
    database?: {
      status: string;
      successRate?: number;
      averageQueryTime?: number;
    };
  };
  uptime: number;
  responseTime: number;
  version: string;
}

export function PerformanceMonitor() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setHealth(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch health status');
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <SkeletonDashboard />;
  }

  if (error || !health) {
    return (
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-red-600 mb-2">System Health Monitor</h3>
          <p className="text-gray-600 dark:text-gray-400">
            {error || 'Unable to load health status'}
          </p>
        </div>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900 dark:text-yellow-200';
      case 'unhealthy':
        return 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200';
      default:
        return 'text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const formatUptime = (uptime: number) => {
    const days = Math.floor(uptime / (24 * 60 * 60));
    const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((uptime % (60 * 60)) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  return (
    <Card>
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            System Health Monitor
          </h3>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
              {health.status.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">
              v{health.version}
            </span>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">Uptime</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {formatUptime(health.uptime)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-600 dark:text-gray-400">Response Time</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {health.responseTime}ms
            </div>
          </div>
          {health.performance.api && (
            <>
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">API Success Rate</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {health.performance.api.successRate?.toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-sm text-gray-600 dark:text-gray-400">Avg API Time</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {health.performance.api.averageResponseTime?.toFixed(0)}ms
                </div>
              </div>
            </>
          )}
        </div>

        {/* Services Status */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 dark:text-white">Services</h4>
          
          {/* Database */}
          {health.services.database && (
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🗄️</div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Database</div>
                  {health.services.database.responseTime && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Response: {health.services.database.responseTime}ms
                    </div>
                  )}
                  {health.services.database.error && (
                    <div className="text-sm text-red-600">{health.services.database.error}</div>
                  )}
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(health.services.database.status)}`}>
                {health.services.database.status}
              </span>
            </div>
          )}

          {/* Cache */}
          {health.services.cache && (
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">⚡</div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Cache (Redis)</div>
                  {health.services.cache.note && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {health.services.cache.note}
                    </div>
                  )}
                  {health.services.cache.error && (
                    <div className="text-sm text-red-600">{health.services.cache.error}</div>
                  )}
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(health.services.cache.status)}`}>
                {health.services.cache.status}
              </span>
            </div>
          )}

          {/* Memory */}
          {health.services.memory && (
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">🧠</div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">Memory</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Heap: {health.services.memory.heapUsed} / {health.services.memory.heapTotal}
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(health.services.memory.status)}`}>
                {health.services.memory.status}
              </span>
            </div>
          )}
        </div>

        {/* Performance Metrics */}
        {(health.performance.api || health.performance.database) && (
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 dark:text-white mb-4">Performance</h4>
            <div className="space-y-3">
              {health.performance.api && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">API Performance</span>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getStatusColor(health.performance.api.status).split(' ')[0]}`}>
                      {health.performance.api.status}
                    </div>
                    <div className="text-xs text-gray-500">
                      {health.performance.api.averageResponseTime?.toFixed(0)}ms avg
                    </div>
                  </div>
                </div>
              )}
              {health.performance.database && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300">Database Performance</span>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getStatusColor(health.performance.database.status).split(' ')[0]}`}>
                      {health.performance.database.status}
                    </div>
                    <div className="text-xs text-gray-500">
                      {health.performance.database.averageQueryTime?.toFixed(0)}ms avg
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="text-xs text-gray-500 text-center">
            Last updated: {new Date(health.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>
    </Card>
  );
}