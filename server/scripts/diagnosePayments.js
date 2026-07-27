import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { environment } from '../src/config/environment.js';
import Coupon from '../src/models/Coupon.js';
import CouponRedemption from '../src/models/CouponRedemption.js';
import Payment from '../src/models/Payment.js';
import Plan from '../src/models/Plan.js';
import Receipt from '../src/models/Receipt.js';
import TaxRate from '../src/models/TaxRate.js';
import WebhookEvent from '../src/models/WebhookEvent.js';

async function run() {
  console.log(`Payments enabled: ${environment.payments.enabled}`);
  console.log(`Default provider: ${environment.payments.defaultProvider}`);
  console.log(`Razorpay enabled: ${environment.payments.razorpay.enabled}`);
  console.log(`Stripe enabled: ${environment.payments.stripe.enabled}`);
  console.log(`Offline enabled: ${environment.payments.offline.enabled}`);

  if (!environment.mongodbUri) {
    console.log('MongoDB is not configured; database checks were skipped.');
    return;
  }

  const connected = await connectDatabase();
  if (!connected || mongoose.connection.readyState !== 1) {
    throw new Error('MongoDB could not be reached.');
  }

  await Promise.all([
    Plan.createIndexes(),
    Coupon.createIndexes(),
    CouponRedemption.createIndexes(),
    TaxRate.createIndexes(),
    Payment.createIndexes(),
    Receipt.createIndexes(),
    WebhookEvent.createIndexes(),
  ]);
  console.log('Payment collection indexes are present.');

  const [
    plans,
    activePlans,
    coupons,
    taxes,
    payments,
    receipts,
    webhooks,
  ] = await Promise.all([
    Plan.countDocuments(),
    Plan.countDocuments({ active: true }),
    Coupon.countDocuments(),
    TaxRate.countDocuments(),
    Payment.countDocuments(),
    Receipt.countDocuments(),
    WebhookEvent.countDocuments(),
  ]);

  console.log(`Plans: ${plans} (${activePlans} active)`);
  console.log(`Coupons: ${coupons}`);
  console.log(`Tax rates: ${taxes}`);
  console.log(`Payments: ${payments}`);
  console.log(`Receipts: ${receipts}`);
  console.log(`Stored webhook event records: ${webhooks}`);
  console.log('Payment diagnostics completed successfully.');
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
