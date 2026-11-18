const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getToken() {
    if (typeof window === 'undefined') return null;
    const local = localStorage.getItem('customerAccessToken');
    if (local) return local;
    const match = document.cookie.match(new RegExp('(^| )customerAccessToken=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  setToken(token) {
    if (typeof window === 'undefined') return;
    if (token) {
      localStorage.setItem('customerAccessToken', token);
      document.cookie = `customerAccessToken=${encodeURIComponent(token)}; path=/; max-age=2592000; SameSite=Lax`;
    } else {
      localStorage.removeItem('customerAccessToken');
      document.cookie = 'customerAccessToken=; path=/; max-age=0; SameSite=Lax';
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

  // --- Auth (Mobile + Password) ---
  async registerCustomer({ phone, fullName, password }) {
    const data = await this.request('/customer/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, fullName, password }),
    });
    if (data?.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async loginCustomer({ phone, password }) {
    const data = await this.request('/customer/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    if (data?.token) {
      this.setToken(data.token);
    }
    return data;
  }

  async getProfile() {
    return this.request('/customer/auth/me');
  }

  async logout() {
    this.setToken(null);
  }

  // Backwards compatibility alias
  async loginWithPhone(phone, password = '') {
    return this.loginCustomer({ phone, password });
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

