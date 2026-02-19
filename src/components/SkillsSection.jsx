import React, { useState, useEffect } from "react";
import { NeonText, NeonBox } from "@/components/NeonGlow";
import { motion } from "framer-motion";
import {
  Code2,
  Database,
  Wrench,
  Server,
  Palette,
  GitBranch,
} from "lucide-react";

const SkillsSection = () => {
  const [languages, setLanguages] = useState([]);

  useEffect(() => {
    const fetchLanguages = async () => {
      try {
        const response = await fetch(
          "https://api.github.com/users/kaikybrofc/repos?per_page=100"
        );
        const repos = await response.json();

        // Collect unique languages from all repos
        const languageSet = new Set();
        repos.forEach((repo) => {
          if (repo.language) {
            languageSet.add(repo.language);
          }
        });

        setLanguages(Array.from(languageSet));
      } catch (error) {
        console.error("Error fetching languages:", error);
      }
    };

    fetchLanguages();
  }, []);

  const skillCategories = [
    {
      title: "Frontend",
      icon: <Palette size={32} />,
      color: "cyan",
      skills: [
        "JavaScript",
        "TypeScript",
        "React",
        "HTML",
        "CSS",
        "TailwindCSS",
        "Next.js",
        "Vue.js",
      ],
    },
    {
      title: "Backend",
      icon: <Server size={32} />,
      color: "magenta",
      skills: [
        "Node.js",
        "Python",
        "Java",
        "PHP",
        "Express",
        "Django",
        "FastAPI",
        "Spring Boot",
      ],
    },
    {
      title: "Database",
      icon: <Database size={32} />,
      color: "accent",
      skills: [
        "MongoDB",
        "PostgreSQL",
        "MySQL",
        "Redis",
        "Firebase",
        "Supabase",
      ],
    },
    {
      title: "DevOps & Tools",
      icon: <Wrench size={32} />,
      color: "cyan",
      skills: [
        "Git",
        "Docker",
        "GitHub Actions",
        "AWS",
        "Vercel",
        "Netlify",
        "Linux",
      ],
    },
    {
      title: "Other Languages",
      icon: <Code2 size={32} />,
      color: "magenta",
      skills: languages.filter(
        (lang) =>
          !["JavaScript", "TypeScript", "HTML", "CSS", "Python", "Java", "PHP"].includes(
            lang
          )
      ),
    },
    {
      title: "Version Control",
      icon: <GitBranch size={32} />,
      color: "accent",
      skills: ["Git", "GitHub", "GitLab", "Bitbucket"],
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5 },
    },
  };

  return (
    <section id="skills" className="py-20 bg-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-pink-500 rounded-full blur-3xl"></div>
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
            <NeonText color="cyan" intensity="high">
              Habilidades
            </NeonText>
          </h2>
          <div
            className="h-1 w-32 mx-auto rounded-full bg-gradient-to-r from-cyan-400 to-pink-500"
            style={{ boxShadow: "0 0 20px #00ff88" }}
          ></div>
          <p className="text-gray-400 mt-6 text-lg max-w-2xl mx-auto">
            Tecnologias e ferramentas que utilizo no desenvolvimento
          </p>
        </motion.div>

        {/* Skills Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {skillCategories.map((category, index) => (
            <motion.div key={index} variants={itemVariants}>
              <NeonBox
                color={category.color}
                className="p-6 bg-gray-800/50 backdrop-blur-lg h-full"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="text-cyan-400">{category.icon}</div>
                  <h3 className="text-2xl font-bold text-white">
                    {category.title}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  {category.skills.map((skill, skillIndex) => (
                    <motion.span
                      key={skillIndex}
                      whileHover={{ scale: 1.1 }}
                      className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-cyan-400/10 to-pink-500/10 text-white border border-cyan-400/30 rounded-full cursor-default transition-all duration-300"
                      style={{
                        boxShadow: "0 0 10px rgba(0, 255, 136, 0.3)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 0 20px rgba(0, 255, 136, 0.6), 0 0 40px rgba(255, 0, 255, 0.4)";
                        e.currentTarget.style.borderColor = "#ff00ff";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow =
                          "0 0 10px rgba(0, 255, 136, 0.3)";
                        e.currentTarget.style.borderColor = "rgba(0, 255, 136, 0.3)";
                      }}
                    >
                      {skill}
                    </motion.span>
                  ))}
                </div>
              </NeonBox>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default SkillsSection;