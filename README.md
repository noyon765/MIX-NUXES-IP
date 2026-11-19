# MIX NEXUS IP

Premium IP & Proxy Subscription Management Platform — *Premium Connectivity. Simplified.*

## Core Capabilities

- **Client & Admin Authentication**: Local full-stack authentication (`server.ts` + scrypt password hashing + HMAC Bearer session tokens) with unique username validation, self-service password reset, and clean session logout.
- **Subscription Packages**: Configurable 1 Month, 2 Months, 6 Months, and 1 Year plans with strikethrough original pricing, discount percentages, Best Value highlight, and automatic expiration calculation.
- **Binance-Only Checkout**: Displays Admin-configured Binance UID, Account Name, Wallet Address, Network, and instructions with one-tap copy controls, Transaction ID input, and validated/compressed payment screenshot upload.
- **User Dashboard**: Overview, protected My Proxy credential vault (IP, port, username, password reveal/copy, protocol, region, expiration), Billing & Transaction history, Telegram Support Center, and Account Settings.
- **Admin Control Panel**: Accessible from the top navigation menu with live metrics, Payment Verification queue, User & Subscription lifecycle management, Proxy Node CRUD & assignment, Package editor, Website/Binance/Telegram settings, and Audit Logs + JSON backup export.
- **PWA Ready**: Installable Progressive Web App with offline caching and Android/iOS support.

## Setup & Scripts

1. Install dependencies: `npm install`
2. Build production bundle: `npm run build`
3. Start development server on port 3000: `npm run dev`
4. Start production server on port 3000: `npm start`
