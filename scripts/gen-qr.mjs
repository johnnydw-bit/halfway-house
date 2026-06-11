import QRCode from 'qrcode';
import { Jimp } from 'jimp';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');

const URL = 'https://bgchut.vercel.app';
const QR_SIZE = 600;
const LOGO_RATIO = 0.22; // logo takes up 22% of QR width

// Generate QR as raw pixel buffer (high error correction so logo overlay is safe)
const qrBuffer = await QRCode.toBuffer(URL, {
  errorCorrectionLevel: 'H',
  width: QR_SIZE,
  margin: 2,
  color: { dark: '#2c2757', light: '#ffffff' }
});

const qr   = await Jimp.read(qrBuffer);
const logo = await Jimp.read(join(publicDir, 'logo.jpg'));

// Resize logo with a white circular background
const logoSize = Math.round(QR_SIZE * LOGO_RATIO);
const pad = Math.round(logoSize * 0.12);
const inner = logoSize - pad * 2;

logo.resize({ w: inner, h: inner });

// White square background behind logo (with slight rounding via border)
const bg = new Jimp({ width: logoSize, height: logoSize, color: 0xffffffff });
bg.composite(logo, pad, pad);

// Composite logo onto centre of QR
const x = Math.round((QR_SIZE - logoSize) / 2);
const y = Math.round((QR_SIZE - logoSize) / 2);
qr.composite(bg, x, y);

const outPath = join(publicDir, 'qr.png');
await qr.write(outPath);
console.log('QR code written to', outPath);
