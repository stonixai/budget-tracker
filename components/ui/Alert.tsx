'use client';

import React, { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  showIcon?: boolean;
  dismissible?: boolean;
  onDismiss?: () => void;
  children?: React.ReactNode;
}

const Alert = forwardRef<HTMLDivElement, AlertProps>(
  ({
    variant = 'info',
    title,
    description,
    icon,
    showIcon = true,
    dismissible = false,
    onDismiss,
    className,
    children,
    ...props
  }, ref) => {
    const variantClasses = {
      success: 'alert-success',
      warning: 'alert-warning',
      error: 'alert-error',
      info: 'alert-info',
    };

    const defaultIcons = {
      success: <CheckCircleIcon />,
      warning: <ExclamationTriangleIcon />,
      error: <XCircleIcon />,
      info: <InformationCircleIcon />,
    };

    const displayIcon = icon || (showIcon ? defaultIcons[variant] : null);

    return (
      <div
        ref={ref}
        className={cn('alert', variantClasses[variant], className)}
        role={variant === 'error' ? 'alert' : 'status'}
        {...props}
      >
        {displayIcon && (
          <div className="flex-shrink-0">
            {displayIcon}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          {title && (
            <h3 className="text-sm font-medium mb-1">
              {title}
            </h3>
          )}
          
          {description && (
            <p className="text-sm opacity-90">
              {description}
            </p>
          )}
          
          {children && (
            <div className="mt-2">
              {children}
            </div>
          )}
        </div>
        
        {dismissible && onDismiss && (
          <button
            type="button"
            className="flex-shrink-0 ml-4 p-1 rounded-md hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-50 transition-colors"
            onClick={onDismiss}
            aria-label="Dismiss alert"
          >
            <XMarkIcon />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';

// Icon Components
const CheckCircleIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
  </svg>
);

const ExclamationTriangleIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const XCircleIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const InformationCircleIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
  </svg>
);

const XMarkIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export { Alert };