const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, run } = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

// Get all restaurants for user
router.get('/', (req, res) => {
  try {
    const { search, rating, category, favorite } = req.query;
    let sql = 'SELECT * FROM restaurants WHERE user_id = ?';
    const params = [req.userId];

    if (search) { sql += ' AND name LIKE ?'; params.push(`%${search}%`); }
    if (rating) { sql += ' AND personal_rating >= ?'; params.push(parseInt(rating)); }
    if (category) { sql += ' AND category = ?'; params.push(category); }
    if (favorite === '1') { sql += ' AND is_favorite = 1'; }
    sql += ' ORDER BY created_at DESC';

    const restaurants = query(sql, params);
    res.json(restaurants);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get single restaurant
router.get('/:id', (req, res) => {
  try {
    const [restaurant] = query('SELECT * FROM restaurants WHERE id = ? AND user_id = ?', [req.params.id, req.userId]);
    if (!restaurant) return res.status(404).json({ error: 'Not found' });

    const foods = query('SELECT * FROM food_recommendations WHERE restaurant_id = ? ORDER BY rating DESC', [req.params.id]);
    const photos = query('SELECT * FROM photos WHERE restaurant_id = ? ORDER BY created_at DESC', [req.params.id]);

    res.json({ ...restaurant, foods, photos });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add restaurant
router.post('/', (req, res) => {
  try {
    const { place_id, name, address, lat, lng, category, google_rating, google_photo, visit_date, personal_rating, review } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama wajib diisi' });

    const id = uuidv4();
    run(`INSERT INTO restaurants (id, user_id, place_id, name, address, lat, lng, category, google_rating, google_photo, visit_date, personal_rating, review)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.userId, place_id, name, address, lat, lng, category, google_rating, google_photo, visit_date, personal_rating, review]);

    const [restaurant] = query('SELECT * FROM restaurants WHERE id = ?', [id]);
    res.json(restaurant);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update restaurant
router.put('/:id', (req, res) => {
  try {
    const { name, address, visit_date, personal_rating, review, is_favorite, category } = req.body;
    run(`UPDATE restaurants SET name=?, address=?, visit_date=?, personal_rating=?, review=?, is_favorite=?, category=?
         WHERE id=? AND user_id=?`,
      [name, address, visit_date, personal_rating, review, is_favorite ? 1 : 0, category, req.params.id, req.userId]);
    const [restaurant] = query('SELECT * FROM restaurants WHERE id = ?', [req.params.id]);
    res.json(restaurant);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Toggle favorite
router.patch('/:id/favorite', (req, res) => {
  try {
    const [r] = query('SELECT is_favorite FROM restaurants WHERE id=? AND user_id=?', [req.params.id, req.userId]);
    if (!r) return res.status(404).json({ error: 'Not found' });
    run('UPDATE restaurants SET is_favorite=? WHERE id=? AND user_id=?', [r.is_favorite ? 0 : 1, req.params.id, req.userId]);
    res.json({ is_favorite: !r.is_favorite });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete restaurant
router.delete('/:id', (req, res) => {
  try {
    run('DELETE FROM food_recommendations WHERE restaurant_id=?', [req.params.id]);
    run('DELETE FROM photos WHERE restaurant_id=?', [req.params.id]);
    run('DELETE FROM restaurants WHERE id=? AND user_id=?', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Dashboard stats
router.get('/stats/dashboard', (req, res) => {
  try {
    const [stats] = query(`SELECT COUNT(*) as total, AVG(personal_rating) as avg_rating,
      SUM(is_favorite) as total_favorites FROM restaurants WHERE user_id=?`, [req.userId]);
    const topFoods = query(`SELECT fr.*, r.name as restaurant_name FROM food_recommendations fr
      JOIN restaurants r ON fr.restaurant_id = r.id WHERE fr.user_id=? ORDER BY fr.rating DESC LIMIT 5`, [req.userId]);
    const favorites = query('SELECT * FROM restaurants WHERE user_id=? AND is_favorite=1 LIMIT 5', [req.userId]);
    const allLocations = query('SELECT id, name, lat, lng, personal_rating, is_favorite FROM restaurants WHERE user_id=? AND lat IS NOT NULL', [req.userId]);
    res.json({ stats, topFoods, favorites, allLocations });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
