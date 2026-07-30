import crypto from 'crypto';

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
const BASE = 'https://api.paystack.co';

interface PaystackResponse {
  status: boolean;
  message: string;
  data?: any;
}

async function request(method: string, path: string, body?: any): Promise<PaystackResponse> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export interface InitTransactionParams {
  email: string;
  amount: number; // in pesewas (GHS 29 = 2900)
  callback_url: string;
  metadata?: Record<string, any>;
}

export interface InitTransactionResult {
  authorization_url: string;
  reference: string;
  access_code: string;
}

export async function initializeTransaction(params: InitTransactionParams): Promise<InitTransactionResult> {
  const res = await request('POST', '/transaction/initialize', {
    email: params.email,
    amount: params.amount,
    callback_url: params.callback_url,
    metadata: params.metadata || {},
  });
  if (!res.status || !res.data) {
    throw new Error(res.message || 'Paystack initialization failed');
  }
  return {
    authorization_url: res.data.authorization_url,
    reference: res.data.reference,
    access_code: res.data.access_code,
  };
}

export interface VerifyTransactionResult {
  status: string; // 'success' | 'failed' | 'abandoned'
  amount: number;
  currency: string;
  paid_at: string;
  reference: string;
  gateway_response: string;
}

export async function verifyTransaction(reference: string): Promise<VerifyTransactionResult> {
  const res = await request('GET', `/transaction/verify/${reference}`);
  if (!res.status || !res.data) {
    throw new Error(res.message || 'Paystack verification failed');
  }
  return {
    status: res.data.status,
    amount: res.data.amount,
    currency: res.data.currency,
    paid_at: res.data.paid_at,
    reference: res.data.reference,
    gateway_response: res.data.gateway_response,
  };
}

export function isConfigured(): boolean {
  return PAYSTACK_SECRET.length > 0 && PAYSTACK_SECRET !== 'sk_test_your_key_here';
}

// Paystack signs webhook payloads with HMAC-SHA512 of the raw request body, keyed with the
// secret key. Verifying this is the only thing standing between this endpoint and anyone on
// the internet POSTing a fake "charge.success" event to grant themselves a subscription.
export function verifyWebhookSignature(rawBody: Buffer, signature: string | string[] | undefined): boolean {
  if (!signature || typeof signature !== 'string' || !PAYSTACK_SECRET) return false;
  const hash = crypto.createHmac('sha512', PAYSTACK_SECRET).update(rawBody).digest('hex');
  const hashBuf = Buffer.from(hash);
  const sigBuf = Buffer.from(signature);
  if (hashBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, sigBuf);
}
