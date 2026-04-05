/** @type {import('next').NextConfig} */

const replitDomain = process.env.REPLIT_DEV_DOMAIN || '';

const allowedDevOrigins = [
  '*.replit.dev',
  '*.kirk.replit.dev',
  '*.pike.replit.dev',
];

if (replitDomain) {
  allowedDevOrigins.push(replitDomain);
  const parts = replitDomain.split('.');
  if (parts.length > 2) {
    allowedDevOrigins.push('*.' + parts.slice(1).join('.'));
  }
}

const nextConfig = {
  reactStrictMode: false,
  allowedDevOrigins,
};

module.exports = nextConfig;
