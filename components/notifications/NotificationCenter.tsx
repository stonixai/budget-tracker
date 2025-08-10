'use client';

import { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/LoadingSkeleton';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'budget_alert' | 'goal_reminder' | 'transaction_anomaly' | 'system' | 'achievement';
  priority: 'low' | 'medium' | 'high';
  isRead: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'budget_alert' | 'goal_reminder' | 'transaction_anomaly' | 'system' | 'achievement'>('all');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (filter === 'unread') {
        params.set('unread', 'true');
      } else if (filter === 'read') {
        params.set('read', 'true');
      }
      
      if (typeFilter !== 'all') {
        params.set('type', typeFilter);
      }

      const response = await fetch(`/api/notifications?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data.notifications || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter, typeFilter]);

  const markAsRead = async (id: number) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, isRead: true }),
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => n.id === id ? { ...n, isRead: true } : n)
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.isRead).map(n => n.id);
    
    if (unreadIds.length === 0) return;

    try {
      const promises = unreadIds.map(id =>
        fetch('/api/notifications', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id, isRead: true }),
        })
      );

      await Promise.all(promises);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteNotification = async (id: number) => {
    if (!confirm('Are you sure you want to delete this notification?')) {
      return;
    }

    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      alert('Failed to delete notification');
    }
  };

  const getTypeEmoji = (type: string) => {
    const emojis = {
      budget_alert: '⚠️',
      goal_reminder: '🎯',
      transaction_anomaly: '🔍',
      system: '🔔',
      achievement: '🎉',
    };
    return emojis[type as keyof typeof emojis] || '🔔';
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      budget_alert: 'Budget Alert',
      goal_reminder: 'Goal Reminder',
      transaction_anomaly: 'Transaction Anomaly',
      system: 'System',
      achievement: 'Achievement',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'border-red-200 bg-red-50',
      medium: 'border-yellow-200 bg-yellow-50',
      low: 'border-gray-200 bg-white',
    };
    return colors[priority as keyof typeof colors] || 'border-gray-200 bg-white';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays === 0) {
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes <= 0 ? 'Just now' : `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={fetchNotifications} variant="outline">
          Try Again
        </Button>
      </Card>
    );
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
          <p className="text-gray-600">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>

        {unreadCount > 0 && (
          <Button onClick={markAllAsRead} variant="outline">
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="all">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          >
            <option value="all">All Types</option>
            <option value="budget_alert">Budget Alerts</option>
            <option value="goal_reminder">Goal Reminders</option>
            <option value="transaction_anomaly">Transaction Anomalies</option>
            <option value="system">System</option>
            <option value="achievement">Achievements</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="text-4xl mb-4">🔕</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications</h3>
          <p className="text-gray-500">
            {filter === 'all' 
              ? "You're all caught up! No notifications to show."
              : `No ${filter} notifications found.`
            }
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-4 border-l-4 ${getPriorityColor(notification.priority)} ${
                !notification.isRead ? 'shadow-md' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl flex-shrink-0">
                    {getTypeEmoji(notification.type)}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium ${
                        !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                      }`}>
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-3 leading-relaxed">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {getTypeLabel(notification.type)}
                        </span>
                        <span className={`px-2 py-1 rounded ${
                          notification.priority === 'high' ? 'bg-red-100 text-red-700' :
                          notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {notification.priority} priority
                        </span>
                      </div>
                      <span>{formatDate(notification.createdAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {!notification.isRead && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => markAsRead(notification.id)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      Mark Read
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteNotification(notification.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}