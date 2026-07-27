import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { customAlphabet } from 'nanoid';
import Receipt from '../models/Receipt.js';

const receiptSuffix = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

function pdfSafeText(value, fallback = 'Not available') {
  const normalized = String(value ?? '').trim() || fallback;

  return normalized
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[₹]/g, 'INR ')
    .replace(/[€]/g, 'EUR ')
    .replace(/[£]/g, 'GBP ')
    .replace(/[¥]/g, 'JPY ')
    .replace(/[–—−]/g, '-')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, '?');
}

function formatMoney(amountMinor, currency) {
  const normalizedCurrency = String(currency || 'INR').toUpperCase();
  const normalizedAmount = Number(amountMinor || 0);

  try {
    const fractionFormatter = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: normalizedCurrency,
      currencyDisplay: 'code',
    });
    const digits = fractionFormatter.resolvedOptions().maximumFractionDigits;
    const value = normalizedAmount / 10 ** digits;
    const number = new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);

    // PDF-lib's built-in Helvetica font uses WinAnsi encoding and cannot
    // encode symbols such as the Indian rupee sign. Currency codes remain
    // portable and prevent receipt generation from failing with HTTP 500.
    return `${normalizedCurrency} ${number}`;
  } catch {
    return `${normalizedCurrency} ${normalizedAmount}`;
  }
}
function buildReceiptNumber(date = new Date()) {
  return `IRAP-${date.getUTCFullYear()}-${receiptSuffix()}`;
}

export async function issueReceipt(payment) {
  const existing = await Receipt.findOne({ payment: payment._id });
  if (existing) return existing;

  let receipt;
  try {
    receipt = await Receipt.create({
      receiptNumber: buildReceiptNumber(),
      payment: payment._id,
      owner: payment.owner,
      application: payment.application,
      issuedAt: payment.paidAt || new Date(),
      currency: payment.currency,
      subtotalMinor: payment.subtotalMinor,
      discountMinor: payment.discountMinor,
      taxMinor: payment.taxMinor,
      totalMinor: payment.totalMinor,
      recipient: {
        fullName: payment.billing.fullName,
        email: payment.billing.email,
        countryCode: payment.billing.countryCode,
      },
      plan: {
        code: payment.planSnapshot.code,
        name: payment.planSnapshot.name,
      },
      paymentReference: payment.reference,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
    });
  } catch (error) {
    if (error?.code !== 11000) throw error;
    receipt = await Receipt.findOne({ payment: payment._id });
    if (!receipt) throw error;
  }

  if (!payment.receipt?.equals?.(receipt._id)) {
    payment.receipt = receipt._id;
    await payment.save();
  }
  return receipt;
}

export async function createReceiptPdf(receipt) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595.28, 841.89]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const dark = rgb(0.08, 0.12, 0.18);
  const muted = rgb(0.35, 0.39, 0.45);
  const accent = rgb(0.05, 0.39, 0.62);

  const receiptNumber = pdfSafeText(receipt?.receiptNumber, 'IRAP-RECEIPT');
  const issuedAt = receipt?.issuedAt ? new Date(receipt.issuedAt) : new Date();
  const issuedDate = Number.isNaN(issuedAt.getTime())
    ? 'Not available'
    : issuedAt.toLocaleDateString('en-GB');
  const provider = pdfSafeText(receipt?.provider, 'iRAP').toUpperCase();

  page.drawText('iRAP PAYMENT RECEIPT', {
    x: 48,
    y: 780,
    size: 20,
    font: bold,
    color: accent,
  });
  page.drawText(receiptNumber, {
    x: 48,
    y: 752,
    size: 11,
    font: regular,
    color: muted,
  });

  const rows = [
    ['Issued', issuedDate],
    ['Recipient', pdfSafeText(receipt?.recipient?.fullName)],
    ['Email', pdfSafeText(receipt?.recipient?.email)],
    [
      'Plan',
      `${pdfSafeText(receipt?.plan?.name)} (${pdfSafeText(receipt?.plan?.code, 'N/A')})`,
    ],
    ['Payment reference', pdfSafeText(receipt?.paymentReference)],
    ['Provider', provider],
    [
      'Provider payment ID',
      pdfSafeText(receipt?.providerPaymentId, 'Offline payment'),
    ],
  ];

  let y = 700;
  for (const [label, value] of rows) {
    page.drawText(pdfSafeText(label), {
      x: 48,
      y,
      size: 10,
      font: bold,
      color: dark,
    });
    page.drawText(pdfSafeText(value), {
      x: 190,
      y,
      size: 10,
      font: regular,
      color: dark,
      maxWidth: 350,
    });
    y -= 26;
  }

  page.drawLine({
    start: { x: 48, y: 490 },
    end: { x: 548, y: 490 },
    thickness: 1,
  });

  const totals = [
    ['Subtotal', formatMoney(receipt?.subtotalMinor, receipt?.currency)],
    ['Discount', `- ${formatMoney(receipt?.discountMinor, receipt?.currency)}`],
    ['Tax', formatMoney(receipt?.taxMinor, receipt?.currency)],
    ['Total paid', formatMoney(receipt?.totalMinor, receipt?.currency)],
  ];

  y = 456;
  for (const [label, value] of totals) {
    const isTotal = label === 'Total paid';
    page.drawText(pdfSafeText(label), {
      x: 320,
      y,
      size: isTotal ? 12 : 10,
      font: bold,
      color: dark,
    });
    page.drawText(pdfSafeText(value), {
      x: 430,
      y,
      size: isTotal ? 12 : 10,
      font: isTotal ? bold : regular,
      color: dark,
    });
    y -= 28;
  }

  page.drawText('This receipt confirms the payment recorded by iRAP.', {
    x: 48,
    y: 100,
    size: 9,
    font: regular,
    color: muted,
  });

  return Buffer.from(await pdf.save());
}
