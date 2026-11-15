import axios from 'axios';
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1', withCredentials: true });
const cookie = (name) => document.cookie.split('; ').find((row) => row.startsWith(`${name}=`))?.split('=').slice(1).join('=');
api.interceptors.request.use((config) => { const csrf = cookie('orderflow_csrf'); if (csrf && !['get', 'head', 'options'].includes(config.method)) config.headers['X-CSRF-Token'] = decodeURIComponent(csrf); return config; });
api.interceptors.response.use((r) => r, (error) => Promise.reject(new Error(error.response?.data?.error?.message || 'Something went wrong.')));
export const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value / 100);
