const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { query, run } = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();
router.use(authMiddleware);

// Add food recommendation
router.post('/restaurants/:restaurantId/foods', (req, res) => {
  try {
    const { name, description, rating, photo } = req.body;
    if (!name) return res.status(400).json({ error: 'Nama makanan wajib diisi' });
    const id = uuidv4();
    run('INSERT INTO food_recommendations (id, restaurant_id, user_id, name, description, rating, photo) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, req.params.restaurantId, req.userId, name, description, rating, photo]);
    const [food] = query('SELECT * FROM food_recommendations WHERE id=?', [id]);
    res.json(food);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update food
router.put('/foods/:id', (req, res) => {
  try {
    const { name, description, rating, photo } = req.body;
    run('UPDATE food_recommendations SET name=?, description=?, rating=?, photo=? WHERE id=? AND user_id=?',
      [name, description, rating, photo, req.params.id, req.userId]);
    const [food] = query('SELECT * FROM food_recommendations WHERE id=?', [req.params.id]);
    res.json(food);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete food
router.delete('/foods/:id', (req, res) => {
  try {
    run('DELETE FROM food_recommendations WHERE id=? AND user_id=?', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get all food recommendations for user
router.get('/foods', (req, res) => {
  try {
    const foods = query(`SELECT fr.*, r.name as restaurant_name, r.category FROM food_recommendations fr
      JOIN restaurants r ON fr.restaurant_id = r.id WHERE fr.user_id=? ORDER BY fr.rating DESC, fr.created_at DESC`, [req.userId]);
    res.json(foods);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Add photo
router.post('/restaurants/:restaurantId/photos', (req, res) => {
  try {
    const { data, caption } = req.body;
    if (!data) return res.status(400).json({ error: 'Photo data required' });
    const id = uuidv4();
    run('INSERT INTO photos (id, restaurant_id, user_id, data, caption) VALUES (?, ?, ?, ?, ?)',
      [id, req.params.restaurantId, req.userId, data, caption]);
    const [photo] = query('SELECT * FROM photos WHERE id=?', [id]);
    res.json(photo);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Delete photo
router.delete('/photos/:id', (req, res) => {
  try {
    run('DELETE FROM photos WHERE id=? AND user_id=?', [req.params.id, req.userId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update user profile
router.put('/profile', (req, res) => {
  try {
    const { name, avatar } = req.body;
    run('UPDATE users SET name=?, avatar=? WHERE id=?', [name, avatar, req.userId]);
    const [user] = query('SELECT id, name, email, avatar FROM users WHERE id=?', [req.userId]);
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/profile', (req, res) => {
  try {
    const [user] = query('SELECT id, name, email, avatar, created_at FROM users WHERE id=?', [req.userId]);
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
