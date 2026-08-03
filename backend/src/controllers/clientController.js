const pool = require('../config/db');

// GET /api/clients
const getClients = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT client_id, org_id, name, email, phone, company, status, notes, created_at 
       FROM client 
       ORDER BY client_id ASC`
    );
    return res.status(200).json({ success: true, clients: result.rows });
  } catch (err) {
    console.error('getClients error:', err.message);
    return res.status(500).json({ success: false, message: 'Server error retrieving clients.' });
  }
};

// POST /api/clients
const createClient = async (req, res) => {
  const { name, email, phone, company, status, notes } = req.body;
  
  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required.' });
  }

  // Assuming org_id = 1 for now (if multitenancy is needed, grab from req.user)
  const org_id = req.user ? req.user.org_id : 1;

  try {
    const result = await pool.query(
      `INSERT INTO client (org_id, name, email, phone, company, status, notes)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Active'), $7)
       RETURNING client_id, name, email, phone, company, status, notes, created_at`,
      [org_id, name, email, phone, company, status, notes]
    );
    return res.status(201).json({ success: true, message: 'Client created successfully.', client: result.rows[0] });
  } catch (err) {
    console.error('createClient error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to create client.' });
  }
};

// PUT /api/clients/:id
const updateClient = async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, company, status, notes } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, message: 'Name is required.' });
  }

  try {
    const result = await pool.query(
      `UPDATE client
       SET name = $1, email = $2, phone = $3, company = $4, status = $5, notes = $6
       WHERE client_id = $5
       RETURNING client_id, name, email, phone, company, status, notes, created_at`,
      [name, email, phone, company, status, notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    return res.status(200).json({ success: true, message: 'Client updated successfully.', client: result.rows[0] });
  } catch (err) {
    console.error('updateClient error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to update client.' });
  }
};

// DELETE /api/clients/:id
const deleteClient = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM client WHERE client_id = $1 RETURNING client_id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }

    return res.status(200).json({ success: true, message: 'Client deleted successfully.' });
  } catch (err) {
    console.error('deleteClient error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to delete client.' });
  }
};

module.exports = {
  getClients,
  createClient,
  updateClient,
  deleteClient
};
