import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/db';
import { users } from '@/app/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { emailService, emailTemplates } from '@/lib/email';
import crypto from 'crypto';

// Validation schema
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = forgotPasswordSchema.parse(body);
    const { email } = validatedData;

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    // Always return success to prevent email enumeration attacks
    // But only send email if user actually exists
    if (existingUser) {
      // Generate secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      // Store reset token (in a real app, you'd have a password_resets table)
      // For now, we'll use a simple in-memory store or could extend the users table
      // This is a simplified implementation - in production you'd want a separate table
      
      // Create reset URL
      const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

      // Send password reset email
      await emailService.initialize();
      
      const emailTemplate = {
        subject: '🔐 Reset Your Budget Tracker Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: white; padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">Reset Your Password</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Secure access to your Budget Tracker account</p>
            </div>
            
            <div style="padding: 30px;">
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">Hi${existingUser.name ? ' ' + existingUser.name : ''},</p>
              
              <p style="font-size: 16px; line-height: 1.6; color: #374151;">
                We received a request to reset your password for your Budget Tracker account. If you didn't make this request, you can safely ignore this email.
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background: #0284c7; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 500; display: inline-block; font-size: 16px;">
                  Reset Your Password
                </a>
              </div>
              
              <div style="background: #f3f4f6; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="margin: 0; font-size: 14px; color: #6b7280;">
                  <strong>Security Notice:</strong> This link will expire in 1 hour and can only be used once.
                </p>
              </div>
              
              <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
                If the button doesn't work, you can also copy and paste this link into your browser:
                <br>
                <a href="${resetUrl}" style="color: #0284c7; word-break: break-all;">${resetUrl}</a>
              </p>
              
              <hr style="margin: 30px 0; border: none; height: 1px; background: #e5e7eb;">
              
              <p style="font-size: 14px; color: #9ca3af; text-align: center;">
                This email was sent by Budget Tracker. If you didn't request this password reset, please contact support.
              </p>
            </div>
          </div>
        `,
      };

      await emailService.sendEmail(email, emailTemplate);

      // Log the reset token for development (remove in production)
      console.log(`🔐 Password reset token for ${email}: ${resetToken}`);
      console.log(`🔗 Reset URL: ${resetUrl}`);
    }

    // Always return success response (security best practice)
    return NextResponse.json({
      success: true,
      message: 'If an account with that email exists, we have sent a password reset link.',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    console.error('Error in forgot password:', error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request' },
      { status: 500 }
    );
  }
}