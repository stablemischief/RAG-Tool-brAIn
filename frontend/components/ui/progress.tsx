import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { cn } from '@/lib/utils';
import type { ProgressBarProps } from '@/types';

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & ProgressBarProps
>(({ className, value, max = 100, label, showPercentage = false, variant = 'default', animated = false, ...props }, ref) => {
  const percentage = Math.round(((value || 0) / max) * 100);
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-success';
      case 'warning':
        return 'bg-warning';
      case 'error':
        return 'bg-error';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm font-medium text-foreground">{label}</span>}
          {showPercentage && (
            <span className="text-sm text-muted-foreground">{percentage}%</span>
          )}
        </div>
      )}
      <ProgressPrimitive.Root
        ref={ref}
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-full bg-secondary',
          className
        )}
        {...props}
      >
        <ProgressPrimitive.Indicator
          className={cn(
            'h-full w-full flex-1 transition-all duration-500 ease-out',
            getVariantClasses(),
            animated && 'animate-progress'
          )}
          style={{ transform: `translateX(-${100 - percentage}%)` }}
        />
      </ProgressPrimitive.Root>
    </div>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

// Indeterminate progress bar for unknown durations
const IndeterminateProgress = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & Pick<ProgressBarProps, 'variant' | 'label'>
>(({ className, variant = 'default', label, ...props }, ref) => {
  const getVariantClasses = () => {
    switch (variant) {
      case 'success':
        return 'bg-success';
      case 'warning':
        return 'bg-warning';
      case 'error':
        return 'bg-error';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className={cn('w-full', className)} ref={ref} {...props}>
      {label && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <span className="text-sm text-muted-foreground">Processing...</span>
        </div>
      )}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            'progress-bar-indeterminate h-full w-1/3 rounded-full',
            getVariantClasses()
          )}
        />
      </div>
    </div>
  );
});
IndeterminateProgress.displayName = 'IndeterminateProgress';

// Multi-step progress component
interface MultiStepProgressProps {
  steps: Array<{
    label: string;
    status: 'pending' | 'active' | 'completed' | 'failed';
  }>;
  className?: string;
}

const MultiStepProgress: React.FC<MultiStepProgressProps> = ({ steps, className }) => {
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2',
                  step.status === 'pending' && 'border-gray-300 bg-white text-gray-400',
                  step.status === 'active' && 'border-primary bg-primary text-white',
                  step.status === 'completed' && 'border-success bg-success text-white',
                  step.status === 'failed' && 'border-error bg-error text-white'
                )}
              >
                {step.status === 'completed' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : step.status === 'failed' ? (
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : step.status === 'active' ? (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  'text-xs mt-2 text-center max-w-20',
                  step.status === 'active' && 'text-primary font-medium',
                  step.status === 'completed' && 'text-success',
                  step.status === 'failed' && 'text-error',
                  step.status === 'pending' && 'text-gray-400'
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-4',
                  index < steps.findIndex(s => s.status === 'active' || s.status === 'pending')
                    ? 'bg-success'
                    : 'bg-gray-300'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export { Progress, IndeterminateProgress, MultiStepProgress };