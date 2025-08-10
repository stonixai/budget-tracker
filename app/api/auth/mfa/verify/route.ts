import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../[...nextauth]/route';
import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { mfaService } from '@/lib/mfa';

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
        { error: 'Verification code is required' },
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

    // Verify the token
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

    // If a backup code was used, remove it from the list
    if (verification.isBackupCode && user.backupCodes) {
      try {
        const updatedBackupCodes = await mfaService.removeBackupCode(
          user.backupCodes,
          token
        );

        await db
          .update(users)
          .set({
            backupCodes: updatedBackupCodes,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(users.id, session.user.id));
      } catch (error) {
        console.error('Error updating backup codes:', error);
        // Don't fail the verification if backup code update fails
      }
    }

    return NextResponse.json({
      success: true,
      message: verification.isBackupCode 
        ? 'Backup code verified successfully' 
        : 'MFA code verified successfully',
      isBackupCode: verification.isBackupCode,
    });

  } catch (error) {
    console.error('MFA verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify MFA code' },
      { status: 500 }
    );
  }
}