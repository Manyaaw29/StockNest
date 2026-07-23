const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../config/db');
const { sendWelcomeEmail, sendLoginAlertEmail } = require('../services/mailService');

// ─────────────────────────────────────────────
// Helper: generate JWT token
// ─────────────────────────────────────────────
const generateToken = (user) => {
  return jwt.sign(
    {
      user_id: user.user_id,
      email:   user.email,
      role:    user.role,
      org_id:  user.org_id,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ─────────────────────────────────────────────
// POST /api/auth/register
// Body: { name, email, password, role, org_id }
// Only Admins should be able to create new users
// (enforced at route level with checkRole)
// ─────────────────────────────────────────────
const register = async (req, res) => {
  const { name, email, password, role, org_id } = req.body;

  // Basic validation
  if (!name || !email || !password || !org_id) {
    return res.status(400).json({ message: 'name, email, password, and org_id are required.' });
  }

  const allowedRoles = ['Admin', 'Manager', 'Staff'];
  if (role && !allowedRoles.includes(role)) {
    return res.status(400).json({ message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
  }

  try {
    // Check if email already exists
    const existing = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    // Hash password (salt rounds = 10)
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, org_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING user_id, name, email, role, org_id, created_at`,
      [name, email, password_hash, role || 'Staff', org_id]
    );

    const newUser = result.rows[0];
    const token   = generateToken(newUser);

    // Trigger welcome email asynchronously
    sendWelcomeEmail(newUser.email, newUser.name);

    return res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: newUser,
    });

  } catch (err) {
    console.error('Register error:', err.message);
    return res.status(500).json({ message: 'Server error during registration.' });
  }
};

// ─────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password }
// Returns JWT token + user info
// ─────────────────────────────────────────────
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal whether email exists or not
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Compare password with hash
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Update last_login timestamp
    await pool.query(
      'UPDATE users SET last_login = NOW() WHERE user_id = $1',
      [user.user_id]
    );

    const token = generateToken(user);

    // Trigger security alert email on login
    sendLoginAlertEmail(user.email, user.name);

    return res.status(200).json({
      message: 'Login successful.',
      token,
      user: {
        user_id:    user.user_id,
        name:       user.name,
        email:      user.email,
        role:       user.role,
        org_id:     user.org_id,
        avatar_img: user.avatar_img,
        avatar_bg:  user.avatar_bg,
        avatar_text: user.avatar_text,
        last_login: user.last_login,
      },
    });

  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({ message: 'Server error during login.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/auth/me
// Protected route — returns logged-in user info
// Requires verifyToken middleware
// ─────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, name, email, role, org_id, avatar_img, avatar_bg, avatar_text, last_login, created_at FROM users WHERE user_id = $1',
    [req.userId]  // ✅ CORRECT - matches middleware
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    return res.status(200).json({ user: result.rows[0] });

  } catch (err) {
    console.error('GetMe error:', err.message);
    return res.status(500).json({ message: 'Server error.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/users
// Protected route - returns list of users in the same organization
// Requires authMiddleware + checkRole
// ─────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, org_id, email, name, role, avatar_img, avatar_bg, avatar_text, last_login, created_at FROM users WHERE org_id = $1 ORDER BY user_id ASC',
      [req.orgId]
    );
    return res.status(200).json({ success: true, users: result.rows });
  } catch (err) {
    console.error('GetUsers error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error retrieving users.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/users/:id
// Protected route - updates user information
// Admins can update any user's name, email, or role.
// Managers/Staff can only update their own profile and cannot change their role.
// ─────────────────────────────────────────────
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { name, email, role, avatar_img, avatar_bg, avatar_text } = req.body;

  try {
    const userCheck = await pool.query('SELECT * FROM users WHERE user_id = $1 AND org_id = $2', [id, req.orgId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found in your organization.' });
    }

    if (req.userRole !== 'Admin' && req.userId !== parseInt(id)) {
      return res.status(403).json({ success: false, message: 'Access denied. You can only update your own profile.' });
    }

    let targetRole = userCheck.rows[0].role;
    if (role && role !== userCheck.rows[0].role) {
      if (req.userRole !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Access denied. Only Admins can change user roles.' });
      }
      const allowedRoles = ['Admin', 'Manager', 'Staff'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${allowedRoles.join(', ')}` });
      }
      targetRole = role;
    }

    const updatedName = name !== undefined ? name : userCheck.rows[0].name;
    const updatedEmail = email !== undefined ? email : userCheck.rows[0].email;
    const updatedAvatarImg = avatar_img !== undefined ? avatar_img : userCheck.rows[0].avatar_img;
    const updatedAvatarBg = avatar_bg !== undefined ? avatar_bg : userCheck.rows[0].avatar_bg;
    const updatedAvatarText = avatar_text !== undefined ? avatar_text : userCheck.rows[0].avatar_text;

    if (email && email !== userCheck.rows[0].email) {
      const emailCheck = await pool.query('SELECT user_id FROM users WHERE email = $1 AND user_id != $2', [email, id]);
      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ success: false, message: 'Email already registered.' });
      }
    }

    const result = await pool.query(
      `UPDATE users 
       SET name = $1, email = $2, role = $3, avatar_img = $4, avatar_bg = $5, avatar_text = $6
       WHERE user_id = $7 AND org_id = $8
       RETURNING user_id, org_id, email, name, role, avatar_img, avatar_bg, avatar_text, last_login, created_at`,
      [updatedName, updatedEmail, targetRole, updatedAvatarImg, updatedAvatarBg, updatedAvatarText, id, req.orgId]
    );

    return res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user: result.rows[0],
    });
  } catch (err) {
    console.error('UpdateUser error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error updating user.' });
  }
};

module.exports = { register, login, getMe, getUsers, updateUser };

