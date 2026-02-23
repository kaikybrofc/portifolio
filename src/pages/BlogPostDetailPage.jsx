import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { NeonBox, NeonText } from '@/components/NeonGlow';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, Clock, Edit, Trash2 } from 'lucide-react';
import { Helmet } from 'react-helmet';
import BlogComments from '@/components/BlogComments';
import ReactMarkdown from 'react-markdown';
import { useMarkdownStyles } from '@/hooks/useMarkdownStyles.jsx';
import { useToast } from '@/components/ui/use-toast';
import { getPostTags } from '@/lib/blogTags';

const BlogPostDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isOwner } = useAuth();
  const { toast } = useToast();
  const { markdownComponents } = useMarkdownStyles();

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setPost(data);
      } catch (err) {
        setError(err.message || 'Post não encontrado.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchPost();
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Tem certeza que deseja deletar este post? Esta ação não pode ser desfeita.")) return;

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Post deletado com sucesso!" });
      navigate('/blog');
    } catch (err) {
      toast({ title: "Erro ao deletar", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-20 bg-gray-950 flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen pt-32 pb-20 bg-gray-950 flex flex-col items-center justify-center text-center px-4">
        <NeonText color="magenta" intensity="high" className="text-4xl font-bold mb-4">404 - {error || 'Post não encontrado'}</NeonText>
        <Button asChild variant="outline" className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900 mt-6">
          <Link to="/blog"><ArrowLeft size={16} className="mr-2" /> Voltar ao Blog</Link>
        </Button>
      </div>
    );
  }

  const postTags = getPostTags(post);

  return (
    <div className="min-h-screen pt-32 pb-20 bg-gray-950 relative">
      <Helmet>
        <title>{post.title} | Kaiky Brito Blog</title>
        <meta name="description" content={String(post.content || '').substring(0, 160).replace(/[#*`_~\[\]()]/g, '')} />
      </Helmet>

      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-400 rounded-full blur-[120px]"></div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
          <Button asChild variant="ghost" className="text-gray-400 hover:text-cyan-400 p-0 hover:bg-transparent">
            <Link to="/blog" className="flex items-center">
              <ArrowLeft size={16} className="mr-2" /> Voltar ao Blog
            </Link>
          </Button>

          {isOwner && (
            <div className="flex gap-3">
              <Button
                onClick={() => navigate(`/blog/${post.id}/edit`)}
                variant="outline"
                size="sm"
                className="border-cyan-400/50 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900"
              >
                <Edit size={16} className="mr-2" /> Editar
              </Button>
              <Button
                onClick={handleDelete}
                variant="outline"
                size="sm"
                className="border-red-500/50 text-red-500 hover:bg-red-500 hover:text-white"
              >
                <Trash2 size={16} className="mr-2" /> Deletar
              </Button>
            </div>
          )}
        </div>

        <NeonBox color="cyan" className="p-8 md:p-12 bg-gray-900/80 backdrop-blur-lg border-opacity-30">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-6 text-sm text-cyan-400 mb-10 pb-6 border-b border-gray-800">
            <span className="flex items-center gap-2">
              <User size={16} /> {post.author || 'Kaiky Brito'}
            </span>
            <span className="flex items-center gap-2">
              <Calendar size={16} /> Publicado em: {new Date(post.created_at).toLocaleDateString('pt-BR')}
            </span>
            {post.updated_at && post.updated_at !== post.created_at && (
              <span className="flex items-center gap-2 text-gray-500">
                <Clock size={16} /> Atualizado: {new Date(post.updated_at).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          {postTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {postTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full bg-gray-800 text-cyan-300 border border-cyan-400/20"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          <div className="mb-16">
            <ReactMarkdown components={markdownComponents}>
              {post.content}
            </ReactMarkdown>
          </div>

          {/* Comments Section */}
          <BlogComments postId={post.id} />
        </NeonBox>
      </div>
    </div>
  );
};

export default BlogPostDetailPage;
