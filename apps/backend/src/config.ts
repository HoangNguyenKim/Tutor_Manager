import { randomBytes } from 'node:crypto';

export interface BackendConfig {
  host: string;
  port: number;
  localToken: string;
  dataDir: string;
  logLevel: 'debug' | 'log' | 'warn' | 'error';
  allowedOrigins: string[];
}

const DEFAULT_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173'];

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BackendConfig {
  const host = env['HOST'] ?? '127.0.0.1';
  if (host !== '127.0.0.1') {
    throw new Error(`Refusing to bind non-loopback HOST=${host}; must be 127.0.0.1`);
  }
  const port = Number(env['PORT'] ?? '3001');
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT=${env['PORT'] ?? '3001'}; must be an integer 1-65535`);
  }
  // ponytail: ephemeral token per boot; persist to user-data file (0600) when Electron owns the lifecycle.
  const localToken = env['LOCAL_TOKEN'] ?? randomBytes(32).toString('hex');
  if (localToken.length < 32) throw new Error('LOCAL_TOKEN must be at least 32 characters');
  const dataDir = env['DATA_DIR'] ?? './data';
  const logLevel = env['LOG_LEVEL'] ?? 'log';
  if (!['debug', 'log', 'warn', 'error'].includes(logLevel)) {
    throw new Error(`Invalid LOG_LEVEL=${logLevel}; use debug|log|warn|error`);
  }
  const extra = (env['ALLOWED_ORIGINS'] ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    host,
    port,
    localToken,
    dataDir,
    logLevel: logLevel as BackendConfig['logLevel'],
    allowedOrigins: [...DEFAULT_ORIGINS, ...extra],
  };
}
