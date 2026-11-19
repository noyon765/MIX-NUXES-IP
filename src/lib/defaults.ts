import { PaymentSettings, SiteSettings, SubscriptionPackage } from '../types/index.ts';

export const GENERATED_ASSETS = {
  heroMonolith: '/src/assets/images/hero_nexus_monolith_1795111489229.jpg',
  opticalBlades: '/src/assets/images/feature_optical_blades_1795111488666.jpg',
  brandEmblem: '/src/assets/images/brand_nexus_emblem_1795111487763.jpg',
};

export const DEFAULT_PACKAGES: SubscriptionPackage[] = [
  {
    id: '1-month',
    name: '1 Month',
    durationDays: 30,
    durationLabel: '30 Days Access',
    originalPrice: 5,
    discountPercent: 20,
    finalPrice: 4,
    isBestValue: false,
    enabled: true,
    sortOrder: 1,
    features: [
      'Dedicated private IPv4 assignment',
      'SOCKS5 & HTTP(S) dual-protocol support',
      'Automated expiration tracking',
      'Telegram customer support access',
    ],
    updatedAt: null,
  },
  {
    id: '2-months',
    name: '2 Months',
    durationDays: 60,
    durationLabel: '60 Days Access',
    originalPrice: 10,
    discountPercent: 30,
    finalPrice: 7,
    isBestValue: false,
    enabled: true,
    sortOrder: 2,
    features: [
      'Dedicated private IPv4 assignment',
      'SOCKS5 & HTTP(S) dual-protocol support',
      'Zero shared bandwidth throttling',
      'Priority Telegram support queue',
    ],
    updatedAt: null,
  },
  {
    id: '6-months',
    name: '6 Months',
    durationDays: 180,
    durationLabel: '180 Days Access',
    originalPrice: 30,
    discountPercent: 40,
    finalPrice: 18,
    isBestValue: false,
    enabled: true,
    sortOrder: 3,
    features: [
      'Long-term static IP continuity',
      'SOCKS5 & HTTP(S) dual-protocol support',
      'Expiration reminders prior to renewal',
      'Direct Telegram technical onboarding',
    ],
    updatedAt: null,
  },
  {
    id: '1-year',
    name: '1 Year',
    durationDays: 365,
    durationLabel: '365 Days Access',
    originalPrice: 60,
    discountPercent: 50,
    finalPrice: 30,
    isBestValue: true,
    enabled: true,
    sortOrder: 4,
    features: [
      '50% annual savings locked for 365 days',
      'Dedicated static IPv4 & credential vault',
      'SOCKS5 & HTTP(S) dual-protocol support',
      'Highest priority Telegram support channel',
    ],
    updatedAt: null,
  },
];

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: 'MIX NEXUS IP',
  tagline: 'Premium Connectivity. Simplified.',
  logoUrl: '',
  heroHeadline: 'Dedicated IP & Proxy Infrastructure Built for Reliability.',
  heroSubheadline:
    'Provision private proxy endpoints with transparent Binance settlement, verified manual node assignment, and real-time subscription lifecycle control.',
  announcementText: '',
  announcementActive: false,
  telegramUsername: 'MIX_NEXUS_IP_SUPPORT',
  supportInstructions:
    'Send your account email and Binance Transaction ID when messaging our Telegram desk (@MIX_NEXUS_IP_SUPPORT) so an operator can locate your order immediately.',
  updatedAt: null,
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  binanceUid: '944991131',
  binanceName: 'User-b4d404',
  binanceWalletAddress: 'TGVLkJBhD3zaiN67PTC9ZUQeEgXFGSk8v5',
  binanceNetwork: 'USDT (TRC20)',
  paymentInstructions:
    'Transfer the exact Final Payable Amount using Binance Pay (UID: 944991131 · Name: User-b4d404) or USDT TRC20 Wallet Address. Upload a clear screenshot of the completed transfer along with your Transaction ID. Subscriptions activate only after manual administrator verification.',
  updatedAt: null,
};
