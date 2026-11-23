// -------------------------------------------------
// App configuration
// -------------------------------------------------

import 'dotenv/config';

export const config = {
  port:           parseInt(process.env.PORT || '4000', 10),
  jwtSecret:      process.env.JWT_SECRET || 'lammart-dev-secret-change-in-production',
  uploadDir:      process.env.UPLOAD_DIR || './uploads',
  nodeEnv:        process.env.NODE_ENV || 'development',
  shopStateCode:  process.env.SHOP_STATE_CODE || '24',   // Gujarat
  shopGstin:      process.env.SHOP_GSTIN || '',
};
