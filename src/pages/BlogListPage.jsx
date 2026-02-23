import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { NeonBox, NeonText } from '@/components/NeonGlow';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, User, Plus, AlertCircle, RefreshCw, ArrowRight, Search, Tag } from 'lucide-react';
import { Helmet } from 'react-helmet';
import { getPostTags } from '@/lib/blogTags';
import ReactionButtons from '@/components/ReactionButtons';
import { CONTENT_REACTION_TYPES } from '@/lib/reactions';

const BlogListPage = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
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

  const allTags = useMemo(() => {
    const tagsSet = new Set();
    posts.forEach((post) => {
      getPostTags(post).forEach((tag) => tagsSet.add(tag));
    });
    return Array.from(tagsSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [posts]);

  const visibleTags = useMemo(() => {
    const query = tagSearchTerm.trim().toLowerCase();
    if (!query) return allTags;
    return allTags.filter((tag) => tag.includes(query));
  }, [allTags, tagSearchTerm]);

  const filteredPosts = useMemo(() => {
    const textQuery = searchTerm.trim().toLowerCase();
    const tagQuery = tagSearchTerm.trim().toLowerCase();

    return posts.filter((post) => {
      const tags = getPostTags(post);

      const matchesSelectedTag = selectedTag === 'all' || tags.includes(selectedTag);
      if (!matchesSelectedTag) return false;

      const searchableFields = [post.title, post.excerpt, post.content, post.author, tags.join(' ')];
      const matchesText = !textQuery || searchableFields.some((field) => String(field || '').toLowerCase().includes(textQuery));

      const matchesTagSearch = !tagQuery || tags.some((tag) => tag.includes(tagQuery));

      return matchesText && matchesTagSearch;
    });
  }, [posts, searchTerm, selectedTag, tagSearchTerm]);

  return (
    <div className="min-h-screen pt-32 pb-20 bg-gray-950 relative">
      <Helmet>
        <title>Blog Node.js e Backend | Kaiky Brito</title>
        <meta
          name="description"
          content="Artigos sobre Node.js, backend, automação WhatsApp com Baileys API e engenharia de software."
        />
        <meta
          name="keywords"
          content="blog node.js brasil, backend engineer brazil, baileys whatsapp api, automação whatsapp, artigos nodejs"
        />
        <link rel="canonical" href="https://omnizap.shop/blog" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="pt_BR" />
        <meta property="og:url" content="https://omnizap.shop/blog" />
        <meta property="og:site_name" content="Kaiky Brito" />
        <meta property="og:title" content="Blog Node.js e Backend | Kaiky Brito" />
        <meta
          property="og:description"
          content="Conteúdos sobre backend, Node.js e automação WhatsApp para projetos reais."
        />
        <meta property="og:image" content="https://omnizap.shop/preview.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Blog Node.js e Backend | Kaiky Brito" />
        <meta
          name="twitter:description"
          content="Conteúdos sobre backend, Node.js e automação WhatsApp para projetos reais."
        />
        <meta name="twitter:image" content="https://omnizap.shop/preview.png" />
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

        <NeonBox color="cyan" className="p-5 md:p-6 bg-gray-900/70 backdrop-blur-sm border border-gray-800 mb-10">
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">Buscar no blog</span>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Título, conteúdo ou autor"
                  className="w-full bg-gray-950 border border-gray-700 rounded-md py-2 pl-10 pr-3 text-sm text-gray-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs uppercase tracking-wide text-gray-500 mb-2 block">Buscar por tags</span>
              <div className="relative">
                <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={tagSearchTerm}
                  onChange={(e) => setTagSearchTerm(e.target.value.toLowerCase())}
                  placeholder="ex: react, supabase"
                  className="w-full bg-gray-950 border border-gray-700 rounded-md py-2 pl-10 pr-3 text-sm text-gray-200 focus:outline-none focus:border-cyan-400"
                />
              </div>
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedTag('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedTag === 'all'
                  ? 'bg-cyan-400 text-gray-900'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Todas
            </button>
            {visibleTags.map((tag) => (
              <button
                type="button"
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  selectedTag === tag
                    ? 'bg-pink-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </NeonBox>

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
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-20 bg-gray-900/50 rounded-xl border border-gray-800">
            <h3 className="text-xl text-white mb-2">Nenhum post para este filtro</h3>
            <p className="text-gray-400">Tente ajustar a busca por texto ou tags.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredPosts.map((post) => {
              const tags = getPostTags(post);

              return (
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
                      {String(post.content || '').substring(0, 150).replace(/[#*`_~\[\]()]/g, '')}...
                    </p>

                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-5">
                        {tags.slice(0, 4).map((tag) => (
                          <span
                            key={tag}
                            className="text-[11px] px-2 py-1 rounded-full bg-gray-800 text-cyan-300 border border-cyan-400/20"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <ReactionButtons
                      contentType={CONTENT_REACTION_TYPES.BLOG_POST}
                      contentId={post.id}
                      className="mb-4"
                    />

                    <div className="flex items-center text-cyan-400 text-sm font-semibold group-hover:text-pink-500 transition-colors mt-auto">
                      Ler artigo <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </NeonBox>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogListPage;
