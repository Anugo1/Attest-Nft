import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/Navbar";
import { Home, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        <AlertTriangle className="h-16 w-16 text-destructive mb-6 animate-pulse" />
        <h1 className="text-6xl font-bold text-gradient mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-8">Oops! Page not found</p>
        <Link to="/">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow">
            <Home className="mr-2 h-4 w-4" />
            Return to Home
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
