/**
 * Standalone Production / Development Server
 * Listens on PORT (default 3000 or process.env.PORT)
 */

import http from 'http';
import { app } from './src/server/app';
import { checkPostgresHealth } from './src/server/db/connection';

const PORT = parseInt(process.env.PORT || '3000', 10);
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', async () => {
  console.log(`✈️ SKY WINGS Server running at http://0.0.0.0:${PORT}`);
  const status = await checkPostgresHealth();
  if (status.isConnectedToPostgres) {
    console.log(`✅ Connected to PostgreSQL database [${status.database}] on ${status.host}:${status.port}`);
  } else {
    console.log(`ℹ️ Running in local PostgreSQL replica mode (${status.errorMessage || 'standalone'})`);
  }
});
