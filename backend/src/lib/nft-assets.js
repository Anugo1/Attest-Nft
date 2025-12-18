import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

const safeFilename = (value) => value.replace(/[^a-z0-9-_]/gi, '_');

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const fileExists = async (targetPath) => {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
};

const formatDate = (dateValue) => {
  const d = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  // YYYY-MM-DD (keeps metadata compact and consistent)
  return d.toISOString().slice(0, 10);
};

const buildSvgOverlay = ({ title, subtitleLines }) => {
  // 1024x1024 overlay. We draw a semi-transparent panel + text.
  const subtitle = subtitleLines.filter(Boolean).join(' • ');

  // Escape XML special chars
  const esc = (s) => String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  return Buffer.from(`
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000" stop-opacity="0" />
      <stop offset="70%" stop-color="#000" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#000" stop-opacity="0.65" />
    </linearGradient>
  </defs>

  <!-- bottom fade for readability -->
  <rect x="0" y="0" width="1024" height="1024" fill="url(#fade)" />

  <!-- text container -->
  <rect x="64" y="740" rx="28" ry="28" width="896" height="220" fill="#000" opacity="0.35" />

  <text x="96" y="820" font-family="Arial, Helvetica, sans-serif" font-size="56" font-weight="700" fill="#fff">
    ${esc(title)}
  </text>

  <text x="96" y="890" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="400" fill="#E5E7EB">
    ${esc(subtitle)}
  </text>

  <text x="96" y="940" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="600" fill="#93C5FD">
    Proof of Attendance
  </text>
</svg>
  `.trim());
};

const buildFallbackBackgroundSvg = () => Buffer.from(`
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#050814" />
      <stop offset="55%" stop-color="#0B1028" />
      <stop offset="100%" stop-color="#12051D" />
    </linearGradient>

    <radialGradient id="glowCyan" cx="30%" cy="30%" r="55%">
      <stop offset="0%" stop-color="#22D3EE" stop-opacity="0.55" />
      <stop offset="60%" stop-color="#22D3EE" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="glowPink" cx="75%" cy="55%" r="60%">
      <stop offset="0%" stop-color="#FB7185" stop-opacity="0.40" />
      <stop offset="65%" stop-color="#FB7185" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="glowPurple" cx="55%" cy="85%" r="65%">
      <stop offset="0%" stop-color="#A78BFA" stop-opacity="0.35" />
      <stop offset="70%" stop-color="#A78BFA" stop-opacity="0" />
    </radialGradient>

    <filter id="softNoise" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0" />
    </filter>
  </defs>

  <rect width="1024" height="1024" fill="url(#bg)" />
  <rect width="1024" height="1024" fill="url(#glowCyan)" />
  <rect width="1024" height="1024" fill="url(#glowPink)" />
  <rect width="1024" height="1024" fill="url(#glowPurple)" />

  <g opacity="0.28">
    <path d="M0 680 C 180 610, 300 760, 520 700 S 860 560, 1024 640" fill="none" stroke="#22D3EE" stroke-opacity="0.35" stroke-width="2" />
    <path d="M0 720 C 220 650, 360 820, 560 740 S 900 580, 1024 700" fill="none" stroke="#A78BFA" stroke-opacity="0.28" stroke-width="2" />
    <path d="M0 760 C 250 700, 420 860, 610 780 S 920 640, 1024 740" fill="none" stroke="#FB7185" stroke-opacity="0.22" stroke-width="2" />
  </g>

  <rect width="1024" height="1024" filter="url(#softNoise)" />
</svg>
`.trim());

/**
 * Generates (or re-generates) a per-event image and a matching Metaplex metadata JSON.
 *
 * Files are written under: backend/public/nft/images + backend/public/nft/metadata
 * and should be served publicly by the backend.
 */
export async function generateEventNftAssets({
  event,
  publicBaseUrl,
  backgroundPath,
}) {
  if (!event?.id) {
    throw new Error('generateEventNftAssets: event.id is required');
  }
  if (!publicBaseUrl) {
    throw new Error('generateEventNftAssets: publicBaseUrl is required');
  }

  const publicRoot = path.join(process.cwd(), 'public', 'nft');
  const imagesDir = path.join(publicRoot, 'images');
  const metadataDir = path.join(publicRoot, 'metadata');

  await ensureDir(imagesDir);
  await ensureDir(metadataDir);

  const bgPath = backgroundPath || path.join(publicRoot, 'templates', 'background.png');

  // Cache-buster so wallets refresh if you regenerate
  const version = crypto.randomBytes(4).toString('hex');

  const imageFilename = `${safeFilename(event.id)}-${version}.png`;
  const metadataFilename = `${safeFilename(event.id)}-${version}.json`;

  const imageOutPath = path.join(imagesDir, imageFilename);
  const metadataOutPath = path.join(metadataDir, metadataFilename);

  const subtitleLines = [
    formatDate(event.event_date),
    event.location || '',
  ];

  const svg = buildSvgOverlay({
    title: `${event.name} — Attendance`,
    subtitleLines,
  });

  const hasBackground = await fileExists(bgPath);

  if (hasBackground) {
    await sharp(bgPath)
      .resize(1024, 1024, { fit: 'cover' })
      .composite([{ input: svg, top: 0, left: 0 }])
      .png({ compressionLevel: 9 })
      .toFile(imageOutPath);
  } else {
    const fallbackBg = buildFallbackBackgroundSvg();
    await sharp({
      create: {
        width: 1024,
        height: 1024,
        channels: 4,
        background: '#050814',
      },
    })
      .composite([
        { input: fallbackBg, top: 0, left: 0 },
        { input: svg, top: 0, left: 0 },
      ])
      .png({ compressionLevel: 9 })
      .toFile(imageOutPath);
  }

  const imageUrl = `${publicBaseUrl.replace(/\/+$/, '')}/nft/images/${imageFilename}`;

  const metadata = {
    name: `${event.name} - Attendance`,
    symbol: 'ATTEND',
    description: `Proof of attendance for ${event.name}${event.location ? ` at ${event.location}` : ''}${event.event_date ? ` on ${formatDate(event.event_date)}` : ''}.`,
    image: imageUrl,
    attributes: [
      { trait_type: 'Event', value: event.name },
      ...(event.location ? [{ trait_type: 'Location', value: event.location }] : []),
      ...(event.event_date ? [{ trait_type: 'Date', value: formatDate(event.event_date) }] : []),
    ],
    properties: {
      category: 'image',
      files: [{ uri: imageUrl, type: 'image/png' }],
    },
  };

  await fs.writeFile(metadataOutPath, JSON.stringify(metadata, null, 2), 'utf8');

  const metadataUrl = `${publicBaseUrl.replace(/\/+$/, '')}/nft/metadata/${metadataFilename}`;

  return {
    imageUrl,
    metadataUrl,
    imageFilename,
    metadataFilename,
  };
}
