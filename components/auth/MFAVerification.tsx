'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';

interface MFAVerificationProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}

export function MFAVerification({ onSuccess, onError }: MFAVerificationProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBackupCode, setShowBackupCode] = useState(false);

  const verifyCode = async () => {
    if (!code.trim()) return;

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      onSuccess();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verifyCode();
    }
  };

  return (
    <Card className="max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-6 h-6 text-blue-600 dark:text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Two-Factor Authentication</h2>
        <p className="text-gray-600 dark:text-gray-300">
          {showBackupCode 
            ? 'Enter one of your backup codes:'
            : 'Enter the 6-digit code from your authenticator app:'
          }
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Input
            type="text"
            value={code}
            onChange={(e) => setCode(
              showBackupCode 
                ? e.target.value.toUpperCase()
                : e.target.value.replace(/\D/g, '').slice(0, 6)
            )}
            onKeyPress={handleKeyPress}
            placeholder={showBackupCode ? 'XXXX-XXXX' : '123456'}
            className="text-center text-lg tracking-widest"
            maxLength={showBackupCode ? 9 : 6}
            autoComplete="one-time-code"
            autoFocus
          />
        </div>

        <Button
          onClick={verifyCode}
          disabled={isLoading || !code.trim()}
          className="w-full"
        >
          {isLoading ? 'Verifying...' : 'Verify'}
        </Button>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setShowBackupCode(!showBackupCode);
              setCode('');
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {showBackupCode 
              ? 'Use authenticator app instead'
              : 'Use backup code instead'
            }
          </button>
        </div>

        {showBackupCode && (
          <Alert type="info">
            <strong>Using a backup code?</strong> Each backup code can only be used once. 
            Make sure to generate new ones when you're running low.
          </Alert>
        )}
      </div>
    </Card>
  );
}