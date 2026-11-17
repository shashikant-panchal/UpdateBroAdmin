import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { DbProfile } from '../types/database';

export const ADMIN_EMAIL = 'admin@updatebro.in';
export const ADMIN_PASSWORD = 'updatebroAdmin@123';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  profile: DbProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  signInWithCredentials: (
    email: string,
    pass: string
  ) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<DbProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setLocalAdminState = () => {
    const adminUser = {
      id: 'admin-master',
      app_metadata: {},
      user_metadata: { role: 'admin' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: ADMIN_EMAIL,
    } as unknown as User;

    const adminProfile: DbProfile = {
      id: 'admin-master',
      full_name: 'UpdateBro Admin',
      email: ADMIN_EMAIL,
      phone: null,
      shipping_address: null,
      role: 'admin',
      created_at: new Date().toISOString(),
    };

    setUser(adminUser);
    setProfile(adminProfile);
  };

  const fetchProfile = async (currentUserId: string) => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, shipping_address, role, created_at')
        .eq('id', currentUserId)
        .maybeSingle();

      if (data && !error) {
        setProfile(data as DbProfile);
      }
    } catch (err) {
      console.warn('Failed to fetch user profile:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // 1. Check local session storage first
    const hasLocalAuth = sessionStorage.getItem('ub_admin_auth') === 'true';
    if (hasLocalAuth) {
      setLocalAdminState();
    }

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    // 2. Check Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        fetchProfile(session.user.id);
      } else if (!hasLocalAuth) {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (newSession) {
          setSession(newSession);
          setUser(newSession.user);
          fetchProfile(newSession.user.id);
        } else if (sessionStorage.getItem('ub_admin_auth') === 'true') {
          setLocalAdminState();
          setIsLoading(false);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInWithCredentials = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = pass.trim();

    if (trimmedEmail !== ADMIN_EMAIL.toLowerCase() || trimmedPass !== ADMIN_PASSWORD) {
      return {
        success: false,
        error: 'Invalid administrator email or password.',
      };
    }

    // Mark verified in session storage immediately
    sessionStorage.setItem('ub_admin_auth', 'true');
    setLocalAdminState();

    // If Supabase is configured, attempt authentication / auto-bootstrap
    if (isSupabaseConfigured) {
      try {
        const { data: signInData, error: signInErr } =
          await supabase.auth.signInWithPassword({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
          });

        if (!signInErr && signInData.session) {
          setSession(signInData.session);
          setUser(signInData.session.user);
          // Ensure profile role is admin
          await supabase
            .from('profiles')
            .upsert({
              id: signInData.session.user.id,
              email: ADMIN_EMAIL,
              role: 'admin',
              full_name: 'UpdateBro Admin',
            });
          await fetchProfile(signInData.session.user.id);
        } else if (signInErr) {
          // If user doesn't exist yet in Supabase, auto-register once
          const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            options: {
              data: {
                full_name: 'UpdateBro Admin',
                role: 'admin',
              },
            },
          });

          if (!signUpErr && signUpData.user) {
            await supabase
              .from('profiles')
              .upsert({
                id: signUpData.user.id,
                email: ADMIN_EMAIL,
                role: 'admin',
                full_name: 'UpdateBro Admin',
              });
          }
        }
      } catch (err) {
        console.warn('Supabase credential sync notice:', err);
      }
    }

    return { success: true };
  };

  const signOut = async () => {
    sessionStorage.removeItem('ub_admin_auth');
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Signout error:', err);
      }
    }
    setSession(null);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user && user.id !== 'admin-master') {
      await fetchProfile(user.id);
    }
  };

  const isAdmin =
    sessionStorage.getItem('ub_admin_auth') === 'true' ||
    profile?.role === 'admin' ||
    user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        isAdmin,
        signInWithCredentials,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
