import { Link, useLocation } from 'react-router-dom';
import { MultiWalletButton } from './MultiWalletButton';
import { Hexagon, Calendar, Gift, Home, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  
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

          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <MultiWalletButton />
            </div>
            
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="text-foreground">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] glass">
                <nav className="flex flex-col gap-4 mt-8">
                  {links.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      to={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 text-lg",
                        location.pathname === href
                          ? "bg-primary/20 text-primary neon-border"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </Link>
                  ))}
                  <div className="mt-4 px-4">
                    <MultiWalletButton />
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
