import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { GlowCard } from './GlowCard';
import { Loader2 } from 'lucide-react';

interface QRCodeDisplayProps {
  data: string;
  size?: number;
  title?: string;
}

export function QRCodeDisplay({ data, size = 256, title }: QRCodeDisplayProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateQR = async () => {
      try {
        setLoading(true);
        const url = await QRCode.toDataURL(data, {
          width: size,
          margin: 2,
          color: {
            dark: '#a855f7',
            light: '#1a1625',
          },
        });
        setQrDataUrl(url);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      } finally {
        setLoading(false);
      }
    };

    if (data) {
      generateQR();
    }
  }, [data, size]);

  return (
    <GlowCard className="flex flex-col items-center gap-4">
      {title && <h3 className="text-lg font-semibold text-primary">{title}</h3>}
      <div className="relative p-4 bg-card rounded-lg neon-border">
        {loading ? (
          <div className="flex items-center justify-center" style={{ width: size, height: size }}>
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : qrDataUrl ? (
          <img src={qrDataUrl} alt="QR Code" className="rounded" />
        ) : (
          <div className="flex items-center justify-center text-muted-foreground" style={{ width: size, height: size }}>
            Failed to generate QR
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground font-mono break-all max-w-xs text-center">
        {data}
      </p>
    </GlowCard>
  );
}
