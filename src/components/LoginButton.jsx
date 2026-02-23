import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Github, LogOut } from 'lucide-react';

const LoginButton = () => {
  const { currentUser, login, logout, loading } = useAuth();

  if (loading) {
    return (
      <Button disabled variant="outline" className="border-cyan-400/30 text-cyan-400">
        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-cyan-400 mr-2"></span>
        Carregando...
      </Button>
    );
  }

  if (currentUser) {
    return (
      <Button
        onClick={logout}
        variant="outline"
        className="border-pink-500/50 text-pink-500 hover:bg-pink-500 hover:text-white transition-all shadow-[0_0_10px_rgba(255,0,255,0.2)] hover:shadow-[0_0_15px_rgba(255,0,255,0.5)]"
      >
        <LogOut size={16} className="mr-2" />
        Logout
      </Button>
    );
  }

  return (
    <Button
      onClick={login}
      variant="outline"
      className="border-cyan-400/50 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900 transition-all shadow-[0_0_10px_rgba(0,255,136,0.2)] hover:shadow-[0_0_15px_rgba(0,255,136,0.5)]"
    >
      <Github size={16} className="mr-2" />
      Login com GitHub
    </Button>
  );
};

export default LoginButton;
