import { Link } from 'react-router-dom';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { GlowCard } from '@/components/GlowCard';
import { Hexagon, Zap, Shield, QrCode, Sparkles, ArrowRight, Calendar, Gift } from 'lucide-react';
import heroImage from '@/assets/hero-cyberpunk.png';

const Index = () => {
  const features = [
    {
      icon: QrCode,
      title: 'QR-Based Claims',
      description: 'Generate unique QR codes for each event. Attendees scan and claim their NFT instantly.',
      color: 'text-primary',
    },
    {
      icon: Shield,
      title: 'On-Chain Proof',
      description: 'Every Attest NFT is minted on Solana, providing immutable proof of participation.',
      color: 'text-secondary',
    },
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Powered by Solana and Metaplex for sub-second minting with minimal gas fees.',
      color: 'text-accent',
    },
    {
      icon: Sparkles,
      title: 'Beautiful NFTs',
      description: 'Create stunning Attest NFTs with custom artwork and metadata.',
      color: 'text-neon-green',
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section with Background Image */}
      <section className="relative pt-32 pb-20 px-4 min-h-[90vh] flex items-center">
        {/* Background Image */}
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
        </div>
        
        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-2 mb-8">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm text-primary font-medium">Powered by Solana & Metaplex</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-gradient">On-Chain</span>
            <br />
            <span className="text-foreground">Attest NFTs</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
            Create unforgettable event experiences with blockchain-verified attendance. 
            Mint unique NFTs for your attendees in seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/events/create">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow-lg px-8 py-6 text-lg">
                <Calendar className="mr-2 h-5 w-5" />
                Create Event
              </Button>
            </Link>
            <Link to="/events">
              <Button size="lg" variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 px-8 py-6 text-lg">
                <Gift className="mr-2 h-5 w-5" />
                Claim NFT
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 relative">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            <span className="text-gradient">Why Choose</span> Attest
          </h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-16">
            The most powerful and user-friendly platform for creating and distributing Attest NFTs.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <GlowCard key={index} glowColor={index % 3 === 0 ? 'purple' : index % 3 === 1 ? 'cyan' : 'pink'}>
                <feature.icon className={`h-12 w-12 ${feature.color} mb-4`} />
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </GlowCard>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 relative">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            How It <span className="text-gradient">Works</span>
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '01', title: 'Create Event', desc: 'Set up your event with custom NFT artwork and metadata.' },
              { step: '02', title: 'Share QR Code', desc: 'Display or share the unique QR code at your event.' },
              { step: '03', title: 'Attendees Claim', desc: 'Attendees scan, connect wallet, and receive their NFT.' },
            ].map((item, index) => (
              <div key={index} className="relative">
                <GlowCard className="text-center h-full">
                  <div className="text-6xl font-bold text-primary/20 mb-4">{item.step}</div>
                  <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground text-sm">{item.desc}</p>
                </GlowCard>
                {index < 2 && (
                  <ArrowRight className="hidden md:block absolute -right-6 top-1/2 -translate-y-1/2 h-8 w-8 text-primary z-10" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <GlowCard className="text-center py-16 px-8 neon-border">
            <Hexagon className="h-16 w-16 mx-auto text-primary mb-6 animate-pulse-glow" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">
              Join the future of event attendance. Create your first event and start minting NFTs today.
            </p>
            <Link to="/events/create">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 glow px-8 py-6 text-lg">
                Create Your First Event
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </GlowCard>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border/50">
        <div className="container mx-auto text-center text-muted-foreground text-sm">
          <p>Built on Solana Devnet • Powered by Metaplex</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
