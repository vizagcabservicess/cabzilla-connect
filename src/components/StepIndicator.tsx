import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
  steps: Array<{
    number: number;
    title: string;
    isCompleted?: boolean;
  }>;
  onStepClick?: (stepNumber: number) => void;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, steps, onStepClick }) => {
  return (
    <div className="mb-4 flex items-start justify-center gap-1 border-b border-gray-100 bg-white px-1 py-3 sm:gap-2">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="relative flex min-w-0 flex-1 flex-col items-center">
            <button
              type="button"
              className={`w-full px-0.5 text-center text-[11px] font-semibold leading-tight transition-colors sm:text-xs ${
                currentStep === step.number
                  ? 'text-blue-600'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
              onClick={() => onStepClick?.(step.number)}
            >
              <span className="whitespace-normal sm:whitespace-nowrap">
                {step.number}. {step.title}
              </span>
            </button>
            {currentStep === step.number && (
              <div className="mt-2 h-1 w-[min(100%,4.5rem)] rounded-full bg-blue-600" aria-hidden />
            )}
          </div>
          {index < steps.length - 1 && (
            <div className="mx-0.5 mt-2 hidden h-px w-3 shrink-0 bg-gray-200 sm:block sm:w-4" aria-hidden />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
