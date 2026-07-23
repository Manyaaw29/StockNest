const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');
require('dotenv').config();

// ─────────────────────────────────────────────
// 1. Initialize SendGrid if key is present
// ─────────────────────────────────────────────
let isSendGridConfigured = false;
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  isSendGridConfigured = true;
  console.log('📧 SendGrid initialized successfully.');
}

// ─────────────────────────────────────────────
// 2. Initialize Nodemailer if credentials exist
// ─────────────────────────────────────────────
let transporter = null;
const isNodemailerConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;
if (isNodemailerConfigured) {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log('📧 Nodemailer SMTP transporter active in low-stock alerts.');
}

if (!isSendGridConfigured && !isNodemailerConfigured) {
  console.warn('⚠️  No active mail provider (SendGrid / Nodemailer) configured in .env. Alerts will print to console.');
}

/**
 * sendLowStockAlert
 * Sends a formatted HTML email when an inventory
 * item reaches Low Stock or Out of Stock status.
 * Dynamically selects SendGrid or Nodemailer based on environment setup.
 */
const sendLowStockAlert = async ({
  itemName,
  sku,
  category,
  currentStock,
  reorderPoint,
  unit,
  status,
  supplierEmail,
}) => {
  const toEmail = supplierEmail || process.env.ALERT_RECIPIENT_EMAIL || 'samaira.24cse@gmail.com';
  const isOutOfStock = status === 'Out of Stock';
  const accentColor  = isOutOfStock ? '#dc2626' : '#f59e0b';
  const subject      = isOutOfStock
    ? `🚨 OUT OF STOCK ALERT: ${itemName}`
    : `⚠️ Low Stock Alert: ${itemName}`;

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-radius:10px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.08);">
      <!-- Header -->
      <div style="background:${accentColor};padding:24px 28px;">
        <h1 style="color:#fff;margin:0;font-size:20px;letter-spacing:-.3px;">
          ${isOutOfStock ? '🚨 Out of Stock Alert' : '⚠️ Low Stock Alert'}
        </h1>
        <p style="color:rgba(255,255,255,.85);margin:6px 0 0;font-size:13px;">
          StockNest Inventory Management — Automated Notification
        </p>
      </div>

      <!-- Body -->
      <div style="background:#f8fafc;padding:28px;">
        <p style="color:#334155;font-size:15px;margin-top:0;">
          The following item requires <strong>immediate attention</strong>:
        </p>

        <!-- Detail table -->
        <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;">
          <tr style="background:#fff;">
            <td style="padding:11px 16px;color:#64748b;font-weight:600;width:40%;border-bottom:1px solid #e2e8f0;">Item Name</td>
            <td style="padding:11px 16px;color:#0f172a;font-weight:700;border-bottom:1px solid #e2e8f0;">${itemName}</td>
          </tr>
          ${sku ? `
          <tr style="background:#f8fafc;">
            <td style="padding:11px 16px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">SKU</td>
            <td style="padding:11px 16px;color:#475569;font-family:monospace;border-bottom:1px solid #e2e8f0;">${sku}</td>
          </tr>` : ''}
          <tr style="background:#fff;">
            <td style="padding:11px 16px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Category</td>
            <td style="padding:11px 16px;color:#0f172a;border-bottom:1px solid #e2e8f0;">${category || 'General'}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:11px 16px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Current Stock</td>
            <td style="padding:11px 16px;color:${accentColor};font-weight:700;font-size:16px;border-bottom:1px solid #e2e8f0;">
              ${currentStock} ${unit || 'Units'}
            </td>
          </tr>
          <tr style="background:#fff;">
            <td style="padding:11px 16px;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0;">Reorder Point</td>
            <td style="padding:11px 16px;color:#0f172a;border-bottom:1px solid #e2e8f0;">${reorderPoint} ${unit || 'Units'}</td>
          </tr>
          <tr style="background:#f8fafc;">
            <td style="padding:11px 16px;color:#64748b;font-weight:600;">Status</td>
            <td style="padding:11px 16px;">
              <span style="background:${isOutOfStock ? '#fef2f2' : '#fffbeb'};color:${accentColor};
                           padding:4px 12px;border-radius:20px;font-weight:700;font-size:13px;">
                ${status}
              </span>
            </td>
          </tr>
        </table>

        <!-- Action callout -->
        <div style="margin-top:24px;padding:16px 20px;background:#fff;border-left:4px solid ${accentColor};border-radius:0 6px 6px 0;">
          <p style="margin:0;color:#334155;font-size:14px;line-height:1.6;">
            <strong>Action Required:</strong> Please initiate a purchase order or restock this item as soon as possible to avoid operational disruptions.
          </p>
        </div>

        <!-- Footer -->
        <p style="margin-top:28px;color:#94a3b8;font-size:12px;text-align:center;">
          This is an automated alert from <strong>StockNest</strong>. Do not reply to this email.
        </p>
      </div>
    </div>
  `;

  const textBody = `${subject}\n\nItem: ${itemName}${sku ? `\nSKU: ${sku}` : ''}\nCategory: ${category || 'General'}\nCurrent Stock: ${currentStock} ${unit || 'Units'}\nReorder Point: ${reorderPoint} ${unit || 'Units'}\nStatus: ${status}\n\nPlease initiate a purchase order immediately.\n\n— StockNest Automated Alerts`;

  // 1. Try SendGrid first if configured
  if (isSendGridConfigured) {
    try {
      const msg = {
        to: toEmail,
        from: process.env.SENDGRID_FROM_EMAIL || 'no-reply@stocknest.io',
        subject,
        html: htmlBody,
        text: textBody
      };
      await sgMail.send(msg);
      console.log(`📧 [SendGrid] Low stock alert email sent to ${toEmail} for item "${itemName}"`);
      return;
    } catch (err) {
      console.error('❌ SendGrid failed, trying Nodemailer backup...', err.message);
    }
  }

  // 2. Fallback to Nodemailer if configured
  if (isNodemailerConfigured && transporter) {
    try {
      const mailOptions = {
        from: process.env.EMAIL_FROM || '"StockNest Team" <no-reply@stocknest.io>',
        to: toEmail,
        subject,
        html: htmlBody,
        text: textBody
      };
      await transporter.sendMail(mailOptions);
      console.log(`📧 [Nodemailer] Low stock alert email sent to ${toEmail} for item "${itemName}"`);
    } catch (error) {
      console.error('❌ Nodemailer failed to send low stock alert:', error.message);
    }
  } else if (!isSendGridConfigured) {
    // 3. Fallback to console simulation
    console.log('\n--- 📧 SIMULATED LOW STOCK ALERT EMAIL ---');
    console.log(`To:      ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:    ${itemName} has status: ${status}`);
    console.log('------------------------------------------\n');
  }
};

module.exports = { sendLowStockAlert };
