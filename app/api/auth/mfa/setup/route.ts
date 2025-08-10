import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../[...nextauth]/route';
import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { mfaService } from '@/lib/mfa';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
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

    // Check if MFA is already enabled
    if (user.mfaEnabled) {
      return NextResponse.json(
        { error: 'MFA is already enabled for this account' },
        { status: 400 }
      );
    }

    // Setup MFA
    const mfaSetup = await mfaService.setupMFA(
      user.id,
      user.email,
      'Budget Tracker'
    );

    return NextResponse.json({
      qrCode: mfaSetup.qrCode,
      backupCodes: mfaSetup.backupCodes,
      secret: mfaSetup.secret, // Temporarily return for setup verification
    });

  } catch (error) {
    console.error('MFA setup error:', error);
    return NextResponse.json(
      { error: 'Failed to set up MFA' },
      { status: 500 }
    );
  }
}

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
    const { secret, token, backupCodes } = body;

    if (!secret || !token || !backupCodes) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate the setup token
    const isValid = await mfaService.validateSetup(secret, token);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Encrypt and store MFA data
    const encryptedSecret = mfaService.encryptSecret(secret);
    const encryptedBackupCodes = mfaService.encryptBackupCodes(backupCodes);

    // Update user in database
    await db
      .update(users)
      .set({
        mfaEnabled: true,
        mfaSecret: encryptedSecret,
        backupCodes: encryptedBackupCodes,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, session.user.id));

    return NextResponse.json({
      success: true,
      message: 'MFA has been successfully enabled',
    });

  } catch (error) {
    console.error('MFA activation error:', error);
    return NextResponse.json(
      { error: 'Failed to enable MFA' },
      { status: 500 }
    );
  }
}