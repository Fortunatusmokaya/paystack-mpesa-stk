const express = require('express');
const path = require('path');
const axios = require('axios');
const db = require('./database');
const cors = require('cors'); // Good practice even if same origin
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(cors());

// --- Auth Routes ---

// Login or Register by Phone
app.post('/api/auth/login', (req, res) => {
  console.log('Login request body:', req.body);
  const { phone } = req.body;
  if (!phone) {
    console.error('No phone number provided');
    return res.status(400).json({ error: 'Phone number required' });
  }

  db.get('SELECT * FROM users WHERE phone_number = ?', [phone], (err, row) => {
    if (err) {
      console.error('Database match error:', err.message);
      return res.status(500).json({ error: err.message });
    }

    if (row) {
      console.log('Found existing user:', row);
      res.json({ user: row, isNew: false });
    } else {
      console.log('Creating new user for:', phone);
      db.run('INSERT INTO users (phone_number) VALUES (?)', [phone], function (err) {
        if (err) {
          console.error('Insert error:', err.message);
          return res.status(500).json({ error: err.message });
        }

        const newId = this.lastID;
        console.log('New user created, ID:', newId);

        db.get('SELECT * FROM users WHERE id = ?', [newId], (err, newUser) => {
          if (err) {
            console.error('Error fetching new user:', err.message);
            return res.status(500).json({ error: 'User created but failed to fetch' });
          }
          console.log('Returning new user:', newUser);
          res.json({ user: newUser, isNew: true });
        });
      });
    }
  });
});

app.post('/api/auth/update', (req, res) => {
  const { userId, email } = req.body;
  db.run('UPDATE users SET email = ? WHERE id = ?', [email, userId], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

// --- Payment Routes ---

app.get('/api/config', (req, res) => {
  res.json({
    publicKey: process.env.PAYSTACK_PUBLIC_KEY
  });
});

app.post('/api/initialize-payment', async (req, res) => {
  try {
    const { email, amount, userId, phone } = req.body;

    // Ensure user exists or update their email if provided
    if (userId && email) {
      db.run('UPDATE users SET email = ? WHERE id = ?', [email, userId]);
    }

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: amount * 100,
        currency: 'KES',
        callback_url: `${req.protocol}://${req.get('host')}/payment-callback`,
        channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
        metadata: {
          phone_number: phone
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const reference = response.data.data.reference;

    // Record pending transaction
    db.run(`INSERT INTO transactions (user_id, reference, amount, email, status) 
                VALUES (?, ?, ?, ?, 'pending')`,
      [userId, reference, amount, email],
      (err) => {
        if (err) console.error('Error saving transaction', err);
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Payment initialization error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Payment initialization failed',
      message: error.response?.data?.message || error.message
    });
  }
});

app.get('/api/verify-payment/:reference', async (req, res) => {
  try {
    const { reference } = req.params;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    const status = response.data.data.status;
    const channel = response.data.data.channel;

    // Update transaction status
    db.run('UPDATE transactions SET status = ?, channel = ? WHERE reference = ?',
      [status, channel, reference]);

    res.json(response.data);
  } catch (error) {
    console.error('Payment verification error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Payment verification failed',
      message: error.response?.data?.message || error.message
    });
  }
});

app.post('/api/refund', async (req, res) => {
  // Note: Reversals/Refunds usually require separate permissions or API calls
  // Using Paystack Refund API
  try {
    const { reference, amount } = req.body;

    const response = await axios.post(
      'https://api.paystack.co/refund',
      { transaction: reference, amount: amount ? amount * 100 : undefined },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    db.run('UPDATE transactions SET status = "reversed" WHERE reference = ?', [reference]);

    res.json(response.data);
  } catch (error) {
    console.error('Refund error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Refund failed', details: error.response?.data });
  }
});

app.get('/api/history', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'User ID required' });

  db.all('SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- Reviews Routes ---

app.get('/api/reviews', (req, res) => {
  db.all(`SELECT r.*, u.phone_number, u.full_name FROM reviews r 
            JOIN users u ON r.user_id = u.id 
            ORDER BY r.created_at DESC LIMIT 20`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/reviews', (req, res) => {
  const { userId, rating, comment } = req.body;
  db.run('INSERT INTO reviews (user_id, rating, comment) VALUES (?, ?, ?)',
    [userId, rating, comment], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, id: this.lastID });
    });
});


// --- Mpesa STK Push Route ---

app.post('/api/mpesa-stk-push', async (req, res) => {
  try {
    const { email, amount, phone } = req.body;

    const response = await axios.post(
      'https://api.paystack.co/charge',
      {
        email,
        amount: amount * 100,
        currency: 'KES',
        mobile_money: {
          phone,
          provider: 'mpesa'
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('STK Push error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'STK Push failed',
      message: error.response?.data?.message || error.message
    });
  }
});

// --- Product / Payment Link Routes ---

app.post('/api/products', (req, res) => {
  const { userId, name, description, price } = req.body;
  // Simple slug generation: name-timestamp
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`;

  db.run('INSERT INTO products (user_id, slug, name, description, price) VALUES (?, ?, ?, ?, ?)',
    [userId, slug, name, description, price], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, slug, id: this.lastID });
    });
});

app.get('/api/products', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'User ID required' });

  db.all('SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC', [userId], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.get('/api/public/product/:slug', (req, res) => {
  const { slug } = req.params;
  db.get('SELECT * FROM products WHERE slug = ?', [slug], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Product not found' });
    res.json(row);
  });
});

// Serve the dynamic payment page
app.get('/pay/:slug', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'pay.html'));
});


// Serve Pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/payment-callback', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'callback.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
