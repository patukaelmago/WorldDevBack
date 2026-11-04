require('dotenv').config();
const server = require('./src/app');
const { conn } = require('./src/db');
const { seedDemo } = require('./src/seed');
async function start() {
  try {
    await conn.authenticate();
    // Add missing tables only. Never drop or alter existing application data.
    await conn.sync();
    if (process.env.SEED_DEMO === 'true') await seedDemo();
    const listener = server.listen(process.env.PORT || 3001, '0.0.0.0', () => console.log('World Developers API is ready.'));
    const stop = () => listener.close(() => conn.close().finally(() => process.exit(0)));
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
    return listener;
  } catch (error) {
    console.error('Startup failed:', error.name || 'Error');
    process.exitCode = 1;
    await conn.close();
  }
}
if (require.main === module) start();
module.exports = { start };
