import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import useAuthGate from '../hooks/useAuthGate';
import { clearTokens, getActorType } from '../utils/token';
import { setSessionExpiredHandler } from '../utils/apiClient';
import { revokeSession } from '../api/auth';
import { clearCachedUser } from './UserContext';
import { queryClient } from '../queries/client';
import { unregisterPush } from '../utils/push';

const AuthContext = createContext({
  signedIn: false,
  actorType: 'customer',
  checked: false,
  locked: false,
  unlocking: false,
  signIn: () => {},
  signOut: async () => {},
  retryUnlock: () => {},
  abandonSession: () => {},
});

// Kirish holati: `signedIn` marshrutlarni himoyalaydi (src/app/_layout.js), `checked`/`locked` —
// ilova ochilganda saqlangan sessiyani (biometrik bilan) tekshirish bosqichi.
export function AuthProvider({ children }) {
  const [signedIn, setSignedIn] = useState(false);
  // Kim kirgani: 'customer' (mijoz) yoki 'worker' (usta). Marshrutlar shunga qarab ajraladi.
  const [actorType, setActorType] = useState('customer');
  const gate = useAuthGate({
    onUnlocked: async () => {
      setActorType((await getActorType()) === 'worker' ? 'worker' : 'customer');
      setSignedIn(true);
    },
  });

  const signIn = useCallback((actor) => {
    setActorType(actor === 'worker' ? 'worker' : 'customer');
    setSignedIn(true);
  }, []);

  const endSession = useCallback(async () => {
    await clearTokens();
    await clearCachedUser();
    // Oldingi foydalanuvchining keshlangan ma'lumoti keyingisiga ko'rinmasin.
    queryClient.clear();
    setSignedIn(false);
    setActorType('customer');
  }, []);

  // Foydalanuvchi o'zi chiqadi: refresh token serverda ham bekor qilinadi.
  const signOut = useCallback(async () => {
    // Token hali yaroqli paytda: shu qurilmaga keyingi foydalanuvchi xabari kelmasin.
    await unregisterPush();
    await revokeSession();
    await endSession();
  }, [endSession]);

  // Refresh token ham yaroqsiz bo'lsa (muddati tugagan yoki boshqa qurilmadan bekor qilingan),
  // sessiya jimgina tugatiladi va foydalanuvchi kirish ekraniga qaytadi.
  useEffect(() => {
    setSessionExpiredHandler(endSession);
    return () => setSessionExpiredHandler(null);
  }, [endSession]);

  const value = useMemo(
    () => ({
      signedIn,
      actorType,
      checked: gate.authChecked,
      locked: gate.locked,
      unlocking: gate.unlocking,
      retryUnlock: gate.retryUnlock,
      abandonSession: gate.abandonSession,
      signIn,
      signOut,
    }),
    [
      signedIn,
      actorType,
      gate.authChecked,
      gate.locked,
      gate.unlocking,
      gate.retryUnlock,
      gate.abandonSession,
      signIn,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
