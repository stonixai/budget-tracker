'use client';

import React, { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animated?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  lines = 1,
  animated = true,
  className,
  style,
  ...props
}) => {
  const baseClass = cn(
    'skeleton',
    !animated && 'bg-gray-200',
    variant === 'circular' && 'rounded-full',
    variant === 'text' && 'skeleton-text',
    className
  );

  const baseStyle = {
    width,
    height,
    ...style,
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              baseClass,
              index === lines - 1 && 'w-3/4' // Last line is shorter
            )}
            style={baseStyle}
          />
        ))}
      </div>
    );
  }

  return <div className={baseClass} style={baseStyle} {...props} />;
};

// Predefined skeleton components for common use cases
const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return <Skeleton variant="circular" className={sizeClasses[size]} />;
};

const SkeletonButton: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-20',
    md: 'h-10 w-24',
    lg: 'h-12 w-32',
  };

  return <Skeleton variant="rectangular" className={cn('rounded-lg', sizeClasses[size])} />;
};

const SkeletonCard: React.FC = () => {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center space-x-4">
        <SkeletonAvatar />
        <div className="flex-1">
          <Skeleton variant="text" className="h-4 w-1/2" />
          <Skeleton variant="text" className="h-3 w-1/4 mt-1" />
        </div>
      </div>
      <Skeleton variant="text" lines={3} />
      <div className="flex justify-between items-center">
        <Skeleton variant="text" className="h-3 w-1/4" />
        <SkeletonButton size="sm" />
      </div>
    </div>
  );
};

const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => {
  return (
    <div className="card overflow-hidden">
      {/* Table Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <Skeleton key={`header-${index}`} variant="text" className="h-4 w-3/4" />
          ))}
        </div>
      </div>
      
      {/* Table Body */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={`row-${rowIndex}`} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton 
                  key={`cell-${rowIndex}-${colIndex}`} 
                  variant="text" 
                  className="h-4"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const SkeletonDashboard: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <Skeleton variant="text" className="h-8 w-48" />
          <Skeleton variant="text" className="h-4 w-32 mt-2" />
        </div>
        <SkeletonButton />
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`stat-${index}`} className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <Skeleton variant="text" className="h-4 w-20" />
              <Skeleton variant="circular" className="w-6 h-6" />
            </div>
            <Skeleton variant="text" className="h-8 w-24" />
            <Skeleton variant="text" className="h-3 w-16 mt-2" />
          </div>
        ))}
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
};

export { 
  Skeleton, 
  SkeletonAvatar, 
  SkeletonButton, 
  SkeletonCard, 
  SkeletonTable, 
  SkeletonDashboard 
};