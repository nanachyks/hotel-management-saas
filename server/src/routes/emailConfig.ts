import { Router, Request, Response } from 'express';

export const emailConfigRouter = Router();

emailConfigRouter.get('/', (_req: Request, res: Response) => {
  const configured = !!process.env.RESEND_API_KEY;
  res.json({
    configured,
    from: process.env.EMAIL_FROM || 'noreply@hotelease.com',
  });
});
