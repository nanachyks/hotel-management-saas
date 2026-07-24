import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.EMAIL_FROM || 'noreply@hotelease.com';

let resend: Resend | null = null;
if (resendApiKey) {
  resend = new Resend(resendApiKey);
}

function logEmail(to: string, subject: string, html: string) {
  const preview = html.replace(/<[^>]+>/g, '').slice(0, 200);
  console.log(`[EMAIL] To: ${to} | Subject: ${subject}`);
  console.log(`[EMAIL] Body preview: ${preview}...`);
}

function hasEmailConfig(): boolean {
  return resend !== null;
}

function bookingConfirmationHtml(data: {
  guestName: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  bookingId: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6c63ff, #e94560); padding: 32px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">HotelEase</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Booking Confirmation</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #fff; font-size: 20px; margin: 0 0 16px;">Dear ${data.guestName},</h2>
        <p style="margin: 0 0 24px; line-height: 1.6;">Your booking has been confirmed. Here are the details:</p>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #9e9e9e;">Booking ID</td><td style="padding: 8px 0; text-align: right;">${data.bookingId.slice(0, 8)}...</td></tr>
          <tr><td style="padding: 8px 0; border-top: 1px solid #333; color: #9e9e9e;">Room</td><td style="padding: 8px 0; border-top: 1px solid #333; text-align: right;">${data.roomNumber}</td></tr>
          <tr><td style="padding: 8px 0; border-top: 1px solid #333; color: #9e9e9e;">Check-in</td><td style="padding: 8px 0; border-top: 1px solid #333; text-align: right;">${data.checkIn}</td></tr>
          <tr><td style="padding: 8px 0; border-top: 1px solid #333; color: #9e9e9e;">Check-out</td><td style="padding: 8px 0; border-top: 1px solid #333; text-align: right;">${data.checkOut}</td></tr>
          <tr><td style="padding: 8px 0; border-top: 1px solid #333; color: #fff; font-weight: bold;">Total</td><td style="padding: 8px 0; border-top: 1px solid #333; text-align: right; color: #6c63ff; font-weight: bold;">$${data.totalAmount.toFixed(2)}</td></tr>
        </table>
        <p style="margin: 24px 0 0; color: #666; font-size: 12px;">If you have any questions, please contact the front desk.</p>
      </div>
    </div>
  `;
}

function checkInHtml(data: {
  guestName: string;
  roomNumber: string;
  checkOut: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6c63ff, #e94560); padding: 32px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">HotelEase</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Welcome!</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #fff; font-size: 20px;">Welcome, ${data.guestName}!</h2>
        <p style="line-height: 1.6;">You have checked into Room <strong>${data.roomNumber}</strong>.</p>
        <p style="line-height: 1.6;">Check-out date: <strong>${data.checkOut}</strong></p>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">Enjoy your stay! If you need anything, call the front desk.</p>
      </div>
    </div>
  `;
}

function checkOutHtml(data: {
  guestName: string;
  roomNumber: string;
  totalAmount: number;
  invoiceId: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6c63ff, #e94560); padding: 32px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">HotelEase</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Thank You!</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #fff; font-size: 20px;">Thank you, ${data.guestName}!</h2>
        <p style="line-height: 1.6;">You have checked out of Room <strong>${data.roomNumber}</strong>.</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px 0; color: #9e9e9e;">Invoice</td><td style="padding: 8px 0; text-align: right;">${data.invoiceId.slice(0, 8)}...</td></tr>
          <tr><td style="padding: 8px 0; border-top: 1px solid #333; color: #fff; font-weight: bold;">Total Paid</td><td style="padding: 8px 0; border-top: 1px solid #333; text-align: right; color: #6c63ff; font-weight: bold;">$${data.totalAmount.toFixed(2)}</td></tr>
        </table>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">We hope you enjoyed your stay! We look forward to welcoming you again.</p>
      </div>
    </div>
  `;
}

export async function sendBookingConfirmation(to: string, data: {
  guestName: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
  bookingId: string;
}): Promise<void> {
  const html = bookingConfirmationHtml(data);
  const subject = 'Booking Confirmed - HotelEase';

  if (!hasEmailConfig()) {
    logEmail(to, subject, html);
    return;
  }

  try {
    await resend!.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[EMAIL] Failed to send booking confirmation:', err);
  }
}

export async function sendCheckInNotification(to: string, data: {
  guestName: string;
  roomNumber: string;
  checkOut: string;
}): Promise<void> {
  const html = checkInHtml(data);
  const subject = 'Welcome - Check-In Successful - HotelEase';

  if (!hasEmailConfig()) {
    logEmail(to, subject, html);
    return;
  }

  try {
    await resend!.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[EMAIL] Failed to send check-in notification:', err);
  }
}

function emailVerificationHtml(data: {
  name: string;
  token: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6c63ff, #e94560); padding: 32px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">HotelEase</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Verify Your Email</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #fff; font-size: 20px;">Hi ${data.name},</h2>
        <p style="line-height: 1.6;">Please verify your email address to activate your account.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${data.token}"
             style="display: inline-block; padding: 14px 36px; border-radius: 10px; text-decoration: none;
                    background: linear-gradient(135deg, #6c63ff, #e94560); color: #fff; font-size: 16px; font-weight: 600;">
            Verify Email
          </a>
        </div>
        <p style="color: #666; font-size: 13px;">Or copy this link into your browser:</p>
        <p style="color: #6c63ff; font-size: 13px; word-break: break-all;">${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${data.token}</p>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">This link expires in 24 hours. If you did not create an account, ignore this email.</p>
      </div>
    </div>
  `;
}

export async function sendEmailVerification(to: string, data: {
  name: string;
  token: string;
}): Promise<void> {
  const html = emailVerificationHtml(data);
  const subject = 'Verify Your Email - HotelEase';

  if (!hasEmailConfig()) {
    logEmail(to, subject, html);
    return;
  }

  try {
    await resend!.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[EMAIL] Failed to send verification email:', err);
  }
}

function passwordResetHtml(data: {
  name: string;
  token: string;
}): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #1a1a2e; color: #e0e0e0; border-radius: 12px; overflow: hidden;">
      <div style="background: linear-gradient(135deg, #6c63ff, #e94560); padding: 32px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">HotelEase</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Reset Your Password</p>
      </div>
      <div style="padding: 32px;">
        <h2 style="color: #fff; font-size: 20px;">Hi ${data.name},</h2>
        <p style="line-height: 1.6;">We received a request to reset your password. Click below to choose a new one.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${data.token}"
             style="display: inline-block; padding: 14px 36px; border-radius: 10px; text-decoration: none;
                    background: linear-gradient(135deg, #6c63ff, #e94560); color: #fff; font-size: 16px; font-weight: 600;">
            Reset Password
          </a>
        </div>
        <p style="color: #666; font-size: 13px;">Or copy this link into your browser:</p>
        <p style="color: #6c63ff; font-size: 13px; word-break: break-all;">${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${data.token}</p>
        <p style="margin-top: 24px; color: #666; font-size: 12px;">This link expires in 1 hour. If you did not request a password reset, ignore this email.</p>
      </div>
    </div>
  `;
}

export async function sendPasswordReset(to: string, data: {
  name: string;
  token: string;
}): Promise<void> {
  const html = passwordResetHtml(data);
  const subject = 'Reset Your Password - HotelEase';

  if (!hasEmailConfig()) {
    logEmail(to, subject, html);
    return;
  }

  try {
    await resend!.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[EMAIL] Failed to send password reset:', err);
  }
}

export async function sendCheckOutReceipt(to: string, data: {
  guestName: string;
  roomNumber: string;
  totalAmount: number;
  invoiceId: string;
}): Promise<void> {
  const html = checkOutHtml(data);
  const subject = 'Check-Out Complete - Your Receipt - HotelEase';

  if (!hasEmailConfig()) {
    logEmail(to, subject, html);
    return;
  }

  try {
    await resend!.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[EMAIL] Failed to send check-out receipt:', err);
  }
}
