const pool = require('../config/db');

// ─────────────────────────────────────────────
// GET /api/organizations
// Returns all organizations ordered by org_id
// ─────────────────────────────────────────────
const getOrganizations = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
          org_id,
          name,
          subscription_tier,
          address,
          support_email,
          created_at
       FROM organization
       ORDER BY org_id ASC`
    );

    return res.status(200).json(result.rows);

  } catch (err) {
    console.error('Organizations error:', err.message);
    return res.status(500).json({ message: 'Failed to load organizations.' });
  }
};

// ─────────────────────────────────────────────
// POST /api/organizations
// Body: { name, subscription_tier }
// ─────────────────────────────────────────────
const createOrganization = async (req, res) => {
  let { name, subscription_tier, address, support_email } = req.body;

  subscription_tier = subscription_tier || 'Professional';
  if (!name) {
    return res.status(400).json({ message: 'Name is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO organization
       (
           name,
           subscription_tier,
           address,
           support_email
       )
       VALUES
       (
           $1,
           $2,
           $3,
           $4
       )
       RETURNING
           org_id,
           name,
           subscription_tier,
           address,
           support_email,
           created_at`,
      [name, subscription_tier, address, support_email]
    );

    return res.status(201).json(result.rows[0]);

  } catch (err) {
    console.error('Create organization error:', err.message);
    return res.status(500).json({ message: 'Failed to create organization.' });
  }
};

// ─────────────────────────────────────────────
// GET /api/organizations/:id
// Returns a single organization by org_id
// ─────────────────────────────────────────────
const getOrganizationById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT
          org_id,
          name,
          subscription_tier,
          address,
          support_email,
          created_at
       FROM organization
       WHERE org_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    return res.status(200).json(result.rows[0]);

  } catch (err) {
    console.error('Get organization error:', err.message);
    return res.status(500).json({ message: 'Failed to load organization.' });
  }
};

// ─────────────────────────────────────────────
// PUT /api/organizations/:id
// Body: { name, subscription_tier }
// ─────────────────────────────────────────────
const updateOrganization = async (req, res) => {
  const { id } = req.params;
  let { name, subscription_tier, address, support_email } = req.body;

  subscription_tier = subscription_tier || 'Professional';
  if (!name) {
    return res.status(400).json({ message: 'Name is required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE organization
       SET
           name = $1,
           subscription_tier = $2,
           address = $3,
           support_email = $4
       WHERE org_id = $5
       RETURNING
           org_id,
           name,
           subscription_tier,
           address,
           support_email,
           created_at`,
      [name, subscription_tier, address, support_email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    return res.status(200).json(result.rows[0]);

  } catch (err) {
    console.error('Update organization error:', err.message);
    return res.status(500).json({ message: 'Failed to update organization.' });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/organizations/:id
// ─────────────────────────────────────────────
const deleteOrganization = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM organization
       WHERE org_id = $1
       RETURNING org_id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    return res.status(200).json({ message: 'Organization deleted successfully.' });

  } catch (err) {
    console.error('Delete organization error:', err.message);
    return res.status(500).json({ message: 'Failed to delete organization.' });
  }
};

module.exports = {
  getOrganizations,
  createOrganization,
  getOrganizationById,
  updateOrganization,
  deleteOrganization,
};
