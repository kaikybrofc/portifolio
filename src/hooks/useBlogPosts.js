import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export function useBlogPosts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getBlogPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (sbError) throw sbError;
      return data;
    } catch (err) {
      console.error('Error fetching blog posts:', err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getBlogPostBySlug = useCallback(async (slug) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('slug', slug)
        .single();

      if (sbError) throw sbError;
      return data;
    } catch (err) {
      console.error('Error fetching blog post by slug:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const addBlogPost = async (post) => {
    setLoading(true);
    setError(null);
    try {
      if (!post.title || !post.slug || !post.content) {
        throw new Error('Title, slug and content are required.');
      }

      const excerpt = post.excerpt || post.content.substring(0, 150) + '...';

      const { data, error: sbError } = await supabase
        .from('blog_posts')
        .insert([{ ...post, excerpt }])
        .select();

      if (sbError) throw sbError;
      return { success: true, data };
    } catch (err) {
      console.error('Error adding blog post:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const updateBlogPost = async (slug, updates) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('blog_posts')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('slug', slug)
        .select();

      if (sbError) throw sbError;
      return { success: true, data };
    } catch (err) {
      console.error('Error updating blog post:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return { getBlogPosts, getBlogPostBySlug, addBlogPost, updateBlogPost, loading, error };
}
