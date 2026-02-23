import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';
import { NeonBox, NeonText } from '@/components/NeonGlow';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProtectedRoute = ({ children }) => {
  const { currentUser, isOwner, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-20 bg-gray-950 flex justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400"></div>
      </div>
    );
  }

  if (!currentUser || !isOwner) {
    return (
      <div className="min-h-screen pt-32 pb-20 bg-gray-950 flex flex-col items-center justify-center text-center px-4">
        <NeonBox color="magenta" className="p-8 md:p-12 bg-gray-900/80 backdrop-blur-lg max-w-md w-full">
          <NeonText color="magenta" intensity="high" className="text-4xl font-bold mb-4 block">
            Acesso Negado
          </NeonText>
          <p className="text-gray-300 mb-8">
            Você não tem permissão para acessar esta página. Apenas o administrador do portfólio pode visualizá-la.
          </p>
          <Button asChild className="w-full bg-cyan-400 text-gray-900 hover:bg-cyan-500 font-semibold">
            <Link to="/">
              <ArrowLeft size={16} className="mr-2" /> Voltar para o Início
            </Link>
          </Button>
        </NeonBox>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
