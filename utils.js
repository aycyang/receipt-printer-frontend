/**
 * Parse a hexadecimal string into a Uint8Array.
 *
 * Accepts:
 *  - Undelimited hex:         "AABBCC"
 *  - Mixed delimiters:        "AA BB-CC_DD|EE,FF:00"
 *  - 0x-prefixed tokens:      "0xAA 0xbb 0X0C"
 *  - Any casing
 *
 * Options:
 *  - allow0x:        treat "0x"/"0X" as a delimiter before hex tokens (default: true)
 *  - strict:         throw on any non-hex, non-delimiter character (default: true)
 *  - allowedDelims:  characters to ignore as delimiters (default: /\s|[,;:_\-\|\.\/\\]/)
 *  - padOdd:         if odd number of nibbles, pad a '0' ("left" -> 0x0? ; "right" -> ?0) or false to throw (default: false)
 *
 * Examples:
 *   hexToBytes("AABBCC");                      // Uint8Array [0xAA, 0xBB, 0xCC]
 *   hexToBytes("AA BB-CC_DD");                 // Uint8Array [0xAA, 0xBB, 0xCC, 0xDD]
 *   hexToBytes("0xAA 0xbb");                   // Uint8Array [0xAA, 0xBB]
 *   hexToBytes("ABC", { padOdd: "left" });     // Uint8Array [0x0A, 0xBC]
 *
 * @param {string} input
 * @returns {Uint8Array}
 */
export function hexToBytes(input) {
  let opts = {};

  const allow0x = opts?.allow0x ?? true;
  const strict = opts?.strict ?? true;
  const allowedDelims = opts?.allowedDelims ?? /\s|[,;:_\-\|\.\/\\]/; // space, comma, semicolon, colon, underscore, dash, pipe, dot, slash, backslash
  const padOdd = opts?.padOdd ?? "right";

  if (typeof input !== "string") {
    throw new TypeError("hexToBytes: input must be a string");
  }
  if (input.length === 0) return new Uint8Array(0);

  // Fast nibble lookup for ASCII
  // Returns 0..15 for [0-9a-fA-F], -1 otherwise.
  const nibble = (code) => {
    // '0'..'9'
    if (code >= 48 && code <= 57) return code - 48;
    // 'A'..'F'
    if (code >= 65 && code <= 70) return code - 55; // 'A'(65) -> 10
    // 'a'..'f'
    if (code >= 97 && code <= 102) return code - 87; // 'a'(97) -> 10
    return -1;
  };

  const bytes = [];
  let haveHigh = false; // whether we've captured a high nibble
  let high = 0;

  const err = (idx, msg) => {
    // Show a small caret context for easier debugging
    const start = Math.max(0, idx - 10);
    const end = Math.min(input.length, idx + 10);
    const snippet = input.slice(start, end);
    const caret = " ".repeat(idx - start) + "^";
    return new Error(`${msg} at index ${idx}\n${snippet}\n${caret}`);
  };

  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    const n = nibble(c);

    if (n !== -1) {
      if (!haveHigh) {
        high = n;
        haveHigh = true;
      } else {
        bytes.push((high << 4) | n);
        haveHigh = false;
      }
      continue;
    }

    // Not a hex digit. See if it's an allowed delimiter or a 0x prefix.
    const ch = input[i];

    // Handle 0x / 0X token prefixes like "0xAA"
    if (allow0x && ch === "0" && i + 1 < input.length) {
      const nx = input[i + 1];
      if (nx === "x" || nx === "X") {
        // Only treat as prefix if next-next is a hex digit; otherwise fall through to delimiter handling / error
        const nn = i + 2 < input.length ? nibble(input.charCodeAt(i + 2)) : -1;
        if (nn !== -1) {
          i += 1; // skip the 'x' or 'X'
          continue;
        }
      }
    }

    // Allowed delimiters (whitespace, punctuation commonly used as separators)
    if (allowedDelims.test(ch)) {
      continue;
    }

    // If we get here, it's an unexpected character.
    if (strict) {
      throw err(
        i,
        `Invalid character '${ch}' (0x${c.toString(16)}) in hex string`
      );
    } // else: silently ignore
  }

  // If we end on a dangling high nibble, decide what to do.
  if (haveHigh) {
    if (padOdd === "right") {
      // e.g., "ABC" -> A B C? -> last nibble becomes high nibble and low nibble 0
      bytes.push((high << 4) | 0);
    } else if (padOdd === "left") {
      // e.g., "ABC" -> 0A BC
      // We need to transform the *first* solo nibble into 0x0?; but we only kept state for the last one.
      // Easiest fix: re-run with a leading '0' prepended.
      return hexToBytes("0" + input, {
        allow0x,
        strict,
        allowedDelims,
        padOdd: false,
      });
    } else {
      throw err(input.length - 1, "Odd number of hex digits (nibbles)");
    }
  }

  return Uint8Array.from(bytes);
}

/**
 * Build a 24-bit uncompressed BMP from an RGB byte array.
 * @param {Uint8Array} rgb - Bytes in [R,G,B,R,G,B,...] order, length = w*h*3.
 * @param {number} width
 * @param {number} height
 * @returns {Blob} image/bmp blob
 */
export function rgbToBmp(rgb, width, height) {
  if (!(rgb instanceof Uint8Array))
    throw new TypeError("rgb must be Uint8Array");
  if (rgb.length !== width * height * 3)
    throw new RangeError(
      `rgb length (${rgb.length}) != width*height*3 (${width * height * 3})`
    );

  // BMP specifics: 24bpp, rows are padded to multiples of 4 bytes, pixel order BGR,
  // and rows are stored bottom-up for positive heights.
  const bytesPerPixel = 3;
  const rowStride = width * bytesPerPixel;
  const paddedRowSize = (rowStride + 3) & ~3; // align to 4 bytes
  const paddingPerRow = paddedRowSize - rowStride;
  const pixelArraySize = paddedRowSize * height;

  const FILE_HEADER_SIZE = 14;
  const DIB_HEADER_SIZE = 40; // BITMAPINFOHEADER
  const offBits = FILE_HEADER_SIZE + DIB_HEADER_SIZE;
  const fileSize = offBits + pixelArraySize;

  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);
  const out = new Uint8Array(buf);

  // ---- BITMAPFILEHEADER (14 bytes) ----
  out[0] = 0x42; // 'B'
  out[1] = 0x4d; // 'M'
  view.setUint32(2, fileSize, true); // bfSize
  view.setUint16(6, 0, true); // bfReserved1
  view.setUint16(8, 0, true); // bfReserved2
  view.setUint32(10, offBits, true); // bfOffBits

  // ---- BITMAPINFOHEADER (40 bytes) ----
  view.setUint32(14, DIB_HEADER_SIZE, true); // biSize
  view.setInt32(18, width, true); // biWidth
  view.setInt32(22, height, true); // biHeight (positive => bottom-up)
  view.setUint16(26, 1, true); // biPlanes
  view.setUint16(28, 24, true); // biBitCount
  view.setUint32(30, 0, true); // biCompression (BI_RGB)
  view.setUint32(34, pixelArraySize, true); // biSizeImage
  view.setInt32(38, 2835, true); // biXPelsPerMeter (~72 DPI)
  view.setInt32(42, 2835, true); // biYPelsPerMeter
  view.setUint32(46, 0, true); // biClrUsed
  view.setUint32(50, 0, true); // biClrImportant

  // ---- Pixel data (BGR, bottom-up, padded rows) ----
  let dst = offBits;
  for (let y = height - 1; y >= 0; y--) {
    const srcRowStart = y * width * 3;
    for (let x = 0; x < width; x++) {
      const si = srcRowStart + x * 3;
      const r = rgb[si],
        g = rgb[si + 1],
        b = rgb[si + 2];
      out[dst++] = b;
      out[dst++] = g;
      out[dst++] = r;
    }
    // row padding
    for (let p = 0; p < paddingPerRow; p++) out[dst++] = 0;
  }

  return new Blob([buf], { type: "image/bmp" });
}

export function returnFileSize(number) {
  if (number < 1e3) {
    return `${number} bytes`;
  } else if (number >= 1e3 && number < 1e6) {
    return `${(number / 1e3).toFixed(1)} KB`;
  }
  return `${(number / 1e6).toFixed(1)} MB`;
}

// https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Image_types
const fileTypes = [
  "image/apng",
  "image/bmp",
  "image/gif",
  "image/jpeg",
  "image/pjpeg",
  "image/png",
  "image/svg+xml",
  "image/tiff",
  "image/webp",
  "image/x-icon",
];

export function validFileType(file) {
  return fileTypes.includes(file.type);
}
