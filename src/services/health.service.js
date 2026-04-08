import mongoose from 'mongoose';

export function getHealthStatus() {
  const dbState = mongoose.connection.readyState;
  const dbOk = dbState === 1;
  return {
    ok: true,
    uptime: process.uptime(),
    database: {
      connected: dbOk,
      state: ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] ?? 'unknown',
    },
    timestamp: new Date().toISOString(),
  };
}
