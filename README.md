# 💳 Paystack Inline Payment Integration

A simple and elegant Node.js Express application for integrating Paystack inline payments with support for Kenyan Shillings (KES). This project provides both a ready-to-use payment interface and an embeddable widget for easy integration into any website.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![Express](https://img.shields.io/badge/express-4.x-lightgrey.svg)

## ✨ Features

- ✅ **Simple Integration** - Get started in minutes with minimal setup
- ✅ **Paystack Inline Popup** - Seamless payment experience without leaving your site
- ✅ **KES Currency Support** - Built for Kenyan Shillings (easily adaptable to other currencies)
- ✅ **Payment Verification** - Secure backend verification of transactions
- ✅ **Responsive Design** - Beautiful UI that works on all devices
- ✅ **Error Handling** - Comprehensive error messages and validation
- ✅ **Embeddable Widget** - Allow other websites to accept payments through your service

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Paystack account ([Sign up here](https://paystack.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Fortunatusmokaya/paystack-mpesa-stk.git
   cd paystack-mpesa-stk
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   PAYSTACK_SECRET_KEY=sk_test_your_secret_key_here
   PAYSTACK_PUBLIC_KEY=pk_test_your_public_key_here
   PORT=3000
   ```

   Get your API keys from [Paystack Dashboard](https://dashboard.paystack.com/settings/developer)

4. **Run the application**
   ```bash
   node server.js
   ```

5. **Open your browser**
   
   Navigate to `http://localhost:3000`

## 📁 Project Structure

```
paystack-inline-integration/
│
├── server.js              # Express server with API endpoints
├── .env                   # Environment variables (not tracked in git)
├── package.json           # Project dependencies
│
└── public/
    ├── index.html         # Main payment form
    ├── callback.html      # Payment callback page
    ├── script.js          # Frontend payment logic
    ├── style.css          # Styling
    └── paystack-widget.js # Embeddable widget (optional)
```

## 🎯 Usage

### Basic Payment Flow

1. User enters email and amount on the payment form
2. Click "Pay Now" button
3. Paystack inline popup appears
4. User completes payment with card details or mobile money stk push
5. Payment is verified on the backend
6. Success message displayed to user

### API Endpoints

#### Initialize Payment
```http
POST /api/initialize-payment
Content-Type: application/json

{
  "email": "customer@example.com",
  "amount": 5000
}
```

#### Verify Payment
```http
GET /api/verify-payment/:reference
```

#### Get Public Key
```http
GET /api/config
```

## 🔧 Configuration

### Changing Currency

To use a different currency, update the following files:

**server.js** (line ~30):
```javascript
currency: 'KES',  // Change to USD, GHS, ZAR, etc.
```

**script.js** (line ~45):
```javascript
currency: 'KES',  
```

**index.html** (line ~20):
```html
<label for="amount">Amount (KES)</label>  <!-- Update label -->
```

### Supported Currencies
- NGN (Nigerian Naira)
- GHS (Ghanaian Cedi)
- ZAR (South African Rand)
- USD (US Dollar)
- KES (Kenyan Shilling)

## 🔐 Security Best Practices

- ✅ Never expose your `PAYSTACK_SECRET_KEY` in frontend code
- ✅ Always verify payments on the backend
- ✅ Use environment variables for sensitive data
- ✅ Add `.env` to `.gitignore`
- ✅ Use HTTPS in production
- ✅ Validate all user inputs
- ✅ Implement rate limiting for API endpoints

## 🎨 Customization

### Styling

Edit `public/style.css` to customize the appearance:

```css
/* Change button colors */
button {
    background: linear-gradient(135deg, #your-color-1, #your-color-2);
}

/* Modify form styling */
.payment-card {
    background: white;
    border-radius: 16px;
    /* Add your custom styles */
}
```

### Minimum Amount

Remove or adjust minimum amount in `public/index.html`:

```html
<input 
    type="number" 
    min="1"  <!here>
    required
>
```

## 🌐 Embeddable Widget (Advanced)

Allow other websites to accept payments through your service.

### For Your Customers

Add to their website:
```html
<!-- Include widget -->
<script src="https://yoursite.com/paystack-widget.js"></script>

<!-- Add payment button -->
<button class="paystack-pay-btn" 
        data-api-key="pk_test_demo123"
        data-email="customer@example.com"
        data-amount="5000">
    Pay 5000 KES
</button>
```

See `widget-examples.html` for more integration examples.

## 📦 Dependencies

```json
{
  "express": "^4.18.2",
  "axios": "^1.6.0",
  "dotenv": "^16.3.1",
  "cors": "^2.8.5"
}
```

## 🧪 Testing

### Test with Paystack Test Cards

Use these test cards in development mode:

**Successful Transaction:**
- Card Number: `4084084084084081`
- CVV: `408`
- Expiry: Any future date
- PIN: `0000`
- OTP: `123456`

**Failed Transaction:**
- Card Number: `5060666666666666666`

More test cards: [Paystack Test Cards Documentation](https://paystack.com/docs/payments/test-payments)

## 🚢 Deployment

### Deploy to Production

1. **Update environment variables**
   ```env
   PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key
   PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key
   PORT=3000
   ```

2. **Set up HTTPS** (Required for production)
   - Use a reverse proxy like Nginx
   - Enable SSL/TLS certificates (Let's Encrypt)

3. **Deploy to your preferred platform:**
   - **Heroku**: `git push heroku main`
   - **DigitalOcean**: Use App Platform or Droplet
   - **AWS**: EC2, Elastic Beanstalk, or Lambda
   - **Vercel/Railway**: For serverless deployment

### Environment Variables for Deployment

Make sure to set these in your hosting platform:
- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `PORT` (optional, many platforms set this automatically)

## 🐛 Troubleshooting

### "Currency not supported" error
- Ensure your Paystack account supports the currency
- Contact Paystack support to enable specific currencies
- Verify currency code is correct (e.g., 'KES', not 'Kes')

### Payment verification fails
- Check that your secret key is correct
- Ensure the reference matches the initialized transaction
- Verify your internet connection to Paystack API

### Widget not loading on other sites
- Ensure CORS is enabled in `server.js`
- Check that the widget URL is correct
- Verify API key is valid

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 👨‍💻 Author

Your Name
- GitHub: [@Fortunatusmokaya](https://github.com/Fortunatusmokaya)
- Email: mokayafortunatus@gmail.com

## 🙏 Acknowledgments

- [Paystack](https://paystack.com) for the amazing payment API
- [Express.js](https://expressjs.com) for the web framework
- The open-source community

## 📞 Support

If you need help or have questions:
- 📧 Email: mokayafortunatus@gmail.com
- 💬 Open an issue on GitHub
- 📖 Read [Paystack Documentation](https://paystack.com/docs)

## 🔗 Useful Links

- [Paystack API Reference](https://paystack.com/docs/api)
- [Paystack Inline Documentation](https://paystack.com/docs/payments/accept-payments)
- [Node.js Documentation](https://nodejs.org/en/docs/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)

---

⭐ **Star this repo if you find it helpful!** ⭐

Made with ❤️ and ☕