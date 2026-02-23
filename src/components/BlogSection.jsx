import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { NeonBox, NeonText } from '@/components/NeonGlow';
import { useBlogPosts } from '@/hooks/useBlogPosts';
import { motion } from 'framer-motion';
import { Calendar, User, ArrowRight } from 'lucide-react';

const BlogSection = () => {
  const { getBlogPosts, loading } = useBlogPosts();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPosts = async () => {
      const data = await getBlogPosts();
      setPosts(data || []);
    };
    fetchPosts();
  }, [getBlogPosts]);

  return (
    <section id="blog" className="py-20 bg-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/2 left-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4">
            <NeonText color="accent" intensity="high">
              Blog
            </NeonText>
          </h2>
          <div
            className="h-1 w-32 mx-auto rounded-full bg-gradient-to-r from-cyan-400 to-cyan-300"
            style={{ boxShadow: "0 0 10px #00ffff" }}
          ></div>
          <p className="text-gray-400 mt-6 text-lg max-w-2xl mx-auto">
            Artigos, tutoriais e novidades sobre desenvolvimento web.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[1, 2, 3].map((i) => (
              <NeonBox key={i} color="cyan" className="p-6 h-64 bg-gray-800/50 animate-pulse flex flex-col justify-between">
                <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                <div className="h-4 bg-gray-700 rounded w-1/3 mt-auto"></div>
              </NeonBox>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            Nenhum post encontrado.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {posts.map((post) => (
              <motion.div key={post.id} whileHover={{ y: -5 }}>
                <NeonBox color="cyan" className="p-6 bg-gray-800/50 backdrop-blur-lg h-full flex flex-col">
                  <h3 className="text-xl font-bold text-white mb-3 line-clamp-2">
                    {post.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-cyan-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="flex items-center gap-1">
                      <User size={14} />
                      {post.author}
                    </span>
                  </div>

                  <p className="text-gray-300 mb-6 text-sm flex-grow line-clamp-3">
                    {post.excerpt || post.content.substring(0, 150) + '...'}
                  </p>

                  <Link
                    to={`/blog/${post.slug}`}
                    className="inline-flex items-center gap-2 text-cyan-400 hover:text-pink-500 transition-colors font-medium text-sm mt-auto"
                  >
                    Leia mais <ArrowRight size={16} />
                  </Link>
                </NeonBox>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BlogSection;
