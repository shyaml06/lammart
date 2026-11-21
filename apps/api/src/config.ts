import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  dbPath: process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'store.db'),
  jwtSecret: process.env.JWT_SECRET || 'lammart-default-jwt-secret-key-32-chars-min',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieSecret: process.env.COOKIE_SECRET || 'lammart-cookie-secret-key',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'mock_key_id',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || 'mock_key_secret',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: parseInt(process.env.SMTP_PORT || '587', 10),
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFrom: process.env.SMTP_FROM || 'noreply@lammart.com',
};

export default config;
