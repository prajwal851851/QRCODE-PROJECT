import React from "react";

interface PricingCardProps {
  title: string;
  price: string;
  features: string[];
  description?: string;
  buttonText?: string;
  buttonVariant?: 'outline' | 'solid';
  onButtonClick?: () => void;
  popular?: boolean;
}

export const PricingCard: React.FC<PricingCardProps> = ({
  title,
  price,
  features,
  description,
  buttonText,
  buttonVariant = 'solid',
  onButtonClick,
  popular,
}) => {
  return (
    <div className="relative rounded-lg border bg-white dark:bg-gray-900 shadow p-6 flex flex-col items-center w-full max-w-sm mx-auto">
      {popular && (
        <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
      )}
      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">{title}</h3>
      <div className="text-3xl font-bold mb-2 text-orange-600 dark:text-orange-400">{price}</div>
      {description && <div className="mb-4 text-gray-600 dark:text-gray-300 text-center">{description}</div>}
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
          className={`mt-auto px-6 py-2 rounded font-semibold transition-colors
            ${buttonVariant === 'outline'
              ? 'bg-transparent border-2 border-orange-500 text-orange-600 hover:bg-orange-50 dark:hover:bg-gray-800'
              : 'bg-orange-500 hover:bg-orange-600 text-white'}
          `}
        >
          {buttonText}
        </button>
      )}
    </div>
  );
}; 