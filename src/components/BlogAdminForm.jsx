import React, { useState } from 'react';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { Button } from '@/components/ui/button';
import { NeonBox, NeonText } from '@/components/NeonGlow';
import { useToast } from '@/components/ui/use-toast';
import { Save } from 'lucide-react';

const BlogAdminForm = ({ initialData = null, onSuccess }) => {
  const isEditing = !!initialData;
  const [formData, setFormData] = useState(initialData || {
    title: '',
    slug: '',
    author: 'Kaiky Brito',
    content: '',
    excerpt: ''
  });

  const { addBlogPost, updateBlogPost, loading } = useBlogPosts();
  const { toast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Auto-generate slug from title if not editing
      ...(name === 'title' && !isEditing ? {
        slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
      } : {})
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.slug || !formData.content) {
      toast({
        title: "Erro de Validação",
        description: "Título, slug e conteúdo são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    const result = isEditing
      ? await updateBlogPost(initialData.slug, formData)
      : await addBlogPost(formData);

    if (result.success) {
      toast({
        title: "Sucesso!",
        description: `Post ${isEditing ? 'atualizado' : 'criado'} com sucesso.`,
      });
      if (!isEditing) {
        setFormData({ title: '', slug: '', author: 'Kaiky Brito', content: '', excerpt: '' });
      }
      if (onSuccess) onSuccess();
    } else {
      toast({
        title: "Erro",
        description: result.error || "Ocorreu um erro ao salvar o post.",
        variant: "destructive"
      });
    }
  };

  return (
    <NeonBox color="accent" className="p-8 bg-gray-800/80 backdrop-blur-lg">
      <h3 className="text-2xl font-bold text-white mb-6">
        <NeonText color="accent">{isEditing ? 'Editar Post' : 'Novo Post'}</NeonText>
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300 mb-2 font-medium">Título</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-900 border border-cyan-300/30 rounded-lg text-white placeholder-gray-500 focus:border-cyan-300 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2 font-medium">Slug</label>
            <input
              type="text"
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-900 border border-cyan-300/30 rounded-lg text-white placeholder-gray-500 focus:border-cyan-300 focus:outline-none"
              required
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300 mb-2 font-medium">Autor</label>
            <input
              type="text"
              name="author"
              value={formData.author}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-900 border border-cyan-300/30 rounded-lg text-white placeholder-gray-500 focus:border-cyan-300 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-gray-300 mb-2 font-medium">Resumo (Opcional)</label>
            <input
              type="text"
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              className="w-full px-4 py-3 bg-gray-900 border border-cyan-300/30 rounded-lg text-white placeholder-gray-500 focus:border-cyan-300 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-300 mb-2 font-medium">Conteúdo</label>
          <textarea
            name="content"
            value={formData.content}
            onChange={handleChange}
            rows={8}
            className="w-full px-4 py-3 bg-gray-900 border border-cyan-300/30 rounded-lg text-white placeholder-gray-500 focus:border-cyan-300 focus:outline-none resize-y"
            required
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-400 to-cyan-600 text-gray-900 font-semibold py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
        >
          {loading ? "Salvando..." : (
            <span className="flex items-center justify-center gap-2">
              <Save size={18} />
              {isEditing ? 'Atualizar Post' : 'Criar Post'}
            </span>
          )}
        </Button>
      </form>
    </NeonBox>
  );
};

export default BlogAdminForm;
