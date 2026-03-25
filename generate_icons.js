const fs = require('fs');
const path = require('path');

function createSolidColorPNG(width, height, r, g, b) {
  // Simple PNG format for a solid color
  // PNG header
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  
  // IHDR chunk
  const ihdrData = Buffer.allocUnsafe(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bits per channel
  ihdrData[9] = 2; // color type: RGB
  ihdrData[10] = 0; // compression method
  ihdrData[11] = 0; // filter method
  ihdrData[12] = 0; // interlace method
  
  const ihdrChunk = createChunk('IHDR', ihdrData);
  
  // IDAT chunk (pixel data)
  // Each scanline starts with a filter type (0 for None)
  // Each pixel is 3 bytes (R, G, B)
  const rowSize = 1 + width * 3;
  const pixelData = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    pixelData[y * rowSize] = 0; // Filter type: None
    for (let x = 0; x < width; x++) {
      const offset = y * rowSize + 1 + x * 3;
      pixelData[offset] = r;
      pixelData[offset + 1] = g;
      pixelData[offset + 2] = b;
    }
  }
  
  // Minimal compression (not actually compressed, just zlib format)
  // Zlib header: 0x78 0x01 (No compression)
  // Adler-32 checksum at the end
  const idatData = zlibNoCompression(pixelData);
  const idatChunk = createChunk('IDAT', idatData);
  
  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const buf = Buffer.allocUnsafe(data.length + 12);
  buf.writeUInt32BE(data.length, 0);
  buf.write(type, 4);
  data.copy(buf, 8);
  const crc = crc32(Buffer.concat([Buffer.from(type), data])) >>> 0;
  buf.writeUInt32BE(crc, data.length + 8);
  return buf;
}

function zlibNoCompression(data) {
  const header = Buffer.from([0x78, 0x01]);
  const chunks = [];
  const chunkSize = 65535;
  for (let i = 0; i < data.length; i += chunkSize) {
    const isLast = (i + chunkSize >= data.length);
    const size = Math.min(chunkSize, data.length - i);
    const nsize = (~size & 0xFFFF);
    const chunkHead = Buffer.alloc(5);
    chunkHead[0] = isLast ? 0x01 : 0x00;
    chunkHead[1] = size & 0xFF;
    chunkHead[2] = (size >> 8) & 0xFF;
    chunkHead[3] = nsize & 0xFF;
    chunkHead[4] = (nsize >> 8) & 0xFF;
    chunks.push(chunkHead);
    chunks.push(data.slice(i, i + size));
  }
  const adler = adler32(data);
  const footer = Buffer.alloc(4);
  footer.writeUInt32BE(adler, 0);
  return Buffer.concat([header, ...chunks, footer]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function adler32(buf) {
  let s1 = 1, s2 = 0;
  for (let i = 0; i < buf.length; i++) {
    s1 = (s1 + buf[i]) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  return ((s2 << 16) | s1) >>> 0;
}

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir);

// Yellow: #FFFF00 -> RGB (255, 255, 0)
const yellow = [255, 255, 0];

fs.writeFileSync(path.join(iconsDir, 'icon16.png'), createSolidColorPNG(16, 16, ...yellow));
fs.writeFileSync(path.join(iconsDir, 'icon48.png'), createSolidColorPNG(48, 48, ...yellow));
fs.writeFileSync(path.join(iconsDir, 'icon128.png'), createSolidColorPNG(128, 128, ...yellow));

console.log('Icons generated successfully.');
