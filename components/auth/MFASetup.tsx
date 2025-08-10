'use client';

import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';

interface MFASetupProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface SetupData {
  qrCode: string;
  backupCodes: string[];
  secret: string;
}

export function MFASetup({ isOpen, onClose, onSuccess }: MFASetupProps) {
  const [step, setStep] = useState<'setup' | 'verify' | 'backup'>('setup');
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSetup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'GET',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup MFA');
      }

      setSetupData(data);
      setStep('verify');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to setup MFA');
    } finally {
      setIsLoading(false);
    }
  };

  const verifySetup = async () => {
    if (!setupData || !verificationCode) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/mfa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret: setupData.secret,
          token: verificationCode,
          backupCodes: setupData.backupCodes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify MFA setup');
      }

      setStep('backup');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to verify setup');
    } finally {
      setIsLoading(false);
    }
  };

  const completeSetup = () => {
    onSuccess();
    onClose();
    // Reset state
    setStep('setup');
    setSetupData(null);
    setVerificationCode('');
    setError(null);
  };

  const handleClose = () => {
    onClose();
    // Reset state
    setStep('setup');
    setSetupData(null);
    setVerificationCode('');
    setError(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">
          {step === 'setup' && 'Set up Two-Factor Authentication'}
          {step === 'verify' && 'Verify Your Setup'}
          {step === 'backup' && 'Save Your Backup Codes'}
        </h2>

        {error && (
          <Alert type="error" className="mb-4">
            {error}
          </Alert>
        )}

        {step === 'setup' && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-300">
              Two-factor authentication adds an extra layer of security to your account. 
              You'll need an authenticator app like Google Authenticator, Authy, or 1Password.
            </p>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Before you start:
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Install an authenticator app on your phone</li>
                <li>• Make sure you have access to your current device</li>
                <li>• Keep your backup codes in a safe place</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleClose} variant="secondary">
                Cancel
              </Button>
              <Button onClick={startSetup} disabled={isLoading}>
                {isLoading ? 'Setting up...' : 'Start Setup'}
              </Button>
            </div>
          </div>
        )}

        {step === 'verify' && setupData && (
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Scan this QR code with your authenticator app:
              </p>
              
              <div className="flex justify-center mb-4">
                <div className="bg-white p-4 rounded-lg">
                  <img 
                    src={setupData.qrCode} 
                    alt="QR Code for MFA setup" 
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                Can't scan? Enter this code manually: <br />
                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                  {setupData.secret}
                </code>
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter the 6-digit code from your authenticator app:
                </label>
                <Input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={() => setStep('setup')} variant="secondary">
                  Back
                </Button>
                <Button 
                  onClick={verifySetup} 
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  {isLoading ? 'Verifying...' : 'Verify & Enable'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'backup' && setupData && (
          <div className="space-y-6">
            <Alert type="warning">
              <strong>Important:</strong> Save these backup codes in a secure location. 
              You can use them to access your account if you lose your authenticator device.
            </Alert>

            <Card className="p-4">
              <h3 className="font-medium mb-3">Your Backup Codes:</h3>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {setupData.backupCodes.map((code, index) => (
                  <div key={index} className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-center">
                    {code}
                  </div>
                ))}
              </div>
            </Card>

            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h3 className="font-medium text-green-900 dark:text-green-100 mb-2">
                ✅ Two-factor authentication is now enabled!
              </h3>
              <p className="text-sm text-green-800 dark:text-green-200">
                Your account is now more secure. You'll need to enter a code from your 
                authenticator app each time you sign in.
              </p>
            </div>

            <div className="flex gap-3">
              <Button onClick={completeSetup} className="flex-1">
                Complete Setup
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}