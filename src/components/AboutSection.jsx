import React, { useState, useEffect } from "react";
import { NeonText, NeonBox } from "@/components/NeonGlow";
import { Github, MapPin, Link as LinkIcon } from "lucide-react";
import { motion } from "framer-motion";

const AboutSection = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGitHubData = async () => {
      try {
        const response = await fetch("/api/github/users/kaikybrofc");

        if (!response.ok) {
          throw new Error("Failed to fetch GitHub profile");
        }

        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error("Error fetching GitHub data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGitHubData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 },
    },
  };

  return (
    <section id="about" className="py-20 bg-gray-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-pink-500 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={containerVariants}
        >
          {/* Section Title */}
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold mb-4">
              <NeonText color="cyan" intensity="high">
                Sobre Mim
              </NeonText>
            </h2>
            <div 
              className="h-1 w-32 mx-auto rounded-full bg-gradient-to-r from-cyan-400 to-pink-500"
              style={{ boxShadow: "0 0 10px #00ff88" }}
            ></div>
          </motion.div>

          {loading ? (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400"></div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {/* Profile Card */}
              <motion.div variants={itemVariants}>
                <NeonBox color="cyan" className="p-8 bg-gray-800/50 backdrop-blur-lg h-full">
                  <div className="flex flex-col items-center text-center">
                    {userData?.avatar_url && (
                      <div className="relative mb-6">
                        <img
                          src={userData.avatar_url}
                          alt={userData.name || "Kaiky Brito"}
                          className="w-40 h-40 rounded-full border-4 border-cyan-400 object-cover"
                          style={{ boxShadow: "0 0 15px #00ff88, 0 0 30px #00ff88" }}
                        />
                      </div>
                    )}
                    
                    <h3 className="text-3xl font-bold text-white mb-2">
                      {userData?.name || "Kaiky Brito"}
                    </h3>
                    
                    <p className="text-cyan-400 text-lg mb-4">
                      @{userData?.login || "kaikybrofc"}
                    </p>

                    {userData?.bio && (
                      <p className="text-gray-300 mb-6 leading-relaxed">
                        {userData.bio}
                      </p>
                    )}

                    <div className="flex flex-col gap-3 w-full">
                      {userData?.location && (
                        <div className="flex items-center justify-center gap-2 text-gray-300">
                          <MapPin size={18} className="text-cyan-400" />
                          <span>{userData.location}</span>
                        </div>
                      )}
                      
                      {userData?.blog && (
                        <div className="flex items-center justify-center gap-2 text-gray-300">
                          <LinkIcon size={18} className="text-cyan-400" />
                          <a 
                            href={userData.blog.startsWith('http') ? userData.blog : `https://${userData.blog}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-cyan-400 transition-colors"
                          >
                            {userData.blog}
                          </a>
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-2 text-gray-300">
                        <Github size={18} className="text-cyan-400" />
                        <a 
                          href={userData?.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-cyan-400 transition-colors"
                        >
                          GitHub Profile
                        </a>
                      </div>
                    </div>
                  </div>
                </NeonBox>
              </motion.div>

              {/* Description Card */}
              <motion.div variants={itemVariants}>
                <NeonBox color="magenta" className="p-8 bg-gray-800/50 backdrop-blur-lg h-full">
                  <h3 className="text-2xl font-bold text-white mb-6">
                    <NeonText color="magenta">Profissional</NeonText>
                  </h3>
                  
                  <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                      Eu sou o <strong>Kaiky Brito</strong>, um desenvolvedor Full Stack apaixonado por criar soluções web inovadoras 
                      e eficientes. Com experiência em tecnologias modernas, busco sempre 
                      entregar projetos de alta qualidade que superem as expectativas.
                    </p>
                    
                    <p>
                      Especializado em desenvolvimento frontend e backend, trabalho com as 
                      melhores práticas de código limpo, arquitetura escalável e design 
                      responsivo para criar experiências digitais excepcionais.
                    </p>
                    
                    <p>
                      Constantemente aprendendo e me adaptando às novas tecnologias do 
                      mercado, colaboro em projetos desafiadores que impulsionam a inovação 
                      e transformação digital.
                    </p>

                    <div className="mt-8 grid grid-cols-3 gap-4 text-center">
                      <div className="p-4 bg-gray-700/50 rounded-lg border border-cyan-400/30">
                        <p className="text-3xl font-bold text-cyan-400">
                          {userData?.public_repos || 0}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">Repositórios</p>
                      </div>
                      
                      <div className="p-4 bg-gray-700/50 rounded-lg border border-pink-500/30">
                        <p className="text-3xl font-bold text-pink-500">
                          {userData?.followers || 0}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">Seguidores</p>
                      </div>
                      
                      <div className="p-4 bg-gray-700/50 rounded-lg border border-cyan-300/30">
                        <p className="text-3xl font-bold text-cyan-300">
                          {userData?.following || 0}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">Seguindo</p>
                      </div>
                    </div>
                  </div>
                </NeonBox>
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;
