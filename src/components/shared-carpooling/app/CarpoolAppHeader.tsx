import { useNavigate } from 'react-router-dom';
import { ArrowLeft, SlidersHorizontal } from 'lucide-react';
import { Logo } from '@/components/Logo';

type CarpoolAppHeaderProps = {
  title?: string;
  showBack?: boolean;
  showLogo?: boolean;
  logoSubtitle?: string;
  showFilter?: boolean;
  onFilter?: () => void;
  backTo?: string;
  /** When set, overrides default back navigation (backTo / navigate(-1)). */
  onBack?: () => void;
  variant?: 'default' | 'branded';
};

export function CarpoolAppHeader({
  title,
  showBack = false,
  showLogo = false,
  logoSubtitle = 'Carpooling',
  showFilter = false,
  onFilter,
  backTo,
  onBack,
  variant = 'default',
}: CarpoolAppHeaderProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (backTo) {
      navigate(backTo);
      return;
    }
    navigate(-1);
  };

  if (variant === 'branded') {
    return (
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white">
        <div className="mx-auto max-w-lg px-4 py-3">
          <Logo to="/" size="small" />
        </div>
        {title && (
          <div className="mx-auto flex h-12 max-w-lg items-center gap-3 border-t border-gray-50 px-4">
            {showBack && (
              <button
                type="button"
                onClick={handleBack}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
            )}
            <h1 className="truncate text-base font-bold text-gray-900">{title}</h1>
          </div>
        )}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        <div className="flex min-w-0 items-center gap-3">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
          )}
          {showLogo && <Logo to="/" size="small" />}
          {title && !showLogo && (
            <h1 className="truncate text-base font-bold text-gray-900">{title}</h1>
          )}
        </div>
        {showFilter && (
          <button
            type="button"
            onClick={onFilter}
            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
            aria-label="Filter rides"
          >
            <SlidersHorizontal className="h-5 w-5 text-gray-600" />
          </button>
        )}
      </div>
    </header>
  );
}
