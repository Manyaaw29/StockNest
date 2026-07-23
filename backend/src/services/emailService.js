const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter using Gmail credentials
let transporter = null;
const isConfigured = process.env.EMAIL_USER && process.env.EMAIL_PASS;

if (isConfigured) {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  console.log('📧 Low Stock Alerts mailer initialized (Gmail SMTP).');
} else {
  console.warn('⚠️  Nodemailer: EMAIL_USER and EMAIL_PASS not set in .env. Outgoing low stock alerts will print to the console.');
}

/**
 * sendLowStockAlert
 * Sends a formatted HTML email when an inventory
 * item reaches Low Stock or Out of Stock status.
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

  const mailOptions = {
    from: process.env.EMAIL_FROM || '"StockNest Team" <no-reply@stocknest.io>',
    to: toEmail,
    subject: subject,
    html: htmlBody,
    text: `${subject}\n\nItem: ${itemName}${sku ? `\nSKU: ${sku}` : ''}\nCategory: ${category || 'General'}\nCurrent Stock: ${currentStock} ${unit || 'Units'}\nReorder Point: ${reorderPoint} ${unit || 'Units'}\nStatus: ${status}\n\nPlease initiate a purchase order immediately.\n\n— StockNest Automated Alerts`,
  };

  if (isConfigured && transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Low stock alert email sent to ${toEmail} for item "${itemName}"`);
    } catch (error) {
      console.error('❌ Failed to send low stock alert email:', error.message);
    }
  } else {
    console.log('\n--- 📧 SIMULATED LOW STOCK ALERT EMAIL ---');
    console.log(`To:      ${toEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body:    ${itemName} has status: ${status}`);
    console.log('------------------------------------------\n');
  }
};

module.exports = { sendLowStockAlert };
