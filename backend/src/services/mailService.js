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
      <div style="font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <!-- Header with Brand Gradient -->
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
          <div style="background: rgba(255,255,255,0.15); display: inline-block; padding: 10px; border-radius: 10px; margin-bottom: 12px; backdrop-filter: blur(4px);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; font-family: 'Outfit', sans-serif;">Welcome to StockNest</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.85); font-weight: 500;">Your Coworking Workspace & Inventory Hub</p>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 32px 24px; color: #334155;">
          <h2 style="margin-top: 0; font-size: 18px; color: #0f172a; font-weight: 700;">Hi ${userName},</h2>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            Welcome on board! Your administration profile has been successfully registered. You now have full access to our space booking and consumable inventory pipeline.
          </p>

          <!-- Key Quick Start Actions -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <h3 style="margin-top: 0; font-size: 14px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; margin-bottom: 12px;">Getting Started</h3>
            <ul style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
              <li style="margin-bottom: 8px;"><strong>Reserve Spaces:</strong> Book physical workspace rooms and floor desks.</li>
              <li style="margin-bottom: 8px;"><strong>Track Inventory:</strong> Monitor consumable levels and receive low stock alerts.</li>
              <li><strong>Log Tickets:</strong> Request direct maintenance requests for physical items.</li>
            </ul>
          </div>

          <!-- Redirect CTA Button -->
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="http://localhost:8000" style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 700; display: inline-block; box-shadow: 0 4px 10px rgba(59, 130, 246, 0.25);">Launch StockNest Dashboard</a>
          </div>

          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 0;">
            Warm regards,<br/>
            <strong>The StockNest Administration</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
            This is a system generated welcome notification from StockNest Hub.<br/>
            Please do not reply directly to this email address.
          </p>
        </div>
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
      <div style="font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <!-- Header with Security Theme Red-Orange Gradient -->
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
          <div style="background: rgba(255,255,255,0.15); display: inline-block; padding: 10px; border-radius: 10px; margin-bottom: 12px; backdrop-filter: blur(4px);">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px; font-family: 'Outfit', sans-serif;">New Login Detected</h1>
          <p style="margin: 6px 0 0 0; font-size: 14px; color: rgba(255,255,255,0.85); font-weight: 500;">Security Alert & Account Access Verification</p>
        </div>
        
        <!-- Content Body -->
        <div style="padding: 32px 24px; color: #334155;">
          <h2 style="margin-top: 0; font-size: 17px; color: #0f172a; font-weight: 700;">Hello ${userName},</h2>
          <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
            A successful login was registered on your StockNest administration profile. Please verify that this authentication event belongs to you.
          </p>

          <!-- Details Grid -->
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600; width: 35%;">User Account</td>
                <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${userName}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Time of Login</td>
                <td style="padding: 6px 0; color: #0f172a;">${timeString}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Status</td>
                <td style="padding: 6px 0;"><span style="background: #ecfdf5; color: #10b981; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 12px;">Successful Auth</span></td>
              </tr>
            </table>
          </div>

          <!-- Security Warning Block -->
          <div style="border-left: 4px solid #ef4444; background: #fff5f5; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
            <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.6;">
              <strong>Not you?</strong> If you did not perform this login, someone else may have gained access to your credentials. Please secure your account immediately.
            </p>
          </div>

          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 0;">
            Best regards,<br/>
            <strong>StockNest Security Engine</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f1f5f9; padding: 16px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
            This email is sent automatically to monitor account activity.<br/>
            Please do not reply directly to this mail.
          </p>
        </div>
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
