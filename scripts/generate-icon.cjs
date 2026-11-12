// Generate a real multi-resolution Windows ICO without external packages.
// The previous checked-in icon could not be decoded by NSIS on Windows runners.
const fs = require("node:fs");
const path = require("node:path");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function segmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length2 = dx * dx + dy * dy;
  const t = length2 ? clamp(((px - x1) * dx + (py - y1) * dy) / length2, 0, 1) : 0;
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function makeDib(size) {
  const xorBytes = Buffer.alloc(size * size * 4);
  const maskStride = Math.ceil(size / 32) * 4;
  const andMask = Buffer.alloc(maskStride * size);
  const stroke = size * 0.092;
  const segments = [
    [0.26, 0.70, 0.26, 0.32],
    [0.26, 0.32, 0.50, 0.57],
    [0.50, 0.57, 0.74, 0.32],
    [0.74, 0.32, 0.74, 0.70]
  ].map(([x1, y1, x2, y2]) => [
    x1 * (size - 1), y1 * (size - 1), x2 * (size - 1), y2 * (size - 1)
  ]);

  for (let y = size - 1; y >= 0; y--) {
    for (let x = 0; x < size; x++) {
      const nx = x / (size - 1);
      const ny = y / (size - 1);
      const radius = size * 0.22;
      const cx = clamp(x, radius, size - 1 - radius);
      const cy = clamp(y, radius, size - 1 - radius);
      const inside = Math.hypot(x - cx, y - cy) <= radius;
      const offset = ((size - 1 - y) * size + x) * 4;

      if (!inside) {
        xorBytes[offset + 3] = 0;
        continue;
      }

      const radial = clamp(1 - Math.hypot(nx - 0.48, ny - 0.43) / 0.82, 0, 1);
      let r = Math.round(9 + 20 * radial + 16 * (1 - ny));
      let g = Math.round(18 + 42 * radial + 12 * nx);
      let b = Math.round(36 + 112 * radial + 62 * (1 - nx));

      const edge = Math.min(x, y, size - 1 - x, size - 1 - y);
      if (edge < size * 0.055) {
        const glow = 1 - edge / (size * 0.055);
        r = Math.round(r * (1 - glow) + 49 * glow);
        g = Math.round(g * (1 - glow) + 224 * glow);
        b = Math.round(b * (1 - glow) + 255 * glow);
      }

      let mark = Infinity;
      for (const [x1, y1, x2, y2] of segments) {
        mark = Math.min(mark, segmentDistance(x, y, x1, y1, x2, y2));
      }
      if (mark < stroke) {
        const glow = clamp(1 - mark / stroke, 0, 1);
        r = Math.round(45 + 30 * glow);
        g = Math.round(202 + 42 * glow);
        b = 255;
      }

      // Small luminous core makes the M mark readable at 16px.
      if (Math.hypot(nx - 0.5, ny - 0.57) < 0.035) {
        r = 230; g = 250; b = 255;
      }

      xorBytes[offset] = b;
      xorBytes[offset + 1] = g;
      xorBytes[offset + 2] = r;
      xorBytes[offset + 3] = 255;
    }
  }

  const dib = Buffer.alloc(40 + xorBytes.length + andMask.length);
  dib.writeUInt32LE(40, 0);
  dib.writeInt32LE(size, 4);
  dib.writeInt32LE(size * 2, 8); // XOR bitmap + AND mask
  dib.writeUInt16LE(1, 12);
  dib.writeUInt16LE(32, 14);
  dib.writeUInt32LE(0, 16); // BI_RGB
  dib.writeUInt32LE(xorBytes.length, 20);
  dib.writeInt32LE(0, 24);
  dib.writeInt32LE(0, 28);
  dib.writeUInt32LE(0, 32);
  dib.writeUInt32LE(0, 36);
  xorBytes.copy(dib, 40);
  andMask.copy(dib, 40 + xorBytes.length);
  return dib;
}

function makeIco(sizes) {
  const images = sizes.map(size => ({ size, data: makeDib(size) }));
  const headerSize = 6 + images.length * 16;
  const totalSize = headerSize + images.reduce((sum, image) => sum + image.data.length, 0);
  const ico = Buffer.alloc(totalSize);
  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(images.length, 4);
  let offset = headerSize;

  images.forEach((image, index) => {
    const entry = 6 + index * 16;
    ico.writeUInt8(image.size === 256 ? 0 : image.size, entry);
    ico.writeUInt8(image.size === 256 ? 0 : image.size, entry + 1);
    ico.writeUInt8(0, entry + 2);
    ico.writeUInt8(0, entry + 3);
    ico.writeUInt16LE(1, entry + 4);
    ico.writeUInt16LE(32, entry + 6);
    ico.writeUInt32LE(image.data.length, entry + 8);
    ico.writeUInt32LE(offset, entry + 12);
    image.data.copy(ico, offset);
    offset += image.data.length;
  });
  return ico;
}

const output = path.join(__dirname, "..", "assets", "icon.ico");
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, makeIco([16, 24, 32, 48, 64, 128, 256]));
console.log("Generated MIXO GAME Windows icon:", output);
