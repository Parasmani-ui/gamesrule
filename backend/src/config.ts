import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  databaseUrl: process.env.DATABASE_URL!,
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  redisEnabled: process.env.REDIS_ENABLED === 'true',
  
  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  // Rate Limiting (higher limits for development)
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '200', 10), // 200 per minute
  
  // Game Configuration
  defaultRoundTimerSeconds: parseInt(process.env.DEFAULT_ROUND_TIMER_SECONDS || '60', 10),
  botDecisionDelayMs: parseInt(process.env.BOT_DECISION_DELAY_MS || '2000', 10),
};

// Validate critical config
if (!config.databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

if (config.nodeEnv === 'production' && config.jwtSecret === 'dev-secret-change-in-production') {
  throw new Error('JWT_SECRET must be set in production');
}
