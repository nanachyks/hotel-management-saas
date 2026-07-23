import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

const logPath = path.join(import.meta.dirname, '..', 'server.log');

function logError(err: Error) {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${err.stack || err.message}\n`;
  try {
    fs.appendFileSync(logPath, message);
  } catch {
    // fail silently if log write fails
  }
  console.error(err.stack);
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  logError(err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
}
