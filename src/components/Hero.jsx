import React from "react";
import { NeonText } from "@/components/NeonGlow";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const Hero = () => {
  const handleCTAClick = () => {
    const projectsSection = document.querySelector("#projects");
    if (projectsSection) {
      projectsSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScrollDown = () => {
    const aboutSection = document.querySelector("#about");
    if (aboutSection) {
      aboutSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1594001739310-9694bdcf1b6c')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Dark overlay with gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900/95 via-gray-900/90 to-gray-900/95"></div>

      {/* Animated grid overlay */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(#00ff88 1px, transparent 1px),
            linear-gradient(90deg, #00ff88 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      ></div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Main heading with neon glow */}
          <h1 className="text-6xl md:text-8xl lg:text-9xl font-bold mb-6">
            <NeonText color="cyan" intensity="high" animated>
              Kaiky Brito
            </NeonText>
          </h1>

          {/* Subtitle with gradient and glow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-8"
          >
            <p
              className="text-2xl md:text-3xl lg:text-4xl font-semibold bg-gradient-to-r from-cyan-400 via-pink-500 to-cyan-400 bg-clip-text text-transparent inline-block"
              style={{
                backgroundSize: "200% auto",
                animation: "gradient 3s linear infinite",
              }}
            >
              Full Stack Developer | Web Developer
            </p>
            <div
              className="h-1 w-64 mx-auto mt-4 rounded-full bg-gradient-to-r from-transparent via-cyan-400 to-transparent"
              style={{
                boxShadow: "0 0 10px #00ff88, 0 0 20px #00ff88",
                animation: "pulse 2s ease-in-out infinite",
              }}
            ></div>
          </motion.div>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Passionate developer focused on creating innovative web solutions with modern technologies
          </motion.p>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.9, duration: 0.5 }}
          >
            <Button
              onClick={handleCTAClick}
              className="relative px-8 py-6 text-lg font-semibold bg-transparent border-2 border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-gray-900 transition-all duration-300 overflow-hidden group"
              style={{
                boxShadow: "0 0 10px #00ff88, 0 0 20px #00ff88",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 0 15px #00ff88, 0 0 30px #00ff88, 0 0 45px #00ff88";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 0 10px #00ff88, 0 0 20px #00ff88";
              }}
            >
              Ver Projetos
              <span className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></span>
            </Button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <button
            onClick={handleScrollDown}
            className="text-cyan-400 hover:text-pink-500 transition-colors cursor-pointer"
            aria-label="Scroll down"
          >
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <ChevronDown size={40} />
            </motion.div>
          </button>
        </motion.div>
      </div>

      <style>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </section>
  );
};

export default Hero;
