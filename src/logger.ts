import { Logger } from './types';

export class DefaultLogger implements Logger {
  info(message: string, meta?: Record<string, unknown>): void {}
  error(message: string, error?: Error, meta?: Record<string, unknown>): void {}
  debug(message: string, meta?: Record<string, unknown>): void {}
  warn(message: string, meta?: Record<string, unknown>): void {}
}