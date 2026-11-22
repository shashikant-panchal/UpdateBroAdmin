import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  X,
  ShieldCheck,
} from 'lucide-react';
import type { DbOrder, DbOrderItem } from '../types/database';
import { BrandLogo } from './BrandLogo';

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
    if (!invoiceRef.current) {
      window.print();
      return;
    }

    const printElement = invoiceRef.current;
    const printContent = printElement.innerHTML;

    // Create an isolated hidden iframe for 100% reliable printing without parent DOM interference
    const iframe = document.createElement('iframe');
    iframe.name = 'print_frame';
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    // Capture all stylesheet links and style tags from current document
    const styleTags = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((tag) => tag.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <title>${invoiceNumber} - UPDATE BRO Official Invoice</title>
          ${styleTags}
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            *, *::before, *::after {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            html, body {
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
            }
            .invoice-print-container {
              max-width: 100% !important;
              width: 100% !important;
              margin: 0 auto !important;
              padding: 10px !important;
              background: #ffffff !important;
              color: #0f172a !important;
              border: none !important;
              box-shadow: none !important;
            }
            table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            th, td {
              border-bottom: 1px solid #e2e8f0 !important;
            }
            svg {
              color: #0f172a !important;
              fill: currentColor !important;
            }
          </style>
        </head>
        <body>
          <div class="invoice-print-container">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    doc.close();

    // Trigger printing once content is written
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error('Iframe print error:', err);
        window.print();
      } finally {
        setTimeout(() => {
          try {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          } catch {
            // ignore
          }
        }, 2000);
      }
    }, 300);
  };

  return (
    <AnimatePresence>
      <div
        id="printable-invoice-modal"
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
      >
        {/* Print Styles fallback for Ctrl+P */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body {
              visibility: hidden !important;
              background: white !important;
            }
            #printable-invoice-modal,
            #printable-invoice-modal * {
              visibility: visible !important;
            }
            #printable-invoice-modal {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              background: white !important;
              color: #0f172a !important;
              z-index: 999999 !important;
              overflow: visible !important;
            }
            #printable-invoice {
              border: none !important;
              box-shadow: none !important;
              margin: 0 auto !important;
              width: 100% !important;
              max-width: 100% !important;
              padding: 10px !important;
              background: white !important;
              color: #0f172a !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .no-print {
              display: none !important;
            }
          }
        ` }} />

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
                    <span className="font-mono font-bold text-emerald-700 uppercase">
                      {order.payment_status || (order.payment_method === 'ONLINE' ? 'Paid' : 'Pending on Doorstep')}
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
