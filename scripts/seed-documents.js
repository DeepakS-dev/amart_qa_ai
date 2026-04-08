import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../src/utils/database.js';
import { Document } from '../src/models/Document.model.js';

const samples = [
  {
    title: 'Refund and return policy',
    content:
      'Customers may request a full refund within 14 days of purchase for unused digital subscriptions. Physical goods must be returned in original packaging; restocking fees may apply for opened items.',
    tags: ['e-commerce', 'refunds', 'returns'],
  },
  {
    title: 'Terms of service (SaaS)',
    content:
      'By using our software you agree to acceptable use: no reverse engineering, no sharing seats beyond licensed users, and compliance with export controls. We may suspend accounts for material breach after written notice.',
    tags: ['saas', 'legal', 'terms'],
  },
  {
    title: 'Privacy and data processing',
    content:
      'We process account, billing, and product usage data to provide the service and improve reliability. EU/UK customers are covered by our DPA and Standard Contractual Clauses where applicable.',
    tags: ['privacy', 'gdpr', 'saas'],
  },
  {
    title: 'Subscription billing and renewals',
    content:
      'Plans renew automatically at the end of each term unless cancelled before the renewal date. Price changes require 30 days notice. Failed payments enter a grace period before access is restricted.',
    tags: ['e-commerce', 'billing', 'subscriptions'],
  },
  {
    title: 'Acceptable use and storefront content',
    content:
      'Merchants must not list prohibited items, must honor advertised prices, and must respond to buyer inquiries within two business days. We may remove listings that violate marketplace rules.',
    tags: ['e-commerce', 'marketplace', 'policy'],
  },
  {
    title: 'Service level and maintenance windows',
    content:
      'Target monthly uptime is 99.9% excluding scheduled maintenance. Maintenance is announced at least 48 hours in advance when possible. Credits for SLA breaches are described in your order form.',
    tags: ['saas', 'sla', 'uptime'],
  },
];

async function run() {
  await connectDatabase(process.env.MONGODB_URI);
  await Document.deleteMany({
    title: { $in: samples.map((d) => d.title) },
  });
  await Document.insertMany(samples);
  console.log(`Seeded ${samples.length} documents`);
  await disconnectDatabase();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
