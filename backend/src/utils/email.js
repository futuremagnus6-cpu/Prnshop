const nodemailer = require('nodemailer');
const config = require('../config/env');

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

const STORE_NAME = 'Prandhara Riyansh Store';

const sendEmail = async ({ to, subject, html }) => {
  const mailOptions = {
    from: `"${STORE_NAME}" <${config.email.user}>`,
    to,
    subject,
    html,
  };

  return transporter.sendMail(mailOptions);
};

const sendVerificationEmail = async (user, token) => {
  const verificationUrl = `${config.clientUrl}/verify-email?token=${token}`;

  return sendEmail({
    to: user.email,
    subject: `Welcome to ${STORE_NAME} — Verify Your Email`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 30px; background: #f9fafb; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 12px 24px; background: #059669; border-radius: 12px;">
            <span style="font-size: 24px; font-weight: bold; color: #fff;">${STORE_NAME}</span>
          </div>
        </div>
        <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <h1 style="font-size: 22px; color: #111827; margin: 0 0 8px;">Welcome, ${user.name}! 🎉</h1>
          <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
            Thank you for creating an account at ${STORE_NAME}. Please verify your email address to get started.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${verificationUrl}" style="display: inline-block; padding: 14px 36px; background: #059669; color: #fff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
              Verify Email Address
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; margin: 0;">
            This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.
          </p>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
          ${STORE_NAME} — Your trusted healthcare partner
        </p>
      </div>
    `,
  });
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${config.clientUrl}/reset-password/${token}`;

  return sendEmail({
    to: user.email,
    subject: `Reset Your ${STORE_NAME} Password`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 30px; background: #f9fafb; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 12px 24px; background: #059669; border-radius: 12px;">
            <span style="font-size: 24px; font-weight: bold; color: #fff;">${STORE_NAME}</span>
          </div>
        </div>
        <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <h1 style="font-size: 22px; color: #111827; margin: 0 0 8px;">Reset Your Password 🔐</h1>
          <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
            Hi ${user.name}, we received a request to reset the password for your ${STORE_NAME} account.
          </p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${resetUrl}" style="display: inline-block; padding: 14px 36px; background: #059669; color: #fff; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
              Reset Password
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; margin: 0;">
            This link expires in 1 hour. If you didn't request this, please ignore this email.
          </p>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
          ${STORE_NAME} — Your trusted healthcare partner
        </p>
      </div>
    `,
  });
};

const sendOrderConfirmationEmail = async ({ order, customerEmail, customerName }) => {
  const itemsHtml = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151;">${item.productName}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #6b7280; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; text-align: right;">₹${(item.sellingPrice || 0).toLocaleString('en-IN')}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; color: #374151; text-align: right;">₹${(item.totalPrice || 0).toLocaleString('en-IN')}</td>
        </tr>
      `
    )
    .join('');

  return sendEmail({
    to: customerEmail || config.email.user,
    subject: `Order #${order.invoiceNumber} Confirmed — ${STORE_NAME}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 30px; background: #f9fafb; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 12px 24px; background: #059669; border-radius: 12px;">
            <span style="font-size: 24px; font-weight: bold; color: #fff;">${STORE_NAME}</span>
          </div>
        </div>
        <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 48px;">📦</span>
          </div>
          <h1 style="font-size: 22px; color: #111827; margin: 0 0 8px; text-align: center;">Order Confirmed! ✅</h1>
          <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 4px; text-align: center;">
            ${customerName ? `Hi ${customerName},` : ''} your order <strong>#${order.invoiceNumber}</strong> has been confirmed.
          </p>
          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 0 0 24px;">
            ${new Date(order.createdAt).toLocaleString('en-IN')}
          </p>

          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f9fafb;">
                <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Item</th>
                <th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Qty</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Rate</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="border-top: 2px solid #f3f4f6; margin-top: 16px; padding-top: 16px; text-align: right;">
            <p style="font-size: 14px; color: #6b7280; margin: 2px 0;">Subtotal: ₹${(order.subtotal || 0).toLocaleString('en-IN')}</p>
            ${order.totalGst ? `<p style="font-size: 14px; color: #6b7280; margin: 2px 0;">GST: ₹${order.totalGst.toLocaleString('en-IN')}</p>` : ''}
            ${order.discount ? `<p style="font-size: 14px; color: #ef4444; margin: 2px 0;">Discount: -₹${order.discount.toLocaleString('en-IN')}</p>` : ''}
            <p style="font-size: 20px; font-weight: bold; color: #111827; margin: 8px 0 0;">Total: ₹${(order.grandTotal || 0).toLocaleString('en-IN')}</p>
          </div>

          ${order.shipping?.address ? `
            <div style="border-top: 1px solid #f3f4f6; margin-top: 20px; padding-top: 20px;">
              <h3 style="font-size: 14px; color: #374151; margin: 0 0 8px;">📍 Shipping Address</h3>
              <p style="font-size: 13px; color: #6b7280; margin: 0;">
                ${order.shipping.name}<br/>
                ${order.shipping.address}<br/>
                ${order.shipping.city ? `${order.shipping.city}, ${order.shipping.state || ''} ${order.shipping.pincode || ''}` : ''}
              </p>
            </div>
          ` : ''}
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
          ${STORE_NAME} — Thank you for your order!
        </p>
      </div>
    `,
  });
};

const sendPaymentConfirmationEmail = async ({ order, customerEmail, customerName, paymentMethod }) => {
  return sendEmail({
    to: customerEmail || config.email.user,
    subject: `Payment Received for Order #${order.invoiceNumber} — ${STORE_NAME}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 30px; background: #f9fafb; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 12px 24px; background: #059669; border-radius: 12px;">
            <span style="font-size: 24px; font-weight: bold; color: #fff;">${STORE_NAME}</span>
          </div>
        </div>
        <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 24px;">
            <span style="font-size: 48px;">💳</span>
          </div>
          <h1 style="font-size: 22px; color: #111827; margin: 0 0 8px; text-align: center;">Payment Received! ✅</h1>
          <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 4px; text-align: center;">
            ${customerName ? `Hi ${customerName},` : ''} payment of <strong>₹${(order.grandTotal || 0).toLocaleString('en-IN')}</strong> for order <strong>#${order.invoiceNumber}</strong> has been received.
          </p>
          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 0 0 24px;">
            Payment method: ${paymentMethod || 'Online'} — ${new Date().toLocaleString('en-IN')}
          </p>
          <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; text-align: center;">
            <p style="font-size: 16px; font-weight: 600; color: #059669; margin: 0;">
              ₹${(order.grandTotal || 0).toLocaleString('en-IN')} — Paid Successfully
            </p>
          </div>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
          ${STORE_NAME} — Your trusted healthcare partner
        </p>
      </div>
    `,
  });
};

const sendStoreNotificationEmail = async ({ subject, message, details }) => {
  return sendEmail({
    to: config.email.user,
    subject: `[${STORE_NAME}] ${subject}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 30px; background: #f9fafb; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 12px 24px; background: #059669; border-radius: 12px;">
            <span style="font-size: 24px; font-weight: bold; color: #fff;">${STORE_NAME}</span>
          </div>
        </div>
        <div style="background: #fff; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
          <h1 style="font-size: 20px; color: #111827; margin: 0 0 12px;">${subject}</h1>
          <p style="color: #6b7280; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">${message}</p>
          ${details ? `<p style="color: #9ca3af; font-size: 13px; margin: 0;">${details}</p>` : ''}
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 20px;">
          ${STORE_NAME} — Store Notification
        </p>
      </div>
    `,
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendOrderConfirmationEmail,
  sendPaymentConfirmationEmail,
  sendStoreNotificationEmail,
};
