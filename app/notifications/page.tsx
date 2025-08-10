'use client';

import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { Card } from '@/components/ui/Card';

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Notification Center</h1>
            <p className="text-gray-600 mt-2">
              Stay updated with important alerts and reminders about your finances
            </p>
          </div>

          {/* Info Card */}
          <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <div className="flex items-center gap-4">
              <div className="text-4xl">🔔</div>
              <div>
                <p className="text-lg font-medium text-gray-800">
                  Stay Informed About Your Finances
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  Get notified about budget alerts, goal progress, unusual transactions, and achievements.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Notification Center */}
        <NotificationCenter />
      </div>
    </div>
  );
}