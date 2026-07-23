export interface Product {
  id: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  image: string;
  hoverImage?: string;
  category?: string;
  isNew?: boolean;
  isBestSeller?: boolean;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Customer {
  name: string;
  phone: string;
  email: string;
}

export interface Address {
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface CheckoutForm extends Customer, Address {
  payment: 'COD' | 'Online';
}

export interface Order {
  id: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  product: string; // serialized product data
  url: string;
  qty: string;
  total: string;
  payment: string;
  status: string;
  payment_status: string;
  invoice_no?: string;
  rzp_order_id?: string;
  rzp_payment_id?: string;
  rzp_signature?: string;
  raw_data?: string;
}

export interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface AppsScriptOrderResponse {
  success: boolean;
  message?: string;
  orderId?: string;
  orders?: string[][];
  error?: string;
}

export interface AppsScriptAuthResponse {
  success: boolean;
  message?: string;
  token?: string;
  error?: string;
}
