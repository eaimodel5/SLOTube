import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TileProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onClick?: () => void;
  to?: string;
  className?: string;
  isActive?: boolean;
}

export const Tile: React.FC<TileProps> = ({
  title,
  subtitle,
  icon,
  rightIcon,
  onClick,
  to,
  className = '',
  isActive = false
}) => {
  const content = (
    <div 
      onClick={!to ? onClick : undefined}
      className={`flex items-center gap-3 px-4 py-3 bg-white border ${isActive ? 'bg-zinc-900 border-zinc-900 ring-1 ring-zinc-900 text-white' : 'border-zinc-200 text-zinc-900'} rounded-xl shadow-sm ${(onClick || to) && !isActive ? 'cursor-pointer hover:bg-zinc-50 hover:border-zinc-300' : ''} transition-all w-full text-left ${className}`}
    >
      {icon && (
        <div className={`shrink-0 flex items-center justify-center min-w-[3.5rem] ${isActive ? 'text-white' : 'text-zinc-500'}`}>
          {icon}
        </div>
      )}
      
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h3 className={`text-[15px] font-bold leading-tight truncate ${isActive ? 'text-white' : 'text-zinc-900'}`}>
          {title}
        </h3>
        {subtitle && (
          <p className={`text-[13px] leading-snug mt-0.5 line-clamp-2 ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
            {subtitle}
          </p>
        )}
      </div>

      {(onClick || to || rightIcon) && (
        <div className="shrink-0 ml-1 flex items-center justify-center">
          {rightIcon || <ChevronRight className={`w-5 h-5 ${isActive ? 'text-zinc-400' : 'text-zinc-400'}`} />}
        </div>
      )}
    </div>
  );

  if (to) {
    return <Link to={to} className="w-full block" onClick={onClick}>{content}</Link>;
  }

  return content;
};

