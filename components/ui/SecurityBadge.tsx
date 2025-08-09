'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface SecurityBadgeProps {
  status: 'safe' | 'warning' | 'danger' | 'info';
  message: string;
  className?: string;
  showIcon?: boolean;
  tooltip?: string;
}

const SecurityBadge: React.FC<SecurityBadgeProps> = ({
  status,
  message,
  className,
  showIcon = true,
  tooltip,
}) => {
  const statusConfig = {
    safe: {
      icon: <ShieldCheckIcon />,
      className: 'security-badge safe',
      ariaLabel: 'Secure',
    },
    warning: {
      icon: <ExclamationTriangleIcon />,
      className: 'security-badge warning',
      ariaLabel: 'Warning',
    },
    danger: {
      icon: <ShieldExclamationIcon />,
      className: 'security-badge danger',
      ariaLabel: 'Security Risk',
    },
    info: {
      icon: <InformationCircleIcon />,
      className: 'security-badge info',
      ariaLabel: 'Information',
    },
  };

  const config = statusConfig[status];

  return (
    <span
      className={cn(config.className, className)}
      title={tooltip}
      aria-label={`${config.ariaLabel}: ${message}`}
      role="status"
    >
      {showIcon && config.icon}
      <span>{message}</span>
    </span>
  );
};

// Security Status Components for common use cases
const SessionIndicator: React.FC<{ 
  isAuthenticated: boolean;
  sessionExpiry?: Date;
  className?: string;
}> = ({ isAuthenticated, sessionExpiry, className }) => {
  if (!isAuthenticated) {
    return (
      <SecurityBadge
        status="danger"
        message="Not Authenticated"
        className={className}
        tooltip="Please sign in to access your account"
      />
    );
  }

  if (sessionExpiry) {
    const now = new Date();
    const timeUntilExpiry = sessionExpiry.getTime() - now.getTime();
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / (1000 * 60));

    if (minutesUntilExpiry < 0) {
      return (
        <SecurityBadge
          status="danger"
          message="Session Expired"
          className={className}
          tooltip="Your session has expired. Please sign in again."
        />
      );
    }

    if (minutesUntilExpiry < 5) {
      return (
        <SecurityBadge
          status="warning"
          message={`Expires in ${minutesUntilExpiry}m`}
          className={className}
          tooltip="Your session will expire soon"
        />
      );
    }
  }

  return (
    <SecurityBadge
      status="safe"
      message="Authenticated"
      className={className}
      tooltip="You are securely signed in"
    />
  );
};

const CSRFIndicator: React.FC<{ 
  isProtected: boolean;
  className?: string;
}> = ({ isProtected, className }) => {
  return (
    <SecurityBadge
      status={isProtected ? 'safe' : 'danger'}
      message={isProtected ? 'CSRF Protected' : 'CSRF Vulnerable'}
      className={className}
      tooltip={
        isProtected 
          ? 'Forms are protected against Cross-Site Request Forgery attacks'
          : 'Warning: Forms may be vulnerable to CSRF attacks'
      }
    />
  );
};

const HTTPSIndicator: React.FC<{ 
  isSecure: boolean;
  className?: string;
}> = ({ isSecure, className }) => {
  return (
    <SecurityBadge
      status={isSecure ? 'safe' : 'warning'}
      message={isSecure ? 'HTTPS Secure' : 'HTTP Insecure'}
      className={className}
      tooltip={
        isSecure
          ? 'Connection is encrypted and secure'
          : 'Connection is not encrypted - data may be visible to others'
      }
    />
  );
};

const DataEncryptionIndicator: React.FC<{ 
  isEncrypted: boolean;
  className?: string;
}> = ({ isEncrypted, className }) => {
  return (
    <SecurityBadge
      status={isEncrypted ? 'safe' : 'info'}
      message={isEncrypted ? 'Data Encrypted' : 'Data Plain'}
      className={className}
      tooltip={
        isEncrypted
          ? 'Sensitive data is encrypted before transmission'
          : 'Data is sent in plain text'
      }
    />
  );
};

// Icon Components
const ShieldCheckIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 01.678 0 11.947 11.947 0 007.078.53l.318-.094a.531.531 0 01.642.519c-.003 2.78-.687 5.491-2.013 7.973a11.954 11.954 0 01-5.043 4.842.531.531 0 01-.513 0 11.954 11.954 0 01-5.043-4.842c-1.326-2.482-2.01-5.193-2.013-7.973a.531.531 0 01.642-.519l.318.094a11.947 11.947 0 007.078-.53zM13.202 7.172a1 1 0 00-1.414-1.414L9 8.546l-1.288-1.288a1 1 0 00-1.414 1.414L8.586 11a1 1 0 001.414 0l4.202-3.828z" clipRule="evenodd" />
  </svg>
);

const ExclamationTriangleIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
);

const ShieldExclamationIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10.339 2.237a.531.531 0 00-.678 0 11.947 11.947 0 01-7.078.53l-.318-.094a.531.531 0 00-.642.519c.003 2.78.687 5.491 2.013 7.973a11.954 11.954 0 005.043 4.842.531.531 0 00.513 0 11.954 11.954 0 005.043-4.842c1.326-2.482 2.01-5.193 2.013-7.973a.531.531 0 00-.642-.519l-.318.094a11.947 11.947 0 01-7.078-.53zM10 6.75a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6.75zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
);

const InformationCircleIcon = () => (
  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5v2.25a.75.75 0 001.5 0V10a.75.75 0 00-.75-.75H9z" clipRule="evenodd" />
  </svg>
);

export { 
  SecurityBadge, 
  SessionIndicator, 
  CSRFIndicator, 
  HTTPSIndicator, 
  DataEncryptionIndicator 
};