import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api'
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me')
};

export const inventoryApi = {
  getItems: () => api.get('/inventory'),
  getLowStock: () => api.get('/inventory/low-stock'),
  getExpiringSoon: () => api.get('/inventory/expiring-soon'),
  getAnalytics: () => api.get('/inventory/analytics'),
  createItem: (data) => api.post('/inventory', data),
  updateItem: (id, data) => api.put(`/inventory/${id}`, data),
  deleteItem: (id) => api.delete(`/inventory/${id}`)
};

export const transactionApi = {
  getTransactions: () => api.get('/transactions'),
  createTransaction: (data) => api.post('/transactions', data)
};

export const supplierApi = {
  getSuppliers: () => api.get('/suppliers'),
  createSupplier: (data) => api.post('/suppliers', data),
  linkItem: (supplierId, itemId) => api.post(`/suppliers/${supplierId}/items`, { item_id: itemId })
};

export const orderApi = {
  getOrders: () => api.get('/orders'),
  createOrder: (data) => api.post('/orders', data),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status })
};

export default api;
