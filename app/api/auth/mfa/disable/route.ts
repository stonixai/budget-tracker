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
    const { token, password } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Verification code is required to disable MFA' },
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

    // Verify the token before disabling
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

    // Optional: Verify password as additional security
    if (password && user.password) {
      const bcrypt = await import('bcrypt');
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 400 }
        );
      }
    }

    // Disable MFA
    await db
      .update(users)
      .set({
        mfaEnabled: false,
        mfaSecret: null,
        backupCodes: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({
      success: true,
      message: 'MFA has been successfully disabled',
    });

  } catch (error) {
    console.error('MFA disable error:', error);
    return NextResponse.json(
      { error: 'Failed to disable MFA' },
      { status: 500 }
    );
  }
}