import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  X,
  ShieldCheck,
} from 'lucide-react';
import type { DbOrder, DbOrderItem } from '../types/database';
import { BrandLogo } from './BrandLogo';
import { LOGO_PATHS } from '../data/logoPaths';

export interface OrderWithItemsForInvoice extends DbOrder {
  order_items: DbOrderItem[];
}

interface InvoiceModalProps {
  order: OrderWithItemsForInvoice | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ order, onClose }) => {
  const invoiceRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const invoiceNumber = `UB-INV-${order.order_number.replace(/^UB-/, '')}`;
  const formattedDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const subtotal = Number(order.subtotal || order.total_amount);
  const shippingFee = Number(order.shipping_fee || 0);
  const totalAmount = Number(order.total_amount);

  const handlePrint = () => {
    if (!order) return;

    const items =
      order.order_items && order.order_items.length > 0
        ? order.order_items
        : [
            {
              id: 'fallback-item',
              product_name: 'Genuine UPDATE BRO Hardware',
              quantity: 1,
              unit_price: subtotal,
            } as DbOrderItem,
          ];

    const itemsHtml = items
      .map(
        (item, idx) => `
        <tr>
          <td style="padding: 10px 12px; text-align: center; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #64748b;">${idx + 1}</td>
          <td style="padding: 10px 12px; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${item.product_name}</td>
          <td style="padding: 10px 12px; text-align: center; font-family: monospace; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${item.quantity}</td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace; color: #334155; border-bottom: 1px solid #e2e8f0;">₹${Number(item.unit_price).toLocaleString('en-IN')}</td>
          <td style="padding: 10px 12px; text-align: right; font-family: monospace; font-weight: 700; color: #0f172a; border-bottom: 1px solid #e2e8f0;">₹${(Number(item.unit_price) * Number(item.quantity)).toLocaleString('en-IN')}</td>
        </tr>
      `
      )
      .join('');

    // Generate 100% self-contained printable HTML with NO external link/URL headers
    const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title> </title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0 !important;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #ffffff !important;
      color: #0f172a !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
      font-size: 12px;
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }
    .invoice-page {
      padding: 14mm 16mm;
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 18px;
      margin-bottom: 18px;
    }
    .brand-title {
      font-size: 19px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-sub {
      font-size: 10px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 4px;
    }
    .brand-addr {
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
    }
    .brand-cert {
      font-size: 10px;
      color: #94a3b8;
      font-family: monospace;
      margin-top: 2px;
    }
    .invoice-badge-box {
      text-align: right;
    }
    .retail-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 3px 8px;
      border-radius: 4px;
      margin-bottom: 6px;
    }
    .inv-num {
      font-family: monospace;
      font-size: 14px;
      font-weight: 900;
      color: #0f172a;
    }
    .inv-meta {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
    }
    .details-grid {
      display: flex;
      gap: 16px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 18px;
      margin-bottom: 18px;
    }
    .card-box {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 14px;
    }
    .card-label {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #64748b;
      margin-bottom: 6px;
    }
    .card-val-name {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .card-val-sub {
      font-size: 11px;
      color: #334155;
    }
    .row-meta {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-top: 4px;
    }
    .status-paid {
      font-family: monospace;
      font-weight: 800;
      color: #15803d;
      text-transform: uppercase;
    }
    .table-section {
      margin-bottom: 18px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #475569;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
    }
    thead tr {
      background: #f1f5f9;
      color: #475569;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      border-bottom: 1px solid #e2e8f0;
    }
    thead th {
      padding: 10px 12px;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 18px;
    }
    .warranty-box {
      max-width: 320px;
      font-size: 10.5px;
      color: #475569;
      padding: 10px 12px;
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 10px;
      line-height: 1.45;
    }
    .warranty-heading {
      font-weight: 800;
      color: #166534;
      margin-bottom: 2px;
    }
    .total-box {
      width: 250px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 12px 14px;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #475569;
      margin-bottom: 6px;
    }
    .total-line.grand {
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
      margin-top: 8px;
      font-size: 14px;
      font-weight: 900;
      color: #0f172a;
    }
    .footer-row {
      border-top: 1px solid #e2e8f0;
      padding-top: 14px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="invoice-page">
    <div class="header-row">
      <div>
        <div class="brand-title">
          <svg width="26" height="19" viewBox="${LOGO_PATHS.ubOnly.viewBox}" fill="#0f172a">
            <path d="${LOGO_PATHS.ubOnly.d}" />
          </svg>
          <span>UPDATE BRO®</span>
        </div>
        <div class="brand-sub">Official Hardware &amp; Accessories Store</div>
        <div class="brand-addr">Hyderabad, Telangana, India • support@updatebro.in</div>
        <div class="brand-cert">GST / BIS Certified Hardware Labs</div>
      </div>

      <div class="invoice-badge-box">
        <span class="retail-badge">Retail Tax Invoice</span>
        <div class="inv-num">${invoiceNumber}</div>
        <div class="inv-meta">Invoice Date: <strong>${formattedDate}</strong></div>
        <div class="inv-meta">Order Ref: <strong>${order.order_number}</strong></div>
      </div>
    </div>

    <div class="details-grid">
      <div class="card-box">
        <div class="card-label">Billed &amp; Shipped To:</div>
        <div class="card-val-name">${order.customer_name}</div>
        <div class="card-val-sub">Phone: ${order.customer_phone}</div>
        <div class="card-val-sub" style="margin-top: 4px;">${order.shipping_address}</div>
      </div>

      <div class="card-box">
        <div class="card-label">Payment Particulars:</div>
        <div class="row-meta">
          <span style="color: #64748b;">Payment Mode:</span>
          <span style="font-weight: 800; text-transform: uppercase;">${
            order.payment_method === 'ONLINE' ? 'Online (Prepaid Razorpay)' : 'Cash on Delivery (COD)'
          }</span>
        </div>
        <div class="row-meta">
          <span style="color: #64748b;">Payment Status:</span>
          <span class="status-paid" style="color: ${
            order.payment_method === 'ONLINE' || order.status === 'Delivered' || order.payment_status?.toLowerCase() === 'paid'
              ? '#15803d'
              : '#d97706'
          };">${
            order.payment_method === 'ONLINE' || order.status === 'Delivered' || order.payment_status?.toLowerCase() === 'paid'
              ? (order.payment_method === 'ONLINE' ? 'PAID (ONLINE)' : 'PAID (COD)')
              : 'PENDING (COD)'
          }</span>
        </div>
        ${
          order.razorpay_payment_id
            ? `
        <div class="row-meta">
          <span style="color: #64748b;">Txn ID:</span>
          <span style="font-family: monospace; font-weight: 600;">${order.razorpay_payment_id}</span>
        </div>`
            : ''
        }
        <div class="row-meta" style="border-top: 1px solid #e2e8f0; padding-top: 4px; margin-top: 4px;">
          <span style="color: #64748b;">Order Status:</span>
          <span style="font-weight: 800; text-transform: uppercase;">${order.status}</span>
        </div>
      </div>
    </div>

    <div class="table-section">
      <div class="section-title">Order Line Items</div>
      <table>
        <thead>
          <tr>
            <th style="width: 36px; text-align: center;">#</th>
            <th style="text-align: left;">Item Description</th>
            <th style="width: 60px; text-align: center;">Qty</th>
            <th style="width: 100px; text-align: right;">Unit Price</th>
            <th style="width: 110px; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
    </div>

    <div class="summary-row">
      <div class="warranty-box">
        <div class="warranty-heading">✓ 1-Year Official Replacement Warranty Included</div>
        <div>This hardware unit is backed by UPDATE BRO® doorstep replacement guarantee against manufacturing defects. Keep this invoice for claim validation.</div>
      </div>

      <div class="total-box">
        <div class="total-line">
          <span>Subtotal:</span>
          <span style="font-family: monospace; font-weight: 700;">₹${subtotal.toLocaleString('en-IN')}</span>
        </div>
        <div class="total-line">
          <span>Shipping &amp; Courier:</span>
          <span style="font-family: monospace; font-weight: 700; color: #15803d;">${
            shippingFee > 0 ? `₹${shippingFee}` : 'FREE'
          }</span>
        </div>
        <div class="total-line grand">
          <span>Grand Total:</span>
          <span style="font-family: monospace;">₹${totalAmount.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </div>

    <div class="footer-row">
      <div>
        <p style="font-weight: 700; margin: 0 0 2px 0; color: #334155;">Declaration &amp; Terms:</p>
        <p style="margin: 0 0 2px 0;">Computer-generated tax invoice. No physical signature required under IT Act.</p>
        <p style="margin: 0;">7-Day Instant Doorstep Replacement Policy from courier delivery date.</p>
      </div>

      <div style="text-align: right;">
        <p style="font-weight: 900; text-transform: uppercase; margin: 0 0 2px 0; font-size: 11px; color: #0f172a;">UPDATE BRO® STORE</p>
        <p style="margin: 0; font-size: 9px; color: #64748b;">Authorized Logistics &amp; Fulfillment</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    // Remove any existing print iframe
    const existingIframe = document.getElementById('ub-invoice-print-frame');
    if (existingIframe) {
      existingIframe.remove();
    }

    // Create an iframe with real layout dimensions so Chromium never collapses or clips it
    const iframe = document.createElement('iframe');
    iframe.id = 'ub-invoice-print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '800px';
    iframe.style.height = '1100px';
    iframe.style.border = 'none';
    iframe.style.opacity = '0.001';
    iframe.style.pointerEvents = 'none';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(fullHtml);
    doc.close();

    const doPrint = () => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Print trigger error:', err);
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(fullHtml);
          win.document.close();
          win.focus();
          win.print();
        }
      }
    };

    setTimeout(doPrint, 250);
  };

  return (
    <AnimatePresence>
      <div
        id="printable-invoice-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
      >
        {/* Global Print fallback if user presses Ctrl+P */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
          @media print {
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
            }
            body > * {
              display: none !important;
            }
            #printable-invoice-modal,
            #printable-invoice-modal * {
              display: block !important;
              visibility: visible !important;
            }
            #printable-invoice-modal {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 14mm 16mm !important;
              background: #ffffff !important;
              color: #0f172a !important;
              z-index: 999999 !important;
            }
            #printable-invoice {
              border: none !important;
              box-shadow: none !important;
              margin: 0 auto !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 0 !important;
              background: white !important;
              color: #0f172a !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
          }
        `,
          }}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          className="relative w-full max-w-3xl my-auto rounded-3xl border border-line bg-surface shadow-2xl flex flex-col max-h-[94vh] overflow-hidden"
        >
          {/* Top Actions Bar (Hidden on print) */}
          <div className="no-print flex items-center justify-between border-b border-line bg-cloud/50 px-6 py-3.5">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-accent/15 px-2.5 py-0.5 font-mono text-[10px] font-black uppercase text-accent border border-accent/20">
                Tax Invoice Preview
              </span>
              <span className="font-mono text-xs font-bold text-ink">#{order.order_number}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-white shadow-glow hover:bg-accent-hover transition cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                <span>Print Invoice</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-muted hover:bg-cloud hover:text-ink cursor-pointer transition"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Scrollable Invoice Document Stage */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-cloud/20">
            <div
              id="printable-invoice"
              ref={invoiceRef}
              className="bg-white text-slate-900 rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 text-xs max-w-2xl mx-auto"
            >
              {/* Invoice Brand Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <BrandLogo variant="horizontal" className="h-7 w-auto text-slate-950" color="#0f172a" />
                  </div>
                  <p className="font-bold text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                    Official Hardware &amp; Accessories Store
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Hyderabad, Telangana, India • support@updatebro.in
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono">
                    GST / BIS Certified Hardware Labs
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <span className="inline-block rounded bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider px-2 py-0.5 mb-1.5">
                    Retail Tax Invoice
                  </span>
                  <p className="font-mono text-sm font-black text-slate-900">
                    {invoiceNumber}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Invoice Date: <span className="font-semibold text-slate-800">{formattedDate}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Order Ref: <span className="font-mono font-bold text-slate-800">{order.order_number}</span>
                  </p>
                </div>
              </div>

              {/* Billed To & Payment Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b border-slate-200 pb-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                  <p className="font-black text-[10px] uppercase tracking-wider text-slate-500">
                    Billed &amp; Shipped To:
                  </p>
                  <p className="font-bold text-sm text-slate-900">{order.customer_name}</p>
                  <p className="font-mono text-[11px] text-slate-700">Phone: {order.customer_phone}</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed mt-1">
                    {order.shipping_address}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                  <p className="font-black text-[10px] uppercase tracking-wider text-slate-500">
                    Payment Particulars:
                  </p>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">Payment Mode:</span>
                    <span className="font-bold text-slate-900 uppercase">
                      {order.payment_method === 'ONLINE' ? 'Online (Prepaid Razorpay)' : 'Cash on Delivery (COD)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600">Payment Status:</span>
                    <span className={`font-mono font-bold uppercase ${
                      order.payment_method === 'ONLINE' || order.status === 'Delivered' || order.payment_status?.toLowerCase() === 'paid'
                        ? 'text-emerald-700'
                        : 'text-amber-600'
                    }`}>
                      {order.payment_method === 'ONLINE' || order.status === 'Delivered' || order.payment_status?.toLowerCase() === 'paid'
                        ? (order.payment_method === 'ONLINE' ? 'Paid (ONLINE)' : 'Paid (COD)')
                        : 'Pending (COD)'}
                    </span>
                  </div>
                  {order.razorpay_payment_id && (
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 font-mono">Txn ID:</span>
                      <span className="font-mono text-slate-800 truncate max-w-[160px]">
                        {order.razorpay_payment_id}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200">
                    <span className="text-slate-600">Order Status:</span>
                    <span className="font-bold text-slate-900 uppercase">
                      {order.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <p className="font-black text-[11px] uppercase tracking-wider text-slate-600 mb-2">
                  Order Line Items
                </p>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] font-black uppercase text-slate-600 border-b border-slate-200">
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-center w-16">Qty</th>
                        <th className="py-2.5 px-3 text-right w-24">Unit Price</th>
                        <th className="py-2.5 px-3 text-right w-24">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs">
                      {(order.order_items && order.order_items.length > 0 ? order.order_items : [
                        {
                          id: 'fallback-item',
                          product_name: 'Genuine UPDATE BRO Hardware',
                          quantity: 1,
                          unit_price: subtotal,
                        } as DbOrderItem
                      ]).map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-500">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-bold text-slate-900">
                            {item.product_name}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono text-slate-800 font-bold">
                            {item.quantity}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            ₹{Number(item.unit_price).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ₹{(Number(item.unit_price) * Number(item.quantity)).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total Calculation Grid */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
                <div className="max-w-xs space-y-1.5 text-[11px] text-slate-600">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <span>1-Year Official Replacement Warranty Included</span>
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    This unit is backed by UPDATE BRO® doorstep replacement warranty against all manufacturing defects. Keep this invoice for claim validation.
                  </p>
                </div>

                <div className="w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono text-slate-800">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Shipping &amp; Courier:</span>
                    <span className="font-mono text-emerald-700 font-bold">
                      {shippingFee > 0 ? `₹${shippingFee}` : 'FREE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm font-black text-slate-950 pt-2 border-t border-slate-200">
                    <span>Grand Total:</span>
                    <span className="font-mono text-base text-slate-950">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Declaration & Authorized Stamp */}
              <div className="border-t border-slate-200 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[10px] text-slate-500">
                <div>
                  <p className="font-bold text-slate-700">Declaration &amp; Terms:</p>
                  <p>Computer-generated invoice. No physical signature required under IT Act.</p>
                  <p>7-Day Instant Replacement Policy from date of courier delivery.</p>
                </div>

                <div className="text-right sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0">
                  <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                    UPDATE BRO® STORE
                  </p>
                  <p className="text-[9px] text-slate-500">Authorized Logistics &amp; Fulfillment</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
