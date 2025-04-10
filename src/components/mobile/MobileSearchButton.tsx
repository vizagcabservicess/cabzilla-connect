
interface MobileSearchButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function MobileSearchButton({ onClick, disabled = false }: MobileSearchButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-4 rounded-lg text-white font-medium text-lg bg-gradient-to-r from-blue-500 to-blue-400 ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:from-blue-600 hover:to-blue-500"
      }`}
    >
      SEARCH
    </button>
  );
}
