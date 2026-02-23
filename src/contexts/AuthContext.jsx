import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  hasSupabaseSecretInBrowser,
  isSupabaseConfigured,
  supabase,
} from '@/lib/supabaseClient';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

const oauthRedirectTo =
  import.meta.env.VITE_SUPABASE_AUTH_REDIRECT_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL;

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [githubToken, setGithubToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Check active sessions and sets the user
    const getSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error('Error fetching session:', error);
      }
      setCurrentUser(session?.user || null);
      setGithubToken(session?.provider_token || null);
      setLoading(false);
    };

    getSession();

    // Listen for changes on auth state (log in, log out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
      setGithubToken(session?.provider_token || null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async () => {
    if (!isSupabaseConfigured) {
      toast({
        variant: 'destructive',
        title: 'Supabase nao configurado',
        description: hasSupabaseSecretInBrowser
          ? 'Chave secreta detectada no frontend. Use apenas anon/publishable key e gere novo build.'
          : 'Defina VITE_SUPABASE_* (ou NEXT_PUBLIC_SUPABASE_*) e gere um novo build na VPS.',
      });
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: oauthRedirectTo || window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro no login',
        description: error.message || 'Ocorreu um problema ao conectar com o GitHub.',
      });
    }
  };

  const logout = async () => {
    if (!isSupabaseConfigured) return;

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setGithubToken(null);
      toast({
        title: 'Logout realizado',
        description: 'Você saiu da sua conta com sucesso.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro no logout',
        description: error.message || 'Ocorreu um problema ao sair.',
      });
    }
  };

  // GitHub username is usually in user_metadata.user_name for GitHub OAuth in Supabase
  const isOwner = currentUser?.user_metadata?.user_name === 'kaikybrofc';

  return (
    <AuthContext.Provider
      value={{ currentUser, githubToken, loading, login, logout, isOwner }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
