import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  variant?: 'default' | 'white' | 'gold';
}

export const Logo: React.FC<LogoProps> = ({ 
  className = '', 
  size = 40, 
  showText = false,
  variant = 'default'
}) => {
  const colors = {
    default: {
      bg: '#1F4D2E', // Deep elegant green
      gold: '#C5A059', // Subtle gold
      text: '#1F4D2E'
    },
    white: {
      bg: '#FFFFFF',
      gold: '#C5A059',
      text: '#FFFFFF'
    },
    gold: {
      bg: '#C5A059',
      gold: '#FFFFFF',
      text: '#C5A059'
    }
  };

  const activeColors = colors[variant];

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Main Icon Container - Rounded for App Icon feel */}
        <rect width="100" height="100" rx="22" fill={activeColors.bg} />
        
        {/* Minimalist 8-pointed star (Rub el Hizb) - Clean lines */}
        <path 
          d="M50 20L58.5 41.5L80 50L58.5 58.5L50 80L41.5 58.5L20 50L41.5 41.5L50 20Z" 
          fill={activeColors.gold} 
          fillOpacity="0.15"
        />
        <path 
          d="M50 25L56.5 43.5L75 50L56.5 56.5L50 75L43.5 56.5L25 50L43.5 43.5L50 25Z" 
          stroke={activeColors.gold} 
          strokeWidth="1.5" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        
        {/* Central Tech-Islamic Symbol: Crescent integrated with a node */}
        <path 
          d="M58 42C58 42 54 38 48 38C41.3726 38 36 43.3726 36 50C36 56.6274 41.3726 62 48 62C54 62 58 58 58 58C54 58 51 55 51 50C51 45 54 42 58 42Z" 
          fill={activeColors.gold} 
        />
        
        {/* Subtle Tech Nodes - Representing AI/Connectivity */}
        <circle cx="50" cy="25" r="2" fill={activeColors.gold} />
        <circle cx="75" cy="50" r="2" fill={activeColors.gold} />
        <circle cx="50" cy="75" r="2" fill={activeColors.gold} />
        <circle cx="25" cy="50" r="2" fill={activeColors.gold} />
      </svg>
      {showText && (
        <span className={`text-2xl font-display font-bold tracking-tight`} style={{ color: activeColors.text }}>
          Deenly
        </span>
      )}
    </div>
  );
};
