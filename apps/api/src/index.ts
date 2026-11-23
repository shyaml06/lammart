// -------------------------------------------------
// Server entry point
// -------------------------------------------------

import app from './app';
import { config } from './config';

app.listen(config.port, () => {
  console.log(`🚀 Lammart API listening on :${config.port} (${config.nodeEnv})`);
});
