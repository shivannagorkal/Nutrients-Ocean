const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getToken() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('customerAccessToken');
  }

  setToken(token) {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem('customerAccessToken', token);
    } else {
      localStorage.removeItem('customerAccessToken');
    }
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'omit', // or 'include'
    });

    const json = await response.json();

    if (!response.ok) {
      const error = new Error(json.message || 'API request failed');
      error.status = response.status;
      error.code = json.code;
      error.errors = json.errors;
      throw error;
    }

    return json.data;
  }

  // --- Auth ---
  async loginWithPhone(phone, firebaseIdToken = null) {
    const data = await this.request('/customer/auth/firebase', {
      method: 'POST',
      body: JSON.stringify({
        phone,
        firebaseIdToken: firebaseIdToken || `test_token_${phone.replace(/\D/g, '')}`,
      }),
    });
    if (data?.accessToken) {
      this.setToken(data.accessToken);
    }
    return data;
  }

  async getProfile() {
    return this.request('/customer/profile');
  }

  async logout() {
    try {
      await this.request('/customer/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    }
    this.setToken(null);
  }

  // --- Catalog ---
  async getMenu() {
    return this.request('/catalog/menu');
  }

  async getSubscriptions() {
    return this.request('/catalog/subscriptions');
  }

  // --- Orders ---
  async createOrder(orderData) {
    return this.request('/customer/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async verifyRazorpayOrder(paymentData) {
    return this.request('/customer/orders/verify-razorpay', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async listOrders() {
    return this.request('/customer/orders');
  }

  // --- Subscriptions & Unlimited Freeze ---
  async createSubscriptionOrder(subData) {
    return this.request('/customer/subscriptions/create-order', {
      method: 'POST',
      body: JSON.stringify(subData),
    });
  }

  async verifySubscriptionPayment(paymentData) {
    return this.request('/customer/subscriptions/verify', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  async listSubscriptions() {
    return this.request('/customer/subscriptions');
  }

  async freezeSubscriptionDate(subscriptionId, freezeDate, reason = 'Customer requested freeze') {
    return this.request(`/customer/subscriptions/${subscriptionId}/freeze`, {
      method: 'POST',
      body: JSON.stringify({ freezeDate, reason }),
    });
  }

  async unfreezeSubscriptionDate(subscriptionId, freezeDate) {
    return this.request(`/customer/subscriptions/${subscriptionId}/freeze/${freezeDate}`, {
      method: 'DELETE',
    });
  }

  // --- 60s Rotating QR Pass ---
  async getLivePass() {
    return this.request('/customer/qr-pass');
  }
}

export const api = new ApiClient();
export default api;

