import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Save, X, Eye, Code } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useMarkdownStyles } from '@/hooks/useMarkdownStyles.jsx';
import { Helmet } from 'react-helmet';
import { parseTags, stringifyTags } from '@/lib/blogTags';

const isTagsColumnMissingError = (error) => {
  const details = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
  return (
    error?.code === 'PGRST204' ||
    (details.includes('tags') &&
      (details.includes('column') ||
        details.includes('schema cache') ||
        details.includes('does not exist')))
  );
};

const BlogPostEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const { markdownComponents } = useMarkdownStyles();

  const isEditing = !!id;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);

  // Mobile preview toggle
  const [viewMode, setViewMode] = useState('split'); // 'split', 'edit', 'preview'

  useEffect(() => {
    // Handle mobile view change
    const handleResize = () => {
      if (window.innerWidth < 1024 && viewMode === 'split') {
        setViewMode('edit');
      } else if (window.innerWidth >= 1024 && viewMode !== 'split') {
        setViewMode('split');
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  useEffect(() => {
    if (isEditing) {
      const fetchPost = async () => {
        try {
          const { data, error } = await supabase
            .from('blog_posts')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;

          if (data) {
            setTitle(data.title || '');
            setContent(data.content || '');
            setTagsInput(stringifyTags(data.tags));
          }
        } catch (err) {
          toast({ variant: "destructive", title: "Erro", description: "Post não encontrado." });
          navigate('/blog');
        } finally {
          setInitialLoading(false);
        }
      };
      fetchPost();
    }
  }, [id, navigate, toast, isEditing]);

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Erro de Validação",
        description: "O título e o conteúdo são obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: title.trim(),
        content: content.trim(),
        tags: parseTags(tagsInput),
        author: 'Kaiky Brito',
        updated_at: new Date().toISOString()
      };

      if (!isEditing && currentUser) {
        payload.user_id = currentUser.id;
      }

      let savedPost;

      const persistPost = async (postPayload) => {
        if (isEditing) {
          const { data, error } = await supabase
            .from('blog_posts')
            .update(postPayload)
            .eq('id', id)
            .select()
            .single();

          if (error) throw error;
          return data;
        }

        const payloadWithSlug = {
          ...postPayload,
          slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
        };

        const { data, error } = await supabase
          .from('blog_posts')
          .insert([payloadWithSlug])
          .select()
          .single();

        if (error) throw error;
        return data;
      };

      try {
        savedPost = await persistPost(payload);
      } catch (errorWithTags) {
        if (!isTagsColumnMissingError(errorWithTags)) throw errorWithTags;

        const { tags, ...payloadWithoutTags } = payload;
        savedPost = await persistPost(payloadWithoutTags);
        toast({
          title: "Post salvo sem tags",
          description: "A coluna tags ainda não existe no banco. Atualize o schema para ativar o filtro por tags.",
          variant: "destructive"
        });
      }

      toast({
        title: "Sucesso!",
        description: isEditing ? "Post atualizado com sucesso." : "Novo post criado com sucesso."
      });

      navigate(`/blog/${savedPost.id}`);
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-950 pt-20">
      <Helmet>
        <title>{isEditing ? 'Editar Post' : 'Novo Post'} | Blog Editor</title>
      </Helmet>

      <div className="bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-4 flex-1">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título do Post..."
            className="bg-transparent border-none text-xl md:text-2xl font-bold text-white focus:outline-none focus:ring-0 placeholder-gray-600 w-full"
          />
        </div>

        <div className="flex items-center gap-2 md:gap-4 ml-4 shrink-0">
          <div className="lg:hidden flex bg-gray-800 rounded-md p-1 mr-2">
            <button
              onClick={() => setViewMode('edit')}
              className={`p-1.5 rounded ${viewMode === 'edit' ? 'bg-gray-700 text-cyan-400' : 'text-gray-400'}`}
              title="Editor"
            >
              <Code size={18} />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`p-1.5 rounded ${viewMode === 'preview' ? 'bg-gray-700 text-pink-400' : 'text-gray-400'}`}
              title="Preview"
            >
              <Eye size={18} />
            </button>
          </div>

          <Button
            onClick={() => navigate('/blog')}
            variant="ghost"
            className="text-gray-400 hover:text-white"
          >
            <X size={18} className="md:mr-2" />
            <span className="hidden md:inline">Cancelar</span>
          </Button>

          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-cyan-500 text-gray-950 hover:bg-cyan-400 font-semibold shadow-[0_0_10px_rgba(0,255,136,0.3)]"
          >
            {loading ? (
              <span className="animate-spin h-4 w-4 border-2 border-gray-950 border-t-transparent rounded-full mr-2"></span>
            ) : (
              <Save size={18} className="md:mr-2" />
            )}
            <span className="hidden md:inline">{isEditing ? 'Atualizar' : 'Publicar'}</span>
          </Button>
        </div>
      </div>

      <div className="bg-gray-900/60 border-b border-gray-800 px-4 py-3">
        <div className="max-w-2xl">
          <label htmlFor="post-tags" className="block text-xs uppercase tracking-wide text-gray-500 mb-1">
            Tags
          </label>
          <input
            id="post-tags"
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="react, supabase, auth"
            className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-400"
          />
          <p className="text-xs text-gray-500 mt-1">Separe as tags por vírgula.</p>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div
          className={`flex-1 flex flex-col border-r border-gray-800 ${viewMode === 'preview' ? 'hidden' : 'flex'}`}
        >
          <div className="bg-gray-900/50 p-2 border-b border-gray-800 flex items-center gap-2 text-sm text-gray-500 font-mono">
            <Code size={14} /> Markdown Editor
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva seu conteúdo em Markdown aqui..."
            className="flex-1 bg-gray-950 text-gray-300 p-6 font-mono text-sm leading-relaxed resize-none focus:outline-none"
            spellCheck="false"
          />
        </div>

        <div
          className={`flex-1 flex flex-col bg-gray-900/30 overflow-y-auto ${viewMode === 'edit' ? 'hidden' : 'flex'}`}
        >
          <div className="bg-gray-900/50 p-2 border-b border-gray-800 flex items-center gap-2 text-sm text-gray-500 font-mono sticky top-0 z-10">
            <Eye size={14} /> Live Preview
          </div>
          <div className="p-8 max-w-3xl mx-auto w-full">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-8 leading-tight">
              {title || 'Título do Post...'}
            </h1>
            <div className="prose prose-invert max-w-none">
              <ReactMarkdown components={markdownComponents}>
                {content || '*O conteúdo do seu post aparecerá aqui...*'}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogPostEditor;
