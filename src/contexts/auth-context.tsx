import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

import { api } from '@/services/api';
import { Asesor, Cliente, Usuario } from '@/services/types';

const STORAGE_KEY = 'jka_session';

interface StoredSession {
  token: string;
  user: Usuario;
  cliente: Cliente | null;
  asesor: Asesor | null;
}

interface AuthContextValue {
  token: string | null;
  user: Usuario | null;
  cliente: Cliente | null;
  asesor: Asesor | null;
  hydrated: boolean;
  loading: boolean;
  isLoggedIn: boolean;
  login: (correo: string, contrasena: string) => Promise<StoredSession>;
  register: (form: Record<string, unknown>) => Promise<StoredSession>;
  logout: () => Promise<void>;
  updateProfile: (patch: { cliente?: Partial<Cliente>; asesor?: Partial<Asesor> }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<Usuario | null>(null);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [asesor, setAsesor] = useState<Asesor | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const session: StoredSession = JSON.parse(raw);
          setToken(session.token);
          setUser(session.user);
          setCliente(session.cliente ?? null);
          setAsesor(session.asesor ?? null);
        }
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  const persist = async (session: StoredSession) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setToken(session.token);
    setUser(session.user);
    setCliente(session.cliente ?? null);
    setAsesor(session.asesor ?? null);
  };

  const login = async (correo: string, contrasena: string) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { correo, contrasena });
      const session: StoredSession = {
        token: data.token,
        user: data.user,
        cliente: data.cliente ?? null,
        asesor: data.asesor ?? null,
      };
      await persist(session);
      return session;
    } finally {
      setLoading(false);
    }
  };

  const register = async (form: Record<string, unknown>) => {
    setLoading(true);
    try {
      const data = await api.post('/auth/register', { ...form, rango: 'cliente' });
      const session: StoredSession = {
        token: data.token,
        user: data.user,
        cliente: data.cliente ?? null,
        asesor: data.asesor ?? null,
      };
      await persist(session);
      return session;
    } finally {
      setLoading(false);
    }
  };

  // Aplica cambios locales (ej. tras editar el perfil) sin necesidad de volver a
  // iniciar sesión: actualiza tanto el estado en memoria como lo persistido.
  const updateProfile = async (patch: { cliente?: Partial<Cliente>; asesor?: Partial<Asesor> }) => {
    const nextCliente = patch.cliente ? { ...(cliente as Cliente), ...patch.cliente } : cliente;
    const nextAsesor = patch.asesor ? { ...(asesor as Asesor), ...patch.asesor } : asesor;
    setCliente(nextCliente);
    setAsesor(nextAsesor);
    if (token && user) {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ token, user, cliente: nextCliente, asesor: nextAsesor })
      );
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setToken(null);
    setUser(null);
    setCliente(null);
    setAsesor(null);
  };

  const isLoggedIn = !!token;

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        cliente,
        asesor,
        hydrated,
        loading,
        isLoggedIn,
        login,
        register,
        logout,
        updateProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de un AuthProvider');
  return ctx;
}
