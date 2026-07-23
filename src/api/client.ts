import { APIResponse, AppsScriptOrderResponse } from '@/types/models';

export const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzCl2byGPvw17w4axjT7iLxrxPlTNPggDFbwMNuVHM7uDW01o1StjdufxQF9qE8p7cNvw/exec";

export const api = {
  async submitOrder(formData: FormData): Promise<AppsScriptOrderResponse> {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: formData
    });
    return response.json();
  },

  async pingAdmin(token: string): Promise<APIResponse> {
    const response = await fetch(`${SCRIPT_URL}?action=adminPing&token=${encodeURIComponent(token)}`);
    return response.json();
  },

  async fetchOrders(token: string): Promise<AppsScriptOrderResponse> {
    const response = await fetch(`${SCRIPT_URL}?action=getOrders&token=${encodeURIComponent(token)}`);
    return response.json();
  },

  async updateOrderStatus(formData: FormData): Promise<APIResponse> {
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: formData
    });
    return response.json();
  }
};
