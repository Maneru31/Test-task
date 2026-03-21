import { create } from 'zustand';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UiState {
  toasts: Toast[];
  activeModal: string | null;
  isOffline: boolean;
  showToast: (message: string, type?: Toast['type']) => void;
  hideToast: (id: string) => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  setIsOffline: (value: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  toasts: [],
  activeModal: null,
  isOffline: false,

  showToast: (message, type = 'info') => {
    const id = String(Date.now());
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 3000);
  },

  hideToast: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },

  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  setIsOffline: (value) => set({ isOffline: value }),
}));
