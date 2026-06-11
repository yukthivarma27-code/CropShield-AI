import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  onClick?: () => void;
  className?: string;
  hoverEffect?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  onClick,
  className = '',
  hoverEffect = false
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800/80 rounded-3xl p-5 shadow-sm transition-all duration-300 ${
        hoverEffect ? 'hover:shadow-md hover:border-gray-200 dark:hover:border-zinc-700/80 cursor-pointer active:scale-[0.98]' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {title && (
        <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50 mb-3 tracking-tight">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
};
