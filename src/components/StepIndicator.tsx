import React from 'react';

interface StepIndicatorProps {
  currentStep: number;
  steps: Array<{
    number: number;
    title: string;
    isCompleted?: boolean;
  }>;
}

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
    <div className="flex items-center justify-center mb-4 px-2 bg-white py-3 rounded-lg shadow-sm">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="flex flex-col items-center relative flex-1">
            <span 
              className={`text-sm font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                currentStep === step.number 
                  ? 'text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              onClick={() => onStepClick && onStepClick(step.number)}
            >
              {step.number}. {step.title}
            </span>
            {currentStep === step.number && (
              <div className="w-full h-1 bg-blue-600 mt-1 rounded-full"></div>
            )}
          </div>
          {index < steps.length - 1 && (
            <div className="w-4 h-0.5 bg-gray-300 mx-2"></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};
