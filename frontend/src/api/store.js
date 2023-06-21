import { create } from 'zustand';
import { persist } from 'zustand/middleware';


const useAuthStore = create(
  persist(
    (set) => ({
      isLogIn: false,
      email: '',
      isAdmin: '',
      userId:'',
      SVGAElementtoreId:null,
      login: (email,isAdmin, userId, StoreId) => set({isLogIn:true , email: email, isAdmin: isAdmin, userId:userId, StoreId: StoreId }),
      logout: () => set({ isLogIn: false, email: '', isAdmin: '', userId:'',storeId:null }),
    }),
    {
      name: 'auth-store',
      getStorage: () => localStorage,
    }
  )
);

export default useAuthStore;
