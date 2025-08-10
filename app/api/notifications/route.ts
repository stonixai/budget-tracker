import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { notifications } from '@/app/db/schema';
import { eq, and, desc, sql, or } from 'drizzle-orm';
import { z } from 'zod';
import { createAuthenticatedHandler } from '@/lib/middleware';

// Validation schema for notification
const createNotificationSchema = z.object({
  type: z.enum([
    'budget_alert',
    'goal_reminder',
    'bill_due',
    'achievement',
    'system',
    'transaction_alert',
    'weekly_summary',
    'monthly_summary',
  ]),
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(1000),
  data: z.any().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  actionUrl: z.string().optional(),
});

// GET /api/notifications - List all notifications for the user
export const GET = createAuthenticatedHandler(async function handleGET(request: NextRequest, userId: string) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const unreadOnly = searchParams.get('unread') === 'true';
    const type = searchParams.get('type');
    const priority = searchParams.get('priority');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build query conditions
    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.isArchived, false),
    ];
    
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, false));
    }
    
    if (type) {
      conditions.push(eq(notifications.type, type as any));
    }
    
    if (priority) {
      conditions.push(eq(notifications.priority, priority as any));
    }

    // Fetch notifications
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.priority), desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    // Get unread count
    const [unreadCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          eq(notifications.isArchived, false)
        )
      );

    // Get count by type
    const countByType = await db
      .select({
        type: notifications.type,
        count: sql<number>`count(*)`,
      })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          eq(notifications.isArchived, false)
        )
      )
      .groupBy(notifications.type);

    return NextResponse.json({
      notifications: userNotifications,
      metadata: {
        total: userNotifications.length,
        unreadCount: unreadCount.count,
        countByType,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
});

// POST /api/notifications - Create a new notification (internal use)
export const POST = createAuthenticatedHandler(async function handlePOST(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = createNotificationSchema.parse(body);
    
    // Create the notification
    const [newNotification] = await db
      .insert(notifications)
      .values({
        userId: userId,
        type: validatedData.type,
        title: validatedData.title,
        message: validatedData.message,
        data: validatedData.data ? JSON.stringify(validatedData.data) : null,
        priority: validatedData.priority || 'medium',
        actionUrl: validatedData.actionUrl,
        isRead: false,
        isArchived: false,
      })
      .returning();

    return NextResponse.json(newNotification, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }
    
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
});

// PUT /api/notifications/read - Mark notifications as read
export const PUT = createAuthenticatedHandler(async function handlePUT(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const { notificationIds, markAll } = body;

    if (markAll) {
      // Mark all unread notifications as read
      await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
          )
        );

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await db
        .update(notifications)
        .set({
          isRead: true,
          readAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(notifications.userId, userId),
            or(...notificationIds.map(id => eq(notifications.id, id)))
          )
        );

      return NextResponse.json({ success: true, message: 'Notifications marked as read' });
    } else {
      return NextResponse.json(
        { error: 'Either notificationIds array or markAll flag is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
});

// DELETE /api/notifications - Archive notifications
export const DELETE = createAuthenticatedHandler(async function handleDELETE(request: NextRequest, userId: string) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');
    const archiveAll = searchParams.get('archiveAll') === 'true';
    const archiveRead = searchParams.get('archiveRead') === 'true';

    if (archiveAll) {
      // Archive all notifications
      await db
        .update(notifications)
        .set({ isArchived: true })
        .where(eq(notifications.userId, userId));

      return NextResponse.json({ success: true, message: 'All notifications archived' });
    } else if (archiveRead) {
      // Archive all read notifications
      await db
        .update(notifications)
        .set({ isArchived: true })
        .where(
          and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, true)
          )
        );

      return NextResponse.json({ success: true, message: 'Read notifications archived' });
    } else if (id) {
      // Archive specific notification
      await db
        .update(notifications)
        .set({ isArchived: true })
        .where(
          and(
            eq(notifications.id, parseInt(id)),
            eq(notifications.userId, userId)
          )
        );

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Notification ID or archive flag is required' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error archiving notifications:', error);
    return NextResponse.json(
      { error: 'Failed to archive notifications' },
      { status: 500 }
    );
  }
});