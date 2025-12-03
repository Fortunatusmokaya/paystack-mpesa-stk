const form = document.getElementById('paymentForm');
const emailInput = document.getElementById('email');
const amountInput = document.getElementById('amount');
const messageDiv = document.getElementById('message');
const payButton = document.getElementById('payButton');

let paystackPublicKey = '';


async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    paystackPublicKey = config.publicKey;
  } catch (error) {
    console.error('Error loading config:', error);
    messageDiv.textContent = 'Configuration error. Please refresh the page.';
    messageDiv.className = 'message error';
  }
}

loadConfig();

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = emailInput.value;
  const amount = amountInput.value;

  
  payButton.disabled = true;
  payButton.textContent = 'Processing...';
  messageDiv.textContent = '';
  messageDiv.className = 'message';

  try {
    
    const response = await fetch('/api/initialize-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, amount })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Payment initialization failed');
    }

    
    const handler = PaystackPop.setup({
      key: paystackPublicKey, 
      email: email,
      amount: amount * 100, 
      currency: 'KES', 
      ref: data.data.reference,
      onClose: function() {
        messageDiv.textContent = 'Payment window closed';
        messageDiv.className = 'message error';
        payButton.disabled = false;
        payButton.textContent = 'Pay Now';
      },
      callback: function(response) {
        verifyPayment(response.reference);
      }
    });

    handler.openIframe();

  } catch (error) {
    console.error('Error:', error);
    messageDiv.textContent = error.message || 'An error occurred';
    messageDiv.className = 'message error';
    payButton.disabled = false;
    payButton.textContent = 'Pay Now';
  }
});

async function verifyPayment(reference) {
  try {
    const response = await fetch(`/api/verify-payment/${reference}`);
    const data = await response.json();

    if (data.status && data.data.status === 'success') {
      messageDiv.textContent = `Payment successful! Reference: ${reference}`;
      messageDiv.className = 'message success';
      form.reset();
    } else {
      messageDiv.textContent = 'Payment verification failed';
      messageDiv.className = 'message error';
    }
  } catch (error) {
    console.error('Verification error:', error);
    messageDiv.textContent = 'Error verifying payment';
    messageDiv.className = 'message error';
  } finally {
    payButton.disabled = false;
    payButton.textContent = 'Pay Now';
  }
}