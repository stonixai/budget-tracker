import nodemailer from 'nodemailer';

// Email configuration
const getEmailConfig = () => {
  // Check if we're in production and have email credentials
  if (process.env.NODE_ENV === 'production' && process.env.SMTP_HOST && process.env.SMTP_USER) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };
  }

  // Development configuration (using Ethereal or similar test service)
  if (process.env.NODE_ENV === 'development' && process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };
  }

  return null;
};

// Create transporter
let transporter: nodemailer.Transporter | null = null;

export const getEmailTransporter = async () => {
  if (transporter) return transporter;

  const config = getEmailConfig();
  if (!config) {
    console.warn('Email service not configured - emails will be logged instead');
    return null;
  }

  try {
    transporter = nodemailer.createTransport(config);
    // Verify connection
    await transporter.verify();
    console.log('Email service connected successfully');
    return transporter;
  } catch (error) {
    console.warn('Email service connection failed:', error);
    return null;
  }
};

// Email templates
export const emailTemplates = {
  budgetAlert: (data: { userName: string; categoryName: string; spent: number; budget: number }) => ({
    subject: `🚨 Budget Alert: ${data.categoryName} Overspent`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Budget Alert</h2>
        <p>Hi ${data.userName},</p>
        <p>You've exceeded your budget for <strong>${data.categoryName}</strong>:</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>Spent:</strong> $${(data.spent / 100).toFixed(2)}</p>
          <p><strong>Budget:</strong> $${(data.budget / 100).toFixed(2)}</p>
          <p><strong>Overage:</strong> $${((data.spent - data.budget) / 100).toFixed(2)}</p>
        </div>
        <p>Consider reviewing your spending in this category.</p>
        <hr style="margin: 24px 0; border: none; height: 1px; background: #e5e5e5;">
        <p style="color: #6b7280; font-size: 14px;">Budget Tracker App</p>
      </div>
    `,
  }),

  goalReminder: (data: { userName: string; goalName: string; remaining: number; targetDate: string }) => ({
    subject: `🎯 Goal Reminder: ${data.goalName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">Goal Reminder</h2>
        <p>Hi ${data.userName},</p>
        <p>Here's an update on your goal: <strong>${data.goalName}</strong></p>
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p><strong>Remaining Amount:</strong> $${(data.remaining / 100).toFixed(2)}</p>
          <p><strong>Target Date:</strong> ${new Date(data.targetDate).toLocaleDateString()}</p>
        </div>
        <p>Keep up the great work!</p>
        <hr style="margin: 24px 0; border: none; height: 1px; background: #e5e5e5;">
        <p style="color: #6b7280; font-size: 14px;">Budget Tracker App</p>
      </div>
    `,
  }),

  monthlyReport: (data: { userName: string; totalIncome: number; totalExpenses: number; savedAmount: number }) => ({
    subject: `📊 Your Monthly Financial Report`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Monthly Financial Report</h2>
        <p>Hi ${data.userName},</p>
        <p>Here's your financial summary for this month:</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <p style="margin: 0; color: #059669;"><strong>Income: $${(data.totalIncome / 100).toFixed(2)}</strong></p>
            </div>
            <div>
              <p style="margin: 0; color: #dc2626;"><strong>Expenses: $${(data.totalExpenses / 100).toFixed(2)}</strong></p>
            </div>
          </div>
          <hr style="margin: 12px 0; border: none; height: 1px; background: #e2e8f0;">
          <p style="margin: 0; color: #3b82f6;"><strong>Net Savings: $${(data.savedAmount / 100).toFixed(2)}</strong></p>
        </div>
        <p>Great job managing your finances!</p>
        <hr style="margin: 24px 0; border: none; height: 1px; background: #e5e5e5;">
        <p style="color: #6b7280; font-size: 14px;">Budget Tracker App</p>
      </div>
    `,
  }),
};

// Email service class
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  async initialize() {
    this.transporter = await getEmailTransporter();
    return this.transporter !== null;
  }

  async sendEmail(to: string, template: { subject: string; html: string }, from?: string) {
    if (!this.transporter) {
      // Log email instead of sending in development
      console.log('📧 EMAIL (not sent):', {
        to,
        from: from || process.env.FROM_EMAIL || 'noreply@budgettracker.app',
        subject: template.subject,
        preview: template.html.substring(0, 100) + '...',
      });
      return { success: true, messageId: 'dev-mode-log' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: from || process.env.FROM_EMAIL || 'Budget Tracker <noreply@budgettracker.app>',
        to,
        subject: template.subject,
        html: template.html,
      });

      console.log('📧 Email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Email send failed:', error);
      return { success: false, error };
    }
  }

  async sendBudgetAlert(userEmail: string, data: Parameters<typeof emailTemplates.budgetAlert>[0]) {
    const template = emailTemplates.budgetAlert(data);
    return this.sendEmail(userEmail, template);
  }

  async sendGoalReminder(userEmail: string, data: Parameters<typeof emailTemplates.goalReminder>[0]) {
    const template = emailTemplates.goalReminder(data);
    return this.sendEmail(userEmail, template);
  }

  async sendMonthlyReport(userEmail: string, data: Parameters<typeof emailTemplates.monthlyReport>[0]) {
    const template = emailTemplates.monthlyReport(data);
    return this.sendEmail(userEmail, template);
  }

  // Health check
  async isHealthy(): Promise<boolean> {
    if (!this.transporter) return false;

    try {
      return await this.transporter.verify();
    } catch (error) {
      return false;
    }
  }

  // Close connection (for graceful shutdown)
  async close() {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();