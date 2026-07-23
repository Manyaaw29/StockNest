const nodemailer = require('nodemailer');
require('dotenv').config();

// Create SMTP Transporter using Gmail service if configuration exists
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
  console.log('📧 Nodemailer SMTP mail transporter initialized.');
} else {
  console.warn('⚠️  Nodemailer: EMAIL_USER and EMAIL_PASS not set in .env. Outgoing welcome/login emails will print to the console.');
}

/**
 * Sends a welcome email upon successful account registration.
 */
const sendWelcomeEmail = async (toEmail, userName) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"StockNest Team" <no-reply@stocknest.io>',
    to: toEmail,
    subject: '🚀 Welcome to StockNest - Space & Inventory Hub!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-bottom: 12px;">Hi ${userName},</h2>
        <p style="font-size: 15px; color: #334155; line-height: 1.6;">
          Welcome to <strong>StockNest Workspace Hub</strong>! Your account has been created successfully.
        </p>
        <p style="font-size: 14px; color: #64748b;">
          You can now log in, configure floor layouts, reserve meeting spaces, and track inventory consumable stock levels.
        </p>
        <hr style="margin: 20px 0; border: 0; border-top: 1px solid #e2e8f0;" />
        <p style="font-size: 12px; color: #94a3b8; text-align: center;">
          This is a system generated welcome email from StockNest.
        </p>
      </div>`
  };

  if (isConfigured && transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Welcome email sent to ${toEmail}`);
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error.message);
    }
  } else {
    console.log('\n--- 📧 SIMULATED WELCOME EMAIL ---');
    console.log(`To:      ${toEmail}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(`Body:    Hi ${userName}, Welcome to StockNest Workspace Hub!`);
    console.log('----------------------------------\n');
  }
};

/**
 * Sends a notification email on a login event.
 */
const sendLoginAlertEmail = async (toEmail, userName) => {
  const timeString = new Date().toLocaleString();
  const mailOptions = {
    from: process.env.EMAIL_FROM || '"StockNest Team" <no-reply@stocknest.io>',
    to: toEmail,
    subject: '🔑 StockNest Security Alert: New Login Detected',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h3 style="color: #dc2626; margin-bottom: 12px;">New Account Activity</h3>
        <p style="font-size: 14px; color: #334155; line-height: 1.6;">
          Hello ${userName},<br/>
          We detected a successful login to your StockNest account on <strong>${timeString}</strong>.
        </p>
        <p style="font-size: 13px; color: #64748b;">
          If this was you, you can safely ignore this message. If you did not authorize this action, please secure your account immediately.
        </p>
      </div>`
  };

  if (isConfigured && transporter) {
    try {
      await transporter.sendMail(mailOptions);
      console.log(`📧 Login alert email sent to ${toEmail}`);
    } catch (error) {
      console.error('❌ Failed to send login alert email:', error.message);
    }
  } else {
    console.log('\n--- 📧 SIMULATED LOGIN ALERT EMAIL ---');
    console.log(`To:      ${toEmail}`);
    console.log(`Subject: ${mailOptions.subject}`);
    console.log(`Body:    Hello ${userName}, new login detected at ${timeString}.`);
    console.log('--------------------------------------\n');
  }
};

module.exports = { sendWelcomeEmail, sendLoginAlertEmail };
