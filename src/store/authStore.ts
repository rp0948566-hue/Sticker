import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  setToken: (token: string) => void;
  clearToken: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      setToken: (token) => set({ token }),
      clearToken: () => set({ token: null }),
      isAuthenticated: () => !!get().token,
    }),
    {
      name: 'ap_token', // Matches sessionStorage key from admin.js
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
