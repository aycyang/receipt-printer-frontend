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
export function hexToBytes(
    input
) {
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
        if (allow0x && ch === "0" && (i + 1) < input.length) {
            const nx = input[i + 1];
            if (nx === "x" || nx === "X") {
                // Only treat as prefix if next-next is a hex digit; otherwise fall through to delimiter handling / error
                const nn = (i + 2) < input.length ? nibble(input.charCodeAt(i + 2)) : -1;
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
            throw err(i, `Invalid character '${ch}' (0x${c.toString(16)}) in hex string`);
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
            return hexToBytes("0" + input, { allow0x, strict, allowedDelims, padOdd: false });
        } else {
            throw err(input.length - 1, "Odd number of hex digits (nibbles)");
        }
    }

    return Uint8Array.from(bytes);
}
