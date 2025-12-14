import { Link, useLocation } from 'react-router-dom';
import { WalletButton } from './WalletButton';
import { Hexagon, Calendar, Gift, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Navbar() {
  const location = useLocation();
  
  const links = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/events', label: 'Events', icon: Calendar },
    { href: '/claim', label: 'Claim', icon: Gift },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Hexagon className="h-8 w-8 text-primary animate-pulse-glow" />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">A</span>
              </div>
            </div>
            <span className="text-xl font-bold text-gradient">Attest</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                to={href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300",
                  location.pathname === href
                    ? "bg-primary/20 text-primary neon-border"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>

          <WalletButton />
        </div>
      </div>
    </nav>
  );
}
