import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'purple' | 'cyan' | 'pink';
  hover?: boolean;
}

export function GlowCard({ children, className, glowColor = 'purple', hover = true }: GlowCardProps) {
  const glowStyles = {
    purple: 'hover:shadow-glow',
    cyan: 'hover:shadow-glow-cyan',
    pink: 'hover:shadow-glow-pink',
  };

  return (
    <div
      className={cn(
        "glass rounded-lg p-6 transition-all duration-300",
        hover && glowStyles[glowColor],
        hover && "hover:border-primary/50 hover:-translate-y-1",
        className
      )}
    >
      {children}
    </div>
  );
}
