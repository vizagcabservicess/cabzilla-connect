
interface MobileSearchButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function MobileSearchButton({ onClick, disabled = false }: MobileSearchButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled) {
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`w-full py-3.5 rounded-lg text-white font-medium text-lg bg-purple-500 ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:bg-purple-600 active:bg-purple-700 transition-colors duration-150"
      }`}
      type="button"
    >
      SEARCH
    </button>
  );
}
