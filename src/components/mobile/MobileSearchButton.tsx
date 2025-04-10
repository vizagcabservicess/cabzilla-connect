
interface MobileSearchButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function MobileSearchButton({ onClick, disabled = false }: MobileSearchButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-4 rounded-lg text-white font-medium text-lg bg-gradient-to-r from-purple-600 to-blue-500 ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:from-purple-700 hover:to-blue-600 transition-all"
      }`}
    >
      SEARCH
    </button>
  );
}
