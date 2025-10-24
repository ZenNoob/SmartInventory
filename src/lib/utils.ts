import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number) {
  // Use Vietnamese locale but customize it to match user's request: 6,769 VNĐ
  return new Intl.NumberFormat('en-US', { // Using en-US to get comma separators
    style: 'decimal',
    maximumFractionDigits: 0,
  }).format(amount) + ' VNĐ';
}

/**
 * Converts an HSL color string to a HEX color.
 * Assumes hslString is in the format "H S% L%".
 * @param {string} hslString The HSL color string.
 * @returns {string} The HEX color string.
 */
export function hslToHex(hslString: string): string {
  if (!hslString || typeof hslString !== 'string' || hslString.split(' ').length < 3) {
    return '#000000'; // Return a default color if input is invalid
  }
  const [h, s, l] = hslString.split(" ").map(val => parseInt(val, 10));
  const sDecimal = s / 100;
  const lDecimal = l / 100;

  let c = (1 - Math.abs(2 * lDecimal - 1)) * sDecimal;
  let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let m = lDecimal - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  const toHex = (c: number) => ('0' + c.toString(16)).slice(-2);
  
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}


/**
 * Converts a HEX color string to an HSL string "H S% L%".
 * @param {string} hex The hex color string.
 * @returns {string} The HSL color string.
 */
export function hexToHsl(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length == 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length == 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255;
  g /= 255;
  b /= 255;

  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max == min) {
    h = s = 0; // achromatic
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hVal = Math.round(h * 360);
  const sVal = Math.round(s * 100);
  const lVal = Math.round(l * 100);

  return `${hVal} ${sVal}% ${lVal}%`;
}


export function toPlainObject<T>(data: any): T {
    if (data && typeof data === 'object' && typeof data.toDate === 'function') {
        return data.toDate().toISOString() as any;
    }
    if (Array.isArray(data)) {
        return data.map(item => toPlainObject(item)) as any;
    }
    if (data && typeof data === 'object' && !Array.isArray(data) && Object.prototype.toString.call(data) === '[object Object]') {
        const res: { [key: string]: any } = {};
        for (const key in data) {
            res[key] = toPlainObject(data[key]);
        }
        return res as T;
    }
    return data;
}
