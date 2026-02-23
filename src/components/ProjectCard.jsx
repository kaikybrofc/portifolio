import React from "react";
import { NeonBox } from "@/components/NeonGlow";
import { Button } from "@/components/ui/button";
import { Github, ExternalLink, Star, GitFork } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ReactionButtons from "@/components/ReactionButtons";
import { CONTENT_REACTION_TYPES } from "@/lib/reactions";

const ProjectCard = ({ project }) => {
  const {
    name,
    description,
    html_url,
    homepage,
    language,
    stargazers_count,
    forks_count,
    topics = [],
  } = project;
  const isOmnizapSystemProject =
    typeof name === "string" && name.toLowerCase() === "omnizap-system";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -5 }}
    >
      <NeonBox
        color="cyan"
        className="p-6 bg-gray-800/50 backdrop-blur-lg h-full flex flex-col"
      >
        {/* Project Header */}
        <div className="mb-4">
          <h3 className="text-2xl font-bold text-white mb-2 hover:text-cyan-400 transition-colors">
            {name}
          </h3>

          <p className="text-gray-300 leading-relaxed min-h-[60px]">
            {description || "No description available"}
          </p>
        </div>

        {/* Technologies/Topics */}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {topics.slice(0, 5).map((topic, index) => (
              <span
                key={index}
                className="px-3 py-1 text-xs font-medium bg-cyan-400/10 text-cyan-400 border border-cyan-400/30 rounded-full"
                style={{ textShadow: "0 0 10px #00ff88" }}
              >
                {topic}
              </span>
            ))}
          </div>
        )}

        {/* Language and Stats */}
        <div className="flex items-center gap-4 mb-4 text-sm text-gray-400">
          {language && (
            <div className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: getLanguageColor(language),
                  boxShadow: `0 0 10px ${getLanguageColor(language)}`,
                }}
              ></span>
              <span>{language}</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <Star size={14} className="text-yellow-400" />
            <span>{stargazers_count}</span>
          </div>

          <div className="flex items-center gap-1">
            <GitFork size={14} className="text-gray-400" />
            <span>{forks_count}</span>
          </div>
        </div>

        <ReactionButtons
          contentType={CONTENT_REACTION_TYPES.PROJECT}
          contentId={project?.id}
          className="mb-4"
        />

        {/* Action Buttons */}
        <div className="flex gap-3 mt-auto">
          <Button
            asChild
            variant="outline"
            className="flex-1 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900 transition-all"
            style={{ boxShadow: "0 0 10px #00ff88" }}
          >
            <a
              href={html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2"
            >
              <Github size={18} />
              <span>GitHub</span>
            </a>
          </Button>

          {homepage && (
            <Button
              asChild
              variant="outline"
              className="flex-1 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-all"
              style={{ boxShadow: "0 0 10px #ff00ff" }}
            >
              <a
                href={homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2"
              >
                <ExternalLink size={18} />
                <span>Demo</span>
              </a>
            </Button>
          )}

          {isOmnizapSystemProject && (
            <Button
              asChild
              variant="outline"
              className="flex-1 border-cyan-300 text-cyan-300 hover:bg-cyan-300 hover:text-gray-900 transition-all"
              style={{ boxShadow: "0 0 10px #00ffff" }}
            >
              <Link to="/projetos/omnizap-system" className="flex items-center justify-center gap-2">
                <span>Detalhes</span>
              </Link>
            </Button>
          )}
        </div>
      </NeonBox>
    </motion.div>
  );
};

// Helper function to get language colors
const getLanguageColor = (language) => {
  const colors = {
    JavaScript: "#f1e05a",
    TypeScript: "#3178c6",
    Python: "#3572A5",
    Java: "#b07219",
    HTML: "#e34c26",
    CSS: "#563d7c",
    React: "#61dafb",
    "C++": "#f34b7d",
    C: "#555555",
    Go: "#00ADD8",
    Rust: "#dea584",
    PHP: "#4F5D95",
    Ruby: "#701516",
    Swift: "#ffac45",
  };

  return colors[language] || "#8b949e";
};

export default ProjectCard;
