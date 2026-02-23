import React, { useCallback, useEffect, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { getOrCreateVoterKey } from "@/lib/reactions";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

const REACTIONS_TABLE = "content_reactions";

const isMissingReactionsTableError = (error) => {
  const details = `${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return (
    details.includes("content_reactions") &&
    (details.includes("does not exist") ||
      details.includes("relation") ||
      details.includes("schema cache"))
  );
};

const ReactionButtons = ({ contentType, contentId, className }) => {
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userVote, setUserVote] = useState(0);
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const { toast } = useToast();

  const normalizedContentId = String(contentId || "");

  const loadReactions = useCallback(async () => {
    if (!isSupabaseConfigured || !contentType || !normalizedContentId || disabled) {
      return;
    }

    try {
      const voterKey = getOrCreateVoterKey();

      const [likesResult, dislikesResult, userVoteResult] = await Promise.all([
        supabase
          .from(REACTIONS_TABLE)
          .select("id", { count: "exact", head: true })
          .eq("content_type", contentType)
          .eq("content_id", normalizedContentId)
          .eq("vote", 1),
        supabase
          .from(REACTIONS_TABLE)
          .select("id", { count: "exact", head: true })
          .eq("content_type", contentType)
          .eq("content_id", normalizedContentId)
          .eq("vote", -1),
        supabase
          .from(REACTIONS_TABLE)
          .select("vote")
          .eq("content_type", contentType)
          .eq("content_id", normalizedContentId)
          .eq("voter_key", voterKey)
          .maybeSingle(),
      ]);

      const firstError = likesResult.error || dislikesResult.error || userVoteResult.error;
      if (firstError) throw firstError;

      setLikes(Number(likesResult.count || 0));
      setDislikes(Number(dislikesResult.count || 0));
      setUserVote(Number(userVoteResult.data?.vote || 0));
    } catch (error) {
      if (isMissingReactionsTableError(error)) {
        setDisabled(true);
        return;
      }
      console.error("Error loading reactions:", error);
    }
  }, [contentType, normalizedContentId, disabled]);

  useEffect(() => {
    loadReactions();
  }, [loadReactions]);

  const handleVote = async (nextVote) => {
    if (!isSupabaseConfigured) {
      toast({
        title: "Supabase não configurado",
        description: "Configure o Supabase para habilitar likes/dislikes.",
        variant: "destructive",
      });
      return;
    }

    if (disabled) {
      toast({
        title: "Tabela de reações ausente",
        description: "Crie a tabela content_reactions no Supabase para habilitar votos.",
        variant: "destructive",
      });
      return;
    }

    if (!contentType || !normalizedContentId) {
      return;
    }

    const voteToPersist = userVote === nextVote ? 0 : nextVote;
    setLoading(true);

    try {
      const voterKey = getOrCreateVoterKey();

      if (voteToPersist === 0) {
        const { error } = await supabase
          .from(REACTIONS_TABLE)
          .delete()
          .eq("content_type", contentType)
          .eq("content_id", normalizedContentId)
          .eq("voter_key", voterKey);

        if (error) throw error;
      } else {
        const { error } = await supabase.from(REACTIONS_TABLE).upsert(
          [
            {
              content_type: contentType,
              content_id: normalizedContentId,
              voter_key: voterKey,
              vote: voteToPersist,
              updated_at: new Date().toISOString(),
            },
          ],
          { onConflict: "content_type,content_id,voter_key" }
        );

        if (error) throw error;
      }

      await loadReactions();
    } catch (error) {
      if (isMissingReactionsTableError(error)) {
        setDisabled(true);
      }
      toast({
        title: "Erro ao registrar reação",
        description: error.message || "Não foi possível registrar seu voto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleVote(1);
        }}
        disabled={loading}
        className={cn(
          "border-gray-700 bg-gray-900/70 text-gray-300 hover:bg-gray-800 hover:text-cyan-300",
          userVote === 1 && "border-cyan-400/60 text-cyan-300"
        )}
      >
        <ThumbsUp size={14} className="mr-1.5" />
        {likes}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          handleVote(-1);
        }}
        disabled={loading}
        className={cn(
          "border-gray-700 bg-gray-900/70 text-gray-300 hover:bg-gray-800 hover:text-pink-400",
          userVote === -1 && "border-pink-500/60 text-pink-400"
        )}
      >
        <ThumbsDown size={14} className="mr-1.5" />
        {dislikes}
      </Button>
    </div>
  );
};

export default ReactionButtons;
