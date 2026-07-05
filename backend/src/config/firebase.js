const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const resolvedPath = path.resolve(__dirname, '../../', serviceAccountPath);

let firebaseAdmin = null;

if (fs.existsSync(resolvedPath)) {
  try {
    admin.initializeApp({
      credential: admin.cert(require(resolvedPath)),
    });
    firebaseAdmin = admin;
    console.log('🔥 Firebase Admin initialized successfully.');
  } catch (err) {
    console.error('❌ Firebase Admin initialization failed:', err.message);
  }
} else {
  console.warn(
    `⚠️  Firebase service account key file not found at: ${resolvedPath}\n` +
    `   Google Sign-In will not be functional. Please add your credentials to enable it.`
  );
}

module.exports = firebaseAdmin;
