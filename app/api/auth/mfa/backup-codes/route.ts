import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../[...nextauth]/route';
import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { mfaService } from '@/lib/mfa';

// GET - Regenerate backup codes
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Verification code is required to regenerate backup codes' },
        { status: 400 }
      );
    }

    // Get user from database
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      return NextResponse.json(
        { error: 'MFA is not enabled for this account' },
        { status: 400 }
      );
    }

    // Verify the token before regenerating backup codes
    const verification = await mfaService.verifyMFA(
      token,
      user.mfaSecret,
      user.backupCodes || undefined
    );

    if (!verification.isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Generate new backup codes
    const { codes, encrypted } = mfaService.generateNewBackupCodes();

    // Update user with new backup codes
    await db
      .update(users)
      .set({
        backupCodes: encrypted,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({
      success: true,
      backupCodes: codes,
      message: 'New backup codes generated successfully. Store them in a safe place.',
    });

  } catch (error) {
    console.error('Backup codes regeneration error:', error);
    return NextResponse.json(
      { error: 'Failed to regenerate backup codes' },
      { status: 500 }
    );
  }
}