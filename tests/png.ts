import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

/** Minimal offline decoder for our noninterlaced 8-bit RGBA PNG exports. No game dependency. */
export function readRgbaPng(path: string) {
  const file = readFileSync(path);
  if (file.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Not PNG');
  const width = file.readUInt32BE(16);
  const height = file.readUInt32BE(20);
  if (file[24] !== 8 || file[25] !== 6 || file[28] !== 0) throw new Error('Expected RGBA8');
  const chunks: Buffer[] = [];
  for (let offset = 8; offset < file.length;) {
    const length = file.readUInt32BE(offset);
    if (file.toString('ascii', offset + 4, offset + 8) === 'IDAT') {
      chunks.push(file.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }
  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * 4;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]!;
    if (filter > 4) throw new Error('Invalid PNG filter');
    for (let x = 0; x < stride; x++) {
      const index = y * stride + x;
      const left = x >= 4 ? pixels[index - 4]! : 0;
      const up = y > 0 ? pixels[index - stride]! : 0;
      const upperLeft = y > 0 && x >= 4 ? pixels[index - stride - 4]! : 0;
      const predictor = [0, left, up, Math.floor((left + up) / 2), paeth(left, up, upperLeft)][
        filter
      ]!;
      pixels[index] = (raw[y * (stride + 1) + 1 + x]! + predictor) & 255;
    }
  }
  return { width, height, alpha: (x: number, y: number) => pixels[(y * width + x) * 4 + 3]! };
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a),
    pb = Math.abs(p - b),
    pc = Math.abs(p - c);
  return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
}

/** JPEG frame size from the first SOF marker. */
export function jpegSize(path: string): { width: number; height: number } {
  const file = readFileSync(path);
  for (let offset = 2; offset < file.length;) {
    const marker = file[offset + 1]!;
    const length = file.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc2) {
      return { height: file.readUInt16BE(offset + 5), width: file.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error('No SOF marker');
}
