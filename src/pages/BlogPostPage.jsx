import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { useVisitors } from '@/hooks/useVisitors';
import { useAuth } from '@/contexts/AuthContext';
import { NeonText, NeonBox } from '@/components/NeonGlow';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, Clock, Edit, Plus } from 'lucide-react';
import { Helmet } from 'react-helmet';
import BlogComments from '@/components/BlogComments';

const BlogPostPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { getBlogPostBySlug, loading } = useBlogPosts();
  const { isOwner } = useAuth();

  const [post, setPost] = useState(null);
  const [error, setError] = useState(null);

  useVisitors(`blog_${slug}`);

  useEffect(() => {
    const fetchPost = async () => {
      const data = await getBlogPostBySlug(slug);
      if (data) {
        setPost(data);
      } else {
        setError('Post não encontrado.');
      }
    };
    if (slug) fetchPost();
  }, [slug, getBlogPostBySlug]);

  if (loading) {
    return (
      <div className="min-h-screen pt-32 pb-20 bg-gray-950 flex justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400"></div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen pt-32 pb-20 bg-gray-950 flex flex-col items-center justify-center text-center px-4">
        <NeonText color="magenta" intensity="high" className="text-4xl font-bold mb-4">404 - {error || 'Post não encontrado'}</NeonText>
        <Button asChild variant="outline" className="border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900 mt-6">
          <Link to="/#blog"><ArrowLeft size={16} className="mr-2" /> Voltar ao Blog</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-gray-950 relative">
      <Helmet>
        <title>{post.title} | Kaiky Brito Blog</title>
        <meta name="description" content={post.excerpt || post.title} />
      </Helmet>

      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-400 rounded-full blur-[120px]"></div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <div className="flex justify-between items-center mb-8">
          <Button asChild variant="ghost" className="text-gray-400 hover:text-cyan-400 p-0 hover:bg-transparent">
            <Link to="/#blog" className="flex items-center">
              <ArrowLeft size={16} className="mr-2" /> Voltar ao Blog
            </Link>
          </Button>

          {isOwner && (
            <div className="flex gap-3">
              <Button
                onClick={() => navigate('/admin/blog/new')}
                variant="outline"
                size="sm"
                className="border-cyan-400/50 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900"
              >
                <Plus size={16} className="mr-2" /> Novo Post
              </Button>
              <Button
                onClick={() => navigate(`/admin/blog/${post.id}/edit`)}
                variant="outline"
                size="sm"
                className="border-pink-500/50 text-pink-500 hover:bg-pink-500 hover:text-white"
              >
                <Edit size={16} className="mr-2" /> Editar
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
              <User size={16} /> {post.author}
            </span>
            <span className="flex items-center gap-2">
              <Calendar size={16} /> Publicado em: {new Date(post.created_at).toLocaleDateString('pt-BR')}
            </span>
            {post.updated_at !== post.created_at && (
              <span className="flex items-center gap-2 text-gray-500">
                <Clock size={16} /> Atualizado: {new Date(post.updated_at).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>

          <div className="prose prose-invert prose-cyan max-w-none prose-p:leading-relaxed prose-a:text-pink-500 hover:prose-a:text-pink-400">
            {post.content.split('\n').map((paragraph, idx) => (
              <p key={idx} className="mb-4 text-gray-300 text-lg">{paragraph}</p>
            ))}
          </div>

          {/* Comments Section */}
          <BlogComments postId={post.id} />
        </NeonBox>
      </div>
    </div>
  );
};

export default BlogPostPage;
