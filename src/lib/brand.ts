import receiptLogoUrl from "@/assets/binancexi-receipt-logo.svg";

// BinanceXI POS (by naishe labs)
export type BrandConfig = {
  name: string;
  shortName: string;
  splashTagline?: string;
  poweredByFinePrint?: string;
  receiptLogoUrl?: string;
  receiptLogoAlt?: string;
  receiptLogoMaxWidthPx?: number;
  receiptLogoMaxHeightPx?: number;
  colors: {
    primary: string;
    accent: string;
    accentMuted: string;
  };
};

export const BRAND: BrandConfig = {
  name: "BinanceXI POS",
  shortName: "BinanceXI",
  splashTagline: "by naishe labs",
  poweredByFinePrint: "Powered by BinanceXI · naishe labs",
  receiptLogoUrl,
  receiptLogoAlt: "BinanceXI POS",
  receiptLogoMaxWidthPx: 148,
  receiptLogoMaxHeightPx: 34,
  colors: {
    // Blue/cyan scheme.
    primary: "#197cbc",
    accent: "#2baee4",
    accentMuted: "#89dbff",
  },
};
