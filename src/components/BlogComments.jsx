import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Trash2, MessageSquare, Send } from 'lucide-react';
import LoginButton from '@/components/LoginButton';

const BlogComments = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const { currentUser, isOwner } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (!postId) return;

    const fetchComments = async () => {
      try {
        const { data, error } = await supabase
          .from('comments')
          .select('*')
          .eq('blog_post_id', postId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setComments(data || []);
      } catch (err) {
        console.error('Error fetching comments:', err);
      } finally {
        setFetching(false);
      }
    };

    fetchComments();
  }, [postId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    setLoading(true);
    try {
      const payload = {
        blog_post_id: postId,
        user_id: currentUser.id,
        github_username: currentUser.user_metadata?.user_name || 'Usuário',
        github_avatar_url: currentUser.user_metadata?.avatar_url || '',
        content: newComment.trim()
      };

      const { data, error } = await supabase
        .from('comments')
        .insert([payload])
        .select();

      if (error) throw error;

      setComments([data[0], ...comments]);
      setNewComment('');
      toast({ title: 'Comentário enviado!' });
    } catch (err) {
      toast({ title: 'Erro ao enviar comentário', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (commentId) => {
    if (!window.confirm('Tem certeza que deseja excluir este comentário?')) return;

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;

      setComments(comments.filter(c => c.id !== commentId));
      toast({ title: 'Comentário excluído.' });
    } catch (err) {
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    }
  };

  if (!postId) return null;

  return (
    <div className="mt-16 pt-10 border-t border-gray-800">
      <h3 className="text-2xl font-bold text-white mb-8 flex items-center gap-2">
        <MessageSquare className="text-cyan-400" />
        Comentários ({comments.length})
      </h3>

      {/* Comment Form */}
      <div className="mb-10 bg-gray-900/50 p-6 rounded-lg border border-gray-800">
        {!currentUser ? (
          <div className="text-center py-6">
            <p className="text-gray-400 mb-4">Faça login com o GitHub para deixar um comentário.</p>
            <LoginButton />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex gap-4">
            <Avatar className="h-10 w-10 border border-cyan-400/50 hidden sm:block">
              <AvatarImage src={currentUser.user_metadata?.avatar_url} />
              <AvatarFallback>{currentUser.user_metadata?.user_name?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="O que você achou deste post?"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-y mb-3 min-h-[80px]"
                required
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={loading || !newComment.trim()}
                  className="bg-cyan-500 text-gray-950 hover:bg-cyan-400"
                >
                  {loading ? 'Enviando...' : <><Send size={16} className="mr-2" /> Comentar</>}
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* Comments List */}
      <div className="space-y-6">
        {fetching ? (
          <div className="text-center text-gray-500 py-8">Carregando comentários...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-gray-500 py-8 italic">
            Nenhum comentário ainda. Seja o primeiro a comentar!
          </div>
        ) : (
          comments.map(comment => {
            const canDelete = isOwner || (currentUser && currentUser.id === comment.user_id);
            return (
              <div key={comment.id} className="flex gap-4 group">
                <Avatar className="h-10 w-10 border border-gray-700">
                  <AvatarImage src={comment.github_avatar_url} />
                  <AvatarFallback>{comment.github_username?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="flex-grow bg-gray-900/40 p-4 rounded-lg border border-gray-800/60">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="font-semibold text-gray-200">@{comment.github_username}</span>
                      <span className="text-xs text-gray-500 ml-3">
                        {new Date(comment.created_at).toLocaleDateString('pt-BR', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-gray-600 hover:text-pink-500 transition-colors opacity-0 group-hover:opacity-100"
                        title="Excluir comentário"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <p className="text-gray-300 whitespace-pre-wrap text-sm leading-relaxed">
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default BlogComments;
