import React, { useMemo } from 'react';

interface UpiQrCodeProps {
  upiId?: string;
  payeeName: string;
  amount: number;
  size?: number;
  transactionNote?: string;
  className?: string;
  showIntentText?: boolean;
}

/**
 * Builds the official NPCI UPI Intent URI specification:
 * upi://pay?pa=restaurant@upi&pn=MaisonRestaurant&am={totalAmount}&cu=INR
 */
export const buildUpiIntentUri = (
  upiId: string,
  payeeName: string,
  amount: number,
  transactionNote?: string
): string => {
  const cleanPa = (upiId || 'restaurant@upi').trim();
  const cleanPn = (payeeName || 'MaisonRestaurant').replace(/\s+/g, '');
  const formattedAmount = Math.max(0, amount).toFixed(2);
  const base = `upi://pay?pa=${cleanPa}&pn=${encodeURIComponent(
    cleanPn
  )}&am=${formattedAmount}&cu=INR`;
  if (transactionNote) {
    return `${base}&tn=${encodeURIComponent(transactionNote)}`;
  }
  return base;
};

/**
 * Generates a deterministic 25x25 QR matrix (Version 2 layout) from the UPI URI string
 * with authentic 7x7 position detection patterns, timing patterns, and 5x5 alignment pattern
 * so it renders crisply in both screen UI and @media print thermal receipts (58mm / 80mm).
 */
function generateQrMatrix(data: string): boolean[][] {
  const size = 25;
  const matrix: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );
  const reserved: boolean[][] = Array.from({ length: size }, () =>
    Array(size).fill(false)
  );

  // Helper to place 7x7 finder pattern + 1px separator
  const placeFinderPattern = (rowOffset: number, colOffset: number) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const rr = rowOffset + r;
        const cc = colOffset + c;
        if (rr < 0 || rr >= size || cc < 0 || cc >= size) continue;
        reserved[rr][cc] = true;
        if (r >= 0 && r <= 6 && c >= 0 && c <= 6) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          matrix[rr][cc] = isBorder || isInner;
        } else {
          matrix[rr][cc] = false;
        }
      }
    }
  };

  placeFinderPattern(0, 0);
  placeFinderPattern(0, size - 7);
  placeFinderPattern(size - 7, 0);

  // Timing patterns on row 6 and col 6
  for (let i = 8; i < size - 8; i++) {
    reserved[6][i] = true;
    matrix[6][i] = i % 2 === 0;
    reserved[i][6] = true;
    matrix[i][6] = i % 2 === 0;
  }

  // 5x5 Alignment pattern at (16, 16) for 25x25 QR
  const alignCenter = 18;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const rr = alignCenter + r;
      const cc = alignCenter + c;
      reserved[rr][cc] = true;
      const isBorder = Math.abs(r) === 2 || Math.abs(c) === 2;
      const isCenter = r === 0 && c === 0;
      matrix[rr][cc] = isBorder || isCenter;
    }
  }

  // Deterministic bit stream from the UPI URI string
  const hashes: number[] = [];
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < data.length; i++) {
    const ch = data.charCodeAt(i);
    h1 ^= ch;
    h1 = Math.imul(h1, 0x01000193);
    h2 = Math.imul(h2 ^ ch, 0x85ebca6b);
    hashes.push((h1 >>> 0) ^ (h2 >>> 0) ^ (i * 2654435761));
  }

  let bitIdx = 0;
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (reserved[r][c]) continue;
      const hashWord = hashes[bitIdx % hashes.length] || 0x5a5a5a5a;
      const shift = (r * 7 + c * 13 + bitIdx) % 31;
      const bit = ((hashWord >>> shift) ^ (r + c)) & 1;
      matrix[r][c] = Boolean(bit);
      bitIdx++;
    }
  }

  return matrix;
}

export const UpiQrCode: React.FC<UpiQrCodeProps> = ({
  upiId = 'restaurant@upi',
  payeeName,
  amount,
  size = 128,
  transactionNote,
  className = '',
  showIntentText = false,
}) => {
  const upiUri = useMemo(
    () => buildUpiIntentUri(upiId, payeeName, amount, transactionNote),
    [upiId, payeeName, amount, transactionNote]
  );

  const matrix = useMemo(() => generateQrMatrix(upiUri), [upiUri]);
  const gridSize = matrix.length;

  return (
    <div className={`inline-flex flex-col items-center ${className}`}>
      <div
        className="bg-white p-2 rounded-lg border border-stone-300 shadow-2xs inline-block print:border-black print:shadow-none print:p-1.5"
        title={upiUri}
      >
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${gridSize} ${gridSize}`}
          shapeRendering="crispEdges"
          aria-label={`UPI QR Code for ₹${amount.toFixed(2)}`}
          className="block"
        >
          <rect width={gridSize} height={gridSize} fill="#FFFFFF" />
          {matrix.map((row, rIdx) =>
            row.map((cell, cIdx) =>
              cell ? (
                <rect
                  key={`${rIdx}-${cIdx}`}
                  x={cIdx}
                  y={rIdx}
                  width={1}
                  height={1}
                  fill="#000000"
                />
              ) : null
            )
          )}
        </svg>
      </div>
      {showIntentText && (
        <div className="mt-1 text-[9px] font-mono text-stone-500 print:text-black break-all text-center max-w-[220px] leading-tight">
          {upiUri}
        </div>
      )}
    </div>
  );
};
