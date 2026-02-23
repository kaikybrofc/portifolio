import React, { useState, useEffect } from "react";
import { NeonText } from "@/components/NeonGlow";
import ProjectCard from "@/components/ProjectCard";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { fetchGitHubRepos } from "@/lib/githubApi";

const ProjectsSection = () => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRepositories = async () => {
      try {
        const data = await fetchGitHubRepos(
          "kaikybrofc",
          "sort=updated&per_page=100"
        );

        const nonForkRepos = data.filter((repo) => !repo.fork);

        // Sort by stars and updated date, take top 6.
        const sortedRepos = nonForkRepos
          .sort((a, b) => {
            // Primary sort by stars
            if (b.stargazers_count !== a.stargazers_count) {
              return b.stargazers_count - a.stargazers_count;
            }
            // Secondary sort by updated date
            return new Date(b.updated_at) - new Date(a.updated_at);
          });

        let filteredRepos = sortedRepos.slice(0, 6);
        const omnizapRepo = nonForkRepos.find(
          (repo) => repo.name?.toLowerCase() === "omnizap-system"
        );

        if (
          omnizapRepo &&
          !filteredRepos.some((repo) => repo.id === omnizapRepo.id)
        ) {
          filteredRepos = [...filteredRepos.slice(0, 5), omnizapRepo];
        }

        setRepos(filteredRepos);
      } catch (error) {
        console.error("Error fetching repositories:", error);
        toast({
          title: "Erro ao carregar projetos",
          description: "Não foi possível carregar os projetos do GitHub.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRepositories();
  }, [toast]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  return (
    <section id="projects" className="py-20 bg-gray-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/4 right-10 w-96 h-96 bg-pink-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 left-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-5xl md:text-6xl font-bold mb-4">
            <NeonText color="magenta" intensity="high">
              Projetos
            </NeonText>
          </h2>
          <div
            className="h-1 w-32 mx-auto rounded-full bg-gradient-to-r from-pink-500 to-cyan-400"
            style={{ boxShadow: "0 0 20px #ff00ff" }}
          ></div>
          <p className="text-gray-400 mt-6 text-lg max-w-2xl mx-auto">
            Confira alguns dos meus projetos mais recentes e populares no GitHub
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="relative">
              <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-cyan-400"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-pink-500"></div>
              </div>
            </div>
          </div>
        ) : repos.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-xl">Nenhum projeto encontrado.</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {repos.map((repo) => (
              <ProjectCard key={repo.id} project={repo} />
            ))}
          </motion.div>
        )}

        {/* View More Link */}
        {!loading && repos.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="text-center mt-12"
          >
            <a
              href="https://github.com/kaikybrofc?tab=repositories"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-cyan-400 hover:text-pink-500 transition-colors font-medium text-lg"
              style={{
                textShadow: "0 0 10px #00ff88",
              }}
            >
              Ver todos os projetos no GitHub →
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default ProjectsSection;
