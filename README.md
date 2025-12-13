💳 PayStack Pro - Simple Payment & Sales Hub
A secure, all-in-one system for accepting payments (Cards, M-Pesa, Mobile Money) and selling digital goods or services online using Paystack.

✨ Core Features
Universal Payments: Accepts Credit Cards, M-Pesa, Mobile Money, USSD, and Bank Transfers.

Sales Ready: Designed to sell digital goods, tickets, or services.

Secure Auth: Phone number-based login (Authentication as a Service).

Data: Automatic local tracking of all transactions (paystack.db).

UI: Premium Glassmorphism design (Mobile/Desktop friendly).

🛠️ Installation & Setup
Prerequisites
Node.js (v14+).

Paystack Account (for API keys).

Step 1: Clone & Install
Bash

git clone https://github.com/JasonMomanyi/paystack-mpesa-stk.git
cd paystack-mpesa-stk
npm install
Step 2: Configure Keys
Create a file named .env in the root and add your Paystack keys:

Code snippet

# Get these from Paystack Dashboard > Settings > API Keys
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxxxxx
PORT=3000
Step 3: Run Server
This starts the application and automatically initializes the database.

Bash

node server.js
🚀 Deployment (Example: Render)
To deploy this to a public URL:

Push the project to a GitHub repository.

Connect the repository to a hosting platform (e.g., Render, Railway, or Heroku).

Set the Build Command to npm install.

Set the Start Command to node server.js.

Add PAYSTACK_SECRET_KEY and PAYSTACK_PUBLIC_KEY to the platform's Environment Variables.

📁 Project Structure
├── server.js          # Backend (Express logic)
├── database.js        # Database connection (SQLite)
├── public/            # Frontend files (index.html, script.js, style.css)
└── .env               # Environment variables