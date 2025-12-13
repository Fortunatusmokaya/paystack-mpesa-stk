const API_URL = 'http://localhost:3000/api';
let currentUser = null;
let paystackPublicKey = '';

// DOM Elements
const views = {
  auth: document.getElementById('auth-view'),
  dashboard: document.getElementById('dashboard-view')
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  // Fetch Config
  const res = await fetch(`${API_URL}/config`);
  const data = await res.json();
  paystackPublicKey = data.publicKey;

  // Check LocalStorage for "Express Mode" (Simulated persistence)
  const savedUser = localStorage.getItem('paystack_user');
  if (savedUser) {
    // In a real app, we would validate a token here.
    // We will "Prompt Fingerprint" (simulate) if express mode is on.
    if (localStorage.getItem('express_mode') === 'true') {
      simulateBiometricPrompt().then(success => {
        if (success) {
          loginUser(JSON.parse(savedUser));
        }
      });
    }
  }

  setupTabs();
  loadReviews();
});

// Mock Biometric (Browser native credential API is complex to mock without FIDO server)
async function simulateBiometricPrompt() {
  // Check if device supports platform authenticators
  if (window.PublicKeyCredential &&
    await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()) {
    // In a real implementation, we would call navigator.credentials.get() here
    // For this demo, we'll show a native-like confirm dialog
    return confirm("Use your fingerprint/face ID to login?");
  }
  return true;
}

// --- Auth Handling ---
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const phone = document.getElementById('mobileNumber').value;

  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone })
    });

    const rawText = await res.text();
    console.log('Server response:', rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      throw new Error(`Server returned non-JSON: ${rawText.substring(0, 50)}...`);
    }

    if (data.error) throw new Error(data.error);

    // Save for "Express Mode" later
    localStorage.setItem('paystack_user', JSON.stringify(data.user));

    loginUser(data.user);
  } catch (err) {
    console.error(err);
    alert("Login Failed: " + err.message);
  }
});

function loginUser(user) {
  currentUser = user;

  // Switch View
  views.auth.classList.add('hidden');
  views.auth.classList.remove('active');

  views.dashboard.classList.remove('hidden');
  setTimeout(() => views.dashboard.classList.add('active'), 50);

  // Update UI
  document.getElementById('userPhoneDisplay').textContent = user.phone_number;
  if (user.email) document.getElementById('email').value = user.email;

  loadHistory();
}

document.getElementById('logoutBtn').addEventListener('click', () => {
  currentUser = null;
  localStorage.removeItem('paystack_user'); // Optional: keep if want to remember
  location.reload();
});

// --- Tab Handling ---
function setupTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      // Add active
      tab.classList.add('active');
      document.getElementById(`${tab.dataset.tab}-tab`).classList.add('active');
    });
  });
}

// --- Payment Handling ---
document.getElementById('paymentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const amount = document.getElementById('amount').value;
  const messageEl = document.getElementById('payMessage');

  messageEl.textContent = "Initializing Payment...";

  try {
    const res = await fetch(`${API_URL}/initialize-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        amount,
        userId: currentUser.id,
        phone: currentUser.phone_number
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.message);

    // Open Paystack
    const popup = new PaystackPop();
    popup.resumeTransaction(data.data.access_code);

  } catch (err) {
    messageEl.textContent = "Error: " + err.message;
    messageEl.style.color = "red";
  }
});

// Since we are using the popup, we often need to poll or handle the callback
// But Paystack Popup usually handles the redirect or callback within the iframe/window
// For 'callback_url' flow, it might redirect. The 'resumeTransaction' is for resuming.

// --- Mpesa Express (Direct Charge) ---
document.getElementById('mpesaExpressForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return alert("Please login first");

  const phone = document.getElementById('stkPhone').value;
  const amount = document.getElementById('amount').value;
  const email = document.getElementById('email').value;
  const msgEl = document.getElementById('stkMessage');

  if (!amount || !email) return alert("Please fill Email and Amount in the section above first.");

  msgEl.innerHTML = '<span class="status-badge status-pending">Sending Request... Check your phone!</span>';

  try {
    const res = await fetch(`${API_URL}/mpesa-stk-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, amount, phone })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // STK Push request sent. Now we need to handle the response.
    // Usually Paystack wraps this: data.data.status might be 'send_pin' or 'pay_offline'
    // And provides a reference to check.

    console.log('STK Response:', data);
    msgEl.innerHTML = `<span class="status-badge status-pending">Prompt Sent! Ref: ${data.data.reference}</span>`;

    // Start Polling for completion
    pollTransaction(data.data.reference, msgEl);

  } catch (err) {
    msgEl.innerHTML = `<span class="status-badge status-failed">Error: ${err.message}</span>`;
  }
});

async function pollTransaction(reference, msgEl) {
  let attempts = 0;
  const maxAttempts = 20; // 20 * 3s = 60s timeout

  const poll = setInterval(async () => {
    attempts++;
    if (attempts > maxAttempts) {
      clearInterval(poll);
      msgEl.innerHTML = `<span class="status-badge status-failed">Timeout. Please check history later.</span>`;
      return;
    }

    try {
      const res = await fetch(`${API_URL}/verify-payment/${reference}`);
      const data = await res.json();

      if (data.data.status === 'success') {
        clearInterval(poll);
        msgEl.innerHTML = `<span class="status-badge status-success">Payment Successful!</span>`;
        loadHistory(); // Refresh history
      } else if (data.data.status === 'failed') {
        clearInterval(poll);
        msgEl.innerHTML = `<span class="status-badge status-failed">Payment Failed/Cancelled.</span>`;
      }
      // If 'pending' or 'send_pin', continue polling
    } catch (e) {
      console.error("Polling error", e);
    }
  }, 3000);
}

// --- History & Reversals ---
async function loadHistory() {
  if (!currentUser) return;

  const res = await fetch(`${API_URL}/history?userId=${currentUser.id}`);
  const transactions = await res.json();

  const tbody = document.querySelector('#historyTable tbody');
  tbody.innerHTML = transactions.map(tx => `
        <tr>
            <td>${tx.reference.substring(0, 8)}...</td>
            <td>KES ${tx.amount}</td>
            <td><span class="status-badge status-${tx.status}">${tx.status}</span></td>
            <td>${new Date(tx.created_at).toLocaleDateString()}</td>
            <td>
                ${tx.status === 'success' ?
      `<button onclick="requestRefund('${tx.reference}')" class="btn-small">Reverse</button>` :
      '-'}
            </td>
        </tr>
    `).join('');
}

window.requestRefund = async (reference) => {
  if (!confirm("Are you sure you want to reverse this transaction?")) return;

  try {
    const res = await fetch(`${API_URL}/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference })
    });
    const data = await res.json();
    if (data.status) {
      alert("Refund processed successfully.");
      loadHistory();
    } else {
      alert("Refund request failed: " + data.message);
    }
  } catch (err) {
    alert("Error: " + err.message);
  }
};

document.getElementById('refreshHistory').addEventListener('click', loadHistory);


// --- Reviews ---
async function loadReviews() {
  const res = await fetch(`${API_URL}/reviews`);
  const reviews = await res.json();

  const container = document.getElementById('reviewsList');
  container.innerHTML = reviews.map(r => `
        <div class="review-card">
            <div class="review-header">
                <strong>${r.full_name || r.phone_number}</strong>
                <span class="review-stars">${'★'.repeat(r.rating)}</span>
            </div>
            <p>${r.comment}</p>
        </div>
    `).join('');
}

document.getElementById('reviewForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) {
    alert("Please login to post a review");
    return;
  }

  const rating = document.getElementById('reviewRating').value;
  const comment = document.getElementById('reviewComment').value;

  await fetch(`${API_URL}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: currentUser.id,
      rating,
      comment
    })
  });

  document.getElementById('reviewComment').value = '';
  loadReviews();
});

// --- Express Mode ---
document.getElementById('enableExpressBtn').addEventListener('click', () => {
  localStorage.setItem('express_mode', 'true');
  alert("Express Mode Enabled! Next time you open the app, we will prompt for biometrics.");
});


// --- Product / Merchant Logic ---

document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentUser) return alert("Please login first");

  const name = document.getElementById('prodName').value;
  const price = document.getElementById('prodPrice').value;
  const desc = document.getElementById('prodDesc').value;

  try {
    const res = await fetch(`${API_URL}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        name,
        price,
        description: desc
      })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    alert("Product Link Created!");
    document.getElementById('productForm').reset();
    loadProducts(); // Refresh list

  } catch (err) {
    alert("Error creating product: " + err.message);
  }
});

async function loadProducts() {
  if (!currentUser) return;

  // Only load if on products tab
  if (!document.getElementById('products-tab').classList.contains('active')) return;

  try {
    const res = await fetch(`${API_URL}/products?userId=${currentUser.id}`);
    const products = await res.json();

    const container = document.getElementById('productsList');
    if (products.length === 0) {
      container.innerHTML = '<p class="text-muted">No products yet. Create one above!</p>';
      return;
    }

    container.innerHTML = products.map(p => {
      const link = `${window.location.origin}/pay/${p.slug}`;
      const embedCode = `<iframe src="${link}" width="100%" height="600" frameborder="0"></iframe>`;

      return `
            <div class="review-card product-card">
                <div class="review-header">
                    <strong>${p.name}</strong>
                    <span class="status-badge status-success">KES ${p.price}</span>
                </div>
                <p class="text-muted">${p.description || ''}</p>
                <div class="link-box mt-20">
                    <input type="text" readonly value="${link}" onclick="this.select()">
                    <button class="btn-small" onclick="navigator.clipboard.writeText('${link}'); alert('Link Copied!')">Copy Link</button>
                    <button class="btn-small" onclick="navigator.clipboard.writeText('${embedCode.replace(/'/g, "\\'")}'); alert('Embed Code Copied!')">Copy Embed</button>
                </div>
            </div>
            `;
    }).join('');
  } catch (err) {
    console.error("Failed to load products", err);
  }
}

// Hook into tab switch to load products
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.dataset.tab === 'products') {
      loadProducts();
    }
  });
});
