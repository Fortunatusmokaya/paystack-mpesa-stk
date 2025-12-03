```markdown
# Paystack STK Push Demo

A ready-to-use Node.js payment system for Paystack STK Push (Mobile Money). Integrate this directly into your website to handle payments.

## Quick Setup

```bash
# Clone and install
git clone https://github.com/Fortunatusmokaya/paystack-mpesa-stk.git
cd paystack-mpesa-stk
npm install
```

Configure Paystack

1. Create account at https://paystack.com
2. Get API keys from dashboard
3. Create .env file and update:

```env
PAYSTACK_SECRET_KEY=your_secret_key_here
PAYSTACK_PUBLIC_KEY=your_public_key_here
PORT=3000
```

Run the Application

```bash
node server.js
```

Website Integration

This is a complete payment system ready to integrate into your website. Run the server and embed the payment form in your site.

Project Structure

```
project/
├── server.js          # Backend with Paystack API calls
├── .env              # API keys (keep secret!)
└── public/           # Frontend pages
    ├── index.html    # Payment form
    ├── callback.html # Status page
    ├── script.js     # Frontend logic
    └── style.css     # Styling
```

Usage

1. Visit http://localhost:3000
2. Enter phone number & amount
3. User receives STK Push on their phone
4. Payment status shown on callback

Notes

· Use test keys for development
· Don't expose your keys though
· For production: use live keys, enable HTTPS


License

MIT

```
