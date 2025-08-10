import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';

// Encryption for MFA secrets and backup codes
const ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || 'your-32-char-secret-key-here-12345';
const ALGORITHM = 'aes-256-gcm';

export interface MFASetupResult {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface MFAVerificationResult {
  isValid: boolean;
  isBackupCode?: boolean;
}

export class MFAService {
  /**
   * Encrypt sensitive MFA data
   */
  private encrypt(text: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(ALGORITHM, ENCRYPTION_KEY);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const authTag = cipher.getAuthTag();
      return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt MFA data');
    }
  }

  /**
   * Decrypt sensitive MFA data
   */
  private decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      
      const decipher = crypto.createDecipher(ALGORITHM, ENCRYPTION_KEY);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt MFA data');
    }
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      // Generate 8-digit backup code
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code.match(/.{1,4}/g)?.join('-') || code);
    }
    return codes;
  }

  /**
   * Set up MFA for a user
   */
  async setupMFA(userId: string, userEmail: string, appName: string = 'Budget Tracker'): Promise<MFASetupResult> {
    try {
      // Generate secret key
      const secret = speakeasy.generateSecret({
        name: `${appName} (${userEmail})`,
        issuer: appName,
        length: 32,
      });

      if (!secret.base32) {
        throw new Error('Failed to generate MFA secret');
      }

      // Generate QR code
      const qrCode = await QRCode.toDataURL(secret.otpauth_url || '');

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      return {
        secret: secret.base32,
        qrCode,
        backupCodes,
      };
    } catch (error) {
      console.error('MFA setup error:', error);
      throw new Error('Failed to set up MFA');
    }
  }

  /**
   * Verify TOTP token or backup code
   */
  async verifyMFA(
    token: string,
    encryptedSecret: string,
    encryptedBackupCodes?: string
  ): Promise<MFAVerificationResult> {
    try {
      // Clean and validate token
      const cleanToken = token.replace(/\s/g, '').toUpperCase();

      // Try TOTP verification first
      if (cleanToken.length === 6 && /^\d{6}$/.test(cleanToken)) {
        const secret = this.decrypt(encryptedSecret);
        
        const verified = speakeasy.totp.verify({
          secret,
          encoding: 'base32',
          token: cleanToken,
          window: 2, // Allow 2 time steps (30 seconds before and after)
        });

        if (verified) {
          return { isValid: true, isBackupCode: false };
        }
      }

      // Try backup code verification
      if (encryptedBackupCodes && cleanToken.length >= 8) {
        try {
          const backupCodes = JSON.parse(this.decrypt(encryptedBackupCodes));
          const isValidBackupCode = backupCodes.includes(cleanToken);
          
          if (isValidBackupCode) {
            return { isValid: true, isBackupCode: true };
          }
        } catch (error) {
          console.warn('Backup code verification failed:', error);
        }
      }

      return { isValid: false };
    } catch (error) {
      console.error('MFA verification error:', error);
      return { isValid: false };
    }
  }

  /**
   * Encrypt MFA secret for storage
   */
  encryptSecret(secret: string): string {
    return this.encrypt(secret);
  }

  /**
   * Encrypt backup codes for storage
   */
  encryptBackupCodes(backupCodes: string[]): string {
    return this.encrypt(JSON.stringify(backupCodes));
  }

  /**
   * Remove a used backup code
   */
  async removeBackupCode(encryptedBackupCodes: string, usedCode: string): Promise<string> {
    try {
      const backupCodes = JSON.parse(this.decrypt(encryptedBackupCodes));
      const updatedCodes = backupCodes.filter((code: string) => code !== usedCode.toUpperCase());
      return this.encryptBackupCodes(updatedCodes);
    } catch (error) {
      console.error('Error removing backup code:', error);
      throw new Error('Failed to update backup codes');
    }
  }

  /**
   * Generate new backup codes (when user requests new ones)
   */
  generateNewBackupCodes(): { codes: string[]; encrypted: string } {
    const codes = this.generateBackupCodes();
    return {
      codes,
      encrypted: this.encryptBackupCodes(codes),
    };
  }

  /**
   * Validate MFA setup by verifying initial token
   */
  async validateSetup(secret: string, token: string): Promise<boolean> {
    try {
      const cleanToken = token.replace(/\s/g, '');
      
      return speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: cleanToken,
        window: 2,
      });
    } catch (error) {
      console.error('MFA setup validation error:', error);
      return false;
    }
  }

  /**
   * Generate a current TOTP token (for testing)
   */
  generateToken(secret: string): string {
    return speakeasy.totp({
      secret,
      encoding: 'base32',
    });
  }
}

export const mfaService = new MFAService();