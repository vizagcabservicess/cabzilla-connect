import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND_GREEN } from '../constants';

const STEPS = [
  { id: 1, label: 'Verify' },
  { id: 2, label: 'Details' },
  { id: 3, label: 'Review' },
] as const;

type VerificationStepperProps = {
  currentStep: 1 | 2 | 3;
};

export function VerificationStepper({ currentStep }: VerificationStepperProps) {
  return (
    <div className="border-b border-gray-100 bg-white px-4 py-5">
      <div className="mx-auto flex max-w-lg items-center justify-between">
        {STEPS.map((step, index) => {
          const done = step.id < currentStep;
          const active = step.id === currentStep;
          const upcoming = step.id > currentStep;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                    done && 'text-white',
                    active && 'text-white',
                    upcoming && 'border-2 border-gray-200 bg-white text-gray-400',
                  )}
                  style={
                    done || active
                      ? { backgroundColor: BRAND_GREEN }
                      : undefined
                  }
                >
                  {done ? <Check className="h-4 w-4" strokeWidth={3} /> : step.id}
                </div>
                <span
                  className={cn(
                    'text-[11px] font-medium',
                    active || done ? 'text-gray-900' : 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    'mx-2 mb-5 h-0.5 flex-1 rounded-full',
                    step.id < currentStep ? 'bg-green-600' : 'bg-gray-200',
                  )}
                  style={step.id < currentStep ? { backgroundColor: BRAND_GREEN } : undefined}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
