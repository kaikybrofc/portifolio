import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { NeonBox, NeonText } from '@/components/NeonGlow';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, User, Plus, AlertCircle, RefreshCw, ArrowRight } from 'lucide-react';
import { Helmet } from 'react-helmet';

const BlogListPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isOwner } = useAuth();
  const navigate = useNavigate();

  const fetchPosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="min-h-screen pt-32 pb-20 bg-gray-950 relative">
      <Helmet>
        <title>Blog | Kaiky Brito</title>
        <meta name="description" content="Artigos e tutoriais sobre desenvolvimento web, React, Node.js e tecnologia." />
      </Helmet>

      {/* Decorative background elements */}
      <div className="absolute inset-0 opacity-5 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-10 w-[500px] h-[500px] bg-cyan-400 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-20 right-10 w-[400px] h-[400px] bg-pink-500 rounded-full blur-[120px]"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div>
            <NeonText color="cyan" intensity="high" className="text-4xl md:text-5xl font-bold mb-4">
              Blog
            </NeonText>
            <p className="text-gray-400 text-lg max-w-2xl">
              Pensamentos, tutoriais e artigos sobre desenvolvimento web e tecnologia.
            </p>
          </div>

          {isOwner && (
            <Button
              onClick={() => navigate('/blog/editor')}
              className="bg-cyan-500 text-gray-950 hover:bg-cyan-400 shadow-[0_0_15px_rgba(0,255,136,0.3)] hover:shadow-[0_0_25px_rgba(0,255,136,0.5)] transition-all font-semibold whitespace-nowrap"
            >
              <Plus size={18} className="mr-2" /> Novo Post
            </Button>
          )}
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <NeonBox key={i} color="cyan" className="p-6 bg-gray-900/50 animate-pulse h-64 border-opacity-20" />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-gray-900/50 rounded-xl border border-red-500/30">
            <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
            <h3 className="text-xl text-white mb-2">Erro ao carregar posts</h3>
            <p className="text-gray-400 mb-6">{error}</p>
            <Button onClick={fetchPosts} variant="outline" className="border-cyan-400 text-cyan-400">
              <RefreshCw size={16} className="mr-2" /> Tentar Novamente
            </Button>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/50 rounded-xl border border-gray-800">
            <h3 className="text-xl text-white mb-2">Nenhum post encontrado</h3>
            <p className="text-gray-400">Volte mais tarde para novos conteúdos.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <Link to={`/blog/${post.id}`} key={post.id} className="block group">
                <NeonBox
                  color="cyan"
                  className="p-6 h-full bg-gray-900/80 backdrop-blur-sm border border-gray-800 group-hover:border-cyan-400/50 transition-all duration-300 transform group-hover:-translate-y-2 flex flex-col"
                >
                  <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors line-clamp-2">
                    {post.title}
                  </h2>

                  <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-800">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      {post.author || 'Kaiky Brito'}
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm mb-6 flex-grow line-clamp-3">
                    {post.content.substring(0, 150).replace(/[#*`_~\[\]()]/g, '')}...
                  </p>

                  <div className="flex items-center text-cyan-400 text-sm font-semibold group-hover:text-pink-500 transition-colors mt-auto">
                    Ler artigo <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </NeonBox>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogListPage;
