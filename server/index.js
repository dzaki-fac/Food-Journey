require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { getDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

getDb().then(() => {
  const authRoutes = require('./routes/authRoutes');
  const restaurantRoutes = require('./routes/restaurantRoutes');
  const extraRoutes = require('./routes/extraRoutes');

  app.use('/api/auth', authRoutes);
  app.use('/api/restaurants', restaurantRoutes);
  app.use('/api', extraRoutes);

  app.use((req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  app.listen(PORT, () => {
    console.log('Food Journey server running on http://localhost:' + PORT);
  });
}).catch(console.error);
