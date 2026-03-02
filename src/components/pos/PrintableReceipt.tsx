// File: src/components/pos/PrintableReceipt.tsx
import { forwardRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import type { CartItem, Discount } from "@/types/pos";
import { buildReceiptPrintModel, type ReceiptStoreSettings } from "@/core/receipts/receiptPrintModel";
import { usePOS } from "@/contexts/POSContext";
import { loadStoreSettingsWithBusinessFallback } from "@/lib/storeSettings";

interface ReceiptProps {
  cart: CartItem[];
  cashierName: string;
  customerName?: string;

  receiptId: string;
  receiptNumber: string;
  paymentMethod: string;

  subtotal: number;
  discount: number;
  tax: number;
  total: number;

  activeDiscount?: Discount | null;
  taxRatePct?: number;
  timestamp?: string;
  settingsOverride?: ReceiptStoreSettings | null;
  paperMm?: 58 | 80;
}

function fmtMoney(n: number) {
  const x = Number.isFinite(n) ? n : 0;
  return `$${x.toFixed(2)}`;
}

export const PrintableReceipt = forwardRef<HTMLDivElement, ReceiptProps>((props, ref) => {
  const {
    cart,
    cashierName,
    customerName,
    receiptId,
    receiptNumber,
    paymentMethod,
    subtotal,
    discount,
    tax,
    total,
    activeDiscount,
    taxRatePct,
    timestamp,
    settingsOverride,
    paperMm = 80,
  } = props;
  const { currentUser } = usePOS();
  const tenantBusinessId = String(currentUser?.business_id || "").trim();

  const { data: settings } = useQuery({
    queryKey: ["storeSettings", tenantBusinessId || "no-business"],
    queryFn: async () => {
      const data = await loadStoreSettingsWithBusinessFallback({
        businessId: tenantBusinessId || null,
      });
      return data || {};
    },
    staleTime: 1000 * 60 * 60,
    enabled: !settingsOverride,
  });

  const effectiveSettings = useMemo(
    () => (settingsOverride ?? (settings as ReceiptStoreSettings | undefined) ?? {}) as ReceiptStoreSettings,
    [settingsOverride, settings]
  );

  const model = useMemo(
    () =>
      buildReceiptPrintModel({
        cart: (cart || []) as any,
        cashierName,
        customerName,
        receiptId,
        receiptNumber,
        paymentMethod,
        subtotal,
        discount,
        tax,
        total,
        activeDiscount: activeDiscount as any,
        taxRatePct,
        timestamp,
        settings: effectiveSettings,
      }),
    [
      cart,
      cashierName,
      customerName,
      receiptId,
      receiptNumber,
      paymentMethod,
      subtotal,
      discount,
      tax,
      total,
      activeDiscount,
      taxRatePct,
      timestamp,
      effectiveSettings,
    ]
  );

  return (
    <div
      ref={ref}
      className="p-2 text-black font-mono text-[11px] leading-tight bg-white"
      style={{
        width: paperMm === 58 ? "58mm" : "80mm",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact" as any,
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {/* HEADER */}
      <div className="text-center mb-1" style={{ textAlign: "center", marginBottom: 4 }}>
        <h2 className="font-black text-[18px] uppercase leading-none mb-1">
          {model.header.businessName}
        </h2>

        {model.header.address ? <p className="text-[10px]">{model.header.address}</p> : null}
        {model.header.phone ? <p className="text-[10px]">{model.header.phone}</p> : null}
        {model.header.taxId ? <p className="text-[10px] font-bold mt-0.5">TAX: {model.header.taxId}</p> : null}

        {model.header.logoUrl ? (
          <div className="mt-1 mb-2 flex justify-center">
            <img
              src={model.header.logoUrl}
              alt={model.header.logoAlt}
              style={{
                maxWidth: `${model.header.logoMaxWidthPx ?? 148}px`,
                maxHeight: `${model.header.logoMaxHeightPx ?? 34}px`,
              }}
              className="h-auto object-contain"
            />
          </div>
        ) : null}
      </div>

      <div className="border-b border-black my-2" data-receipt-rule style={{ borderTop: "1px solid #000", margin: "8px 0" }} />

      {/* META */}
      <div className="text-[10px] uppercase mb-2">
        <div className="flex justify-between" style={{ display: "flex", justifyContent: "space-between" }}>
          <div>
            <div>{model.meta.dateLabel}</div>
            <div>{model.meta.timeLabel}</div>
          </div>
          <div className="text-right">
            <div className="font-bold">#{model.meta.receiptNumber}</div>
            <div>Staff: {model.meta.cashierName}</div>
          </div>
        </div>

        <div className="text-center font-bold border border-black py-1 mt-2" style={{ textAlign: "center", border: "1px solid #000", padding: "4px", marginTop: 8 }}>
          Customer: {model.meta.customerName}
        </div>
      </div>

      <div className="border-b border-black my-2" data-receipt-rule style={{ borderTop: "1px solid #000", margin: "8px 0" }} />

      {/* ITEMS */}
      <div className="space-y-2 mb-3">
        {model.items.map((it) => (
          <div key={it.key} className="pb-1 border-b border-black/20 last:border-0" style={{ paddingBottom: 4, borderBottom: "1px solid rgba(0,0,0,0.2)" }}>
            <div className="text-[11px] font-bold break-words">{it.name}</div>

            <div className="flex justify-between text-[10px]" style={{ display: "flex", justifyContent: "space-between" }}>
              <span>
                {it.qty} x {fmtMoney(it.unit)}
              </span>
              <span>{fmtMoney(it.lineTotal)}</span>
            </div>

            {it.lineDiscount > 0 ? (
              <div className="flex justify-between text-[9px]" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>
                  Disc{" "}
                  {it.discountType === "percentage"
                    ? `(${it.discountValue}%)`
                    : it.impliedPercent !== null
                      ? `(${it.discountValue}$ ~${it.impliedPercent}%)`
                      : `(${it.discountValue}$)`}
                </span>
                <span>-{fmtMoney(it.lineDiscount)}</span>
              </div>
            ) : null}

            {it.lineDiscount > 0 ? (
              <div className="flex justify-between text-[9px] font-bold" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Line Total</span>
                <span>{fmtMoney(it.finalLine)}</span>
              </div>
            ) : null}

            {it.customDescription ? <div className="text-[9px] italic pl-1">- {it.customDescription}</div> : null}
          </div>
        ))}
      </div>

      <div className="border-b border-black my-2" data-receipt-rule style={{ borderTop: "1px solid #000", margin: "8px 0" }} />

      {/* TOTALS */}
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between text-[11px]" style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Subtotal</span>
          <span>{fmtMoney(model.totals.subtotal)}</span>
        </div>

        {model.totals.showGlobalDiscount ? (
          <div className="flex justify-between text-[11px]" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Discount{model.totals.activeDiscountName ? ` (${model.totals.activeDiscountName})` : ""}</span>
            <span>-{fmtMoney(model.totals.discount)}</span>
          </div>
        ) : null}

        {model.totals.showTax ? (
          <div className="flex justify-between text-[11px]" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Tax{typeof model.totals.taxRatePct === "number" ? ` (${model.totals.taxRatePct}%)` : ""}</span>
            <span>{fmtMoney(model.totals.tax)}</span>
          </div>
        ) : null}

        <div className="mt-2 border-2 border-black px-2 py-1" style={{ marginTop: 8, border: "2px solid #000", padding: "4px 6px" }}>
          <div className="flex justify-between font-black text-[16px]" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>TOTAL</span>
            <span>{fmtMoney(model.totals.total)}</span>
          </div>
        </div>

        <div className="text-center text-[10px] mt-2 uppercase">
          Paid via {model.meta.paymentMethod}
        </div>
      </div>

      {/* QR + FOOTER */}
      <div className="mt-4 text-center space-y-1">
        {model.verification.showQrCode ? (
          <div className="flex flex-col items-center">
            <QRCodeSVG value={model.verification.payload} size={92} />
            <div className="text-[8px] mt-1">Scan to Verify</div>
            <div className="text-[8px] opacity-70 break-all">ID: {model.meta.receiptId}</div>
          </div>
        ) : null}

        {model.footer.footerMessage ? (
          <div className="text-[9px] uppercase px-1 whitespace-pre-wrap">{model.footer.footerMessage}</div>
        ) : null}

        <div className="text-[8px] opacity-70 mt-2">{model.footer.poweredByLine}</div>
      </div>
    </div>
  );
});

PrintableReceipt.displayName = "PrintableReceipt";
