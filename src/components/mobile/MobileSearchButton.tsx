
interface MobileSearchButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function MobileSearchButton({ onClick, disabled = false }: MobileSearchButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full py-4 rounded-lg text-white font-medium text-lg bg-gradient-to-r from-purple-500 to-indigo-600 shadow-md ${
        disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-lg active:shadow-sm transform active:scale-[0.99] transition-all duration-150"
      }`}
    >
      SEARCH
    </button>
  );
}
