import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { NeonBox, NeonText } from '@/components/NeonGlow';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Save, ArrowLeft } from 'lucide-react';

const BlogPostForm = () => {
  const { id } = useParams(); // If id is present, we're editing
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    author: currentUser?.user_metadata?.full_name || 'Kaiky Brito'
  });

  useEffect(() => {
    if (isEditing) {
      const fetchPost = async () => {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          toast({ variant: "destructive", title: "Erro", description: "Post não encontrado." });
          navigate('/#blog');
        } else if (data) {
          setFormData({
            title: data.title || '',
            slug: data.slug || '',
            excerpt: data.excerpt || '',
            content: data.content || '',
            author: data.author || ''
          });
        }
        setInitialLoading(false);
      };
      fetchPost();
    }
  }, [id, navigate, toast, isEditing]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'title' && !isEditing ? {
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      } : {})
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.title || !formData.slug || !formData.content) {
        throw new Error('Título, slug e conteúdo são obrigatórios.');
      }

      const payload = {
        ...formData,
        updated_at: new Date().toISOString()
      };

      let error;
      if (isEditing) {
        const { error: updateError } = await supabase
          .from('blog_posts')
          .update(payload)
          .eq('id', id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('blog_posts')
          .insert([payload]);
        error = insertError;
      }

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: `Post ${isEditing ? 'atualizado' : 'criado'} com sucesso.`,
      });
      navigate(`/blog/${formData.slug}`);

    } catch (err) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen pt-32 flex justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-32 pb-20 bg-gray-950 px-4">
      <div className="max-w-4xl mx-auto">
        <Button onClick={() => navigate(-1)} variant="ghost" className="text-gray-400 hover:text-cyan-400 mb-8 p-0 hover:bg-transparent">
          <ArrowLeft size={16} className="mr-2" /> Voltar
        </Button>

        <NeonBox color="cyan" className="p-8 bg-gray-900/80 backdrop-blur-lg">
          <h1 className="text-3xl font-bold text-white mb-8">
            <NeonText color="cyan">{isEditing ? 'Editar Post' : 'Novo Post'}</NeonText>
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-gray-300 mb-2 font-medium">Título *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-cyan-400/30 rounded-lg text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-300 mb-2 font-medium">Slug *</label>
                <input
                  type="text"
                  name="slug"
                  value={formData.slug}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-gray-800 border border-cyan-400/30 rounded-lg text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-300 mb-2 font-medium">Resumo</label>
              <textarea
                name="excerpt"
                value={formData.excerpt}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-3 bg-gray-800 border border-cyan-400/30 rounded-lg text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none transition-all resize-y"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2 font-medium">Conteúdo *</label>
              <textarea
                name="content"
                value={formData.content}
                onChange={handleChange}
                rows={15}
                className="w-full px-4 py-3 bg-gray-800 border border-cyan-400/30 rounded-lg text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none transition-all resize-y font-mono text-sm"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-cyan-400 to-pink-500 text-white font-semibold py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
              style={{ boxShadow: "0 0 10px rgba(0, 255, 136, 0.4)" }}
            >
              {loading ? "Salvando..." : (
                <span className="flex items-center justify-center gap-2">
                  <Save size={18} />
                  {isEditing ? 'Atualizar Post' : 'Publicar Post'}
                </span>
              )}
            </Button>
          </form>
        </NeonBox>
      </div>
    </div>
  );
};

export default BlogPostForm;
