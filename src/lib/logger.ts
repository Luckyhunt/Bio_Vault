import { IS_PROD } from '@/config/env';

/**
 * 📝 BioVault Structured Logging Utility (Elite Gap #5)
 * Standardizes log levels and metadata for production observability.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogPayload {
  message: string;
  context?: Record<string, any>;
  error?: any;
}

export const logger = {
  info: (payload: LogPayload) => log('info', payload),
  warn: (payload: LogPayload) => log('warn', payload),
  error: (payload: LogPayload) => log('error', payload),
  debug: (payload: LogPayload) => {
    if (!IS_PROD) log('debug', payload);
  },
};

function log(level: LogLevel, { message, context, error }: LogPayload) {
  const timestamp = new Date().toISOString();
  const data = {
    timestamp,
    level,
    message,
    ...context,
    ...(error ? { error: error.message || error } : {}),
  };

  // In production, we suppress detailed console logs 
  // and would typically send to a provider like Axiom, Sentry, or Datadog.
  if (IS_PROD && level === 'debug') return;

  switch (level) {
    case 'error':
      console.error(JSON.stringify(data));
      break;
    case 'warn':
      console.warn(JSON.stringify(data));
      break;
    default:
      console.log(JSON.stringify(data));
  }
}
