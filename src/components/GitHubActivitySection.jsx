import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Clock3, GitFork, Star } from "lucide-react";
import { NeonBox, NeonText } from "@/components/NeonGlow";

const GITHUB_USERNAME = "kaikybrofc";

const formatRelativeDate = (dateValue) => {
  const date = new Date(dateValue);
  const now = new Date();
  const diffInMs = date.getTime() - now.getTime();
  const diffInDays = Math.round(diffInMs / (1000 * 60 * 60 * 24));

  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  if (Math.abs(diffInDays) < 1) {
    const diffInHours = Math.round(diffInMs / (1000 * 60 * 60));
    if (Math.abs(diffInHours) < 1) {
      const diffInMinutes = Math.round(diffInMs / (1000 * 60));
      return rtf.format(diffInMinutes, "minute");
    }
    return rtf.format(diffInHours, "hour");
  }

  return rtf.format(diffInDays, "day");
};

const GitHubActivitySection = () => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=18`
        );
        if (!response.ok) throw new Error("Falha ao consultar o GitHub.");
        const data = await response.json();

        const activityRepos = data
          .filter((repo) => !repo.fork)
          .sort(
            (a, b) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()
          )
          .slice(0, 6);

        setRepos(activityRepos);
      } catch (err) {
        setError(err.message || "Não foi possível carregar atividade.");
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, []);

  const summary = useMemo(() => {
    const stars = repos.reduce((acc, repo) => acc + Number(repo.stargazers_count || 0), 0);
    const forks = repos.reduce((acc, repo) => acc + Number(repo.forks_count || 0), 0);
    return { stars, forks };
  }, [repos]);

  return (
    <section id="github-activity" className="py-20 bg-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-24 right-20 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-24 left-20 w-96 h-96 bg-pink-500 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4">
            <NeonText color="accent" intensity="high">GitHub Activity</NeonText>
          </h2>
          <div
            className="h-1 w-32 mx-auto rounded-full bg-gradient-to-r from-cyan-400 to-pink-500"
            style={{ boxShadow: "0 0 14px #00ffff" }}
          ></div>
          <p className="text-gray-400 mt-6 text-lg max-w-2xl mx-auto">
            Repositórios atualizados recentemente e sinais de atividade contínua no código.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
          <NeonBox color="cyan" className="p-4 text-center bg-gray-800/50">
            <p className="text-2xl font-bold text-cyan-300">{repos.length}</p>
            <p className="text-xs text-gray-400 mt-1">Repos recentes</p>
          </NeonBox>
          <NeonBox color="magenta" className="p-4 text-center bg-gray-800/50">
            <p className="text-2xl font-bold text-pink-400">{summary.stars}</p>
            <p className="text-xs text-gray-400 mt-1">Stars no recorte</p>
          </NeonBox>
          <NeonBox color="accent" className="p-4 text-center bg-gray-800/50">
            <p className="text-2xl font-bold text-cyan-300">{summary.forks}</p>
            <p className="text-xs text-gray-400 mt-1">Forks no recorte</p>
          </NeonBox>
          <NeonBox color="cyan" className="p-4 text-center bg-gray-800/50">
            <p className="text-2xl font-bold text-cyan-300">@{GITHUB_USERNAME}</p>
            <p className="text-xs text-gray-400 mt-1">Perfil monitorado</p>
          </NeonBox>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">Carregando atividade...</div>
        ) : error ? (
          <div className="text-center py-10 text-red-400">{error}</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {repos.map((repo) => (
              <NeonBox key={repo.id} color="cyan" className="p-6 bg-gray-800/50 backdrop-blur-lg">
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block hover:opacity-90 transition-opacity"
                >
                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{repo.name}</h3>
                  <p className="text-sm text-gray-300 mb-4 line-clamp-2">
                    {repo.description || "Repositório sem descrição pública."}
                  </p>
                </a>

                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={13} />
                    {formatRelativeDate(repo.pushed_at)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Star size={13} className="text-yellow-400" />
                    {repo.stargazers_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <GitFork size={13} />
                    {repo.forks_count}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Activity size={13} className="text-cyan-300" />
                    {repo.language || "N/A"}
                  </span>
                </div>
              </NeonBox>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default GitHubActivitySection;
