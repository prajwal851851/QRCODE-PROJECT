import React from "react";

interface PricingCardProps {
  title: string;
  price: string;
  features: string[];
  buttonText?: string;
  onButtonClick?: () => void;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  title,
  price,
  features,
  buttonText,
  onButtonClick,
}) => {
  return (
    <div className="rounded-lg border bg-white dark:bg-gray-900 shadow p-6 flex flex-col items-center w-full max-w-sm mx-auto">
      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{title}</h3>
      <div className="text-3xl font-bold mb-4 text-orange-600 dark:text-orange-400">{price}</div>
      <ul className="mb-6 w-full text-left space-y-2">
        {features.map((feature, idx) => (
          <li key={idx} className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-orange-500 rounded-full"></span>
            {feature}
          </li>
        ))}
      </ul>
      {buttonText && (
        <button
          onClick={onButtonClick}
          className="mt-auto px-6 py-2 rounded bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors"
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}; 