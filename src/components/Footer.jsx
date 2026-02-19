import React from "react";
import { Github, Linkedin, Mail, Heart } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    {
      name: "GitHub",
      icon: <Github size={20} />,
      url: "https://github.com/kaikybrofc",
    },
    {
      name: "LinkedIn",
      icon: <Linkedin size={20} />,
      url: "https://linkedin.com",
    },
    {
      name: "Email",
      icon: <Mail size={20} />,
      url: "mailto:contact@example.com",
    },
  ];

  return (
    <footer className="bg-gray-950 border-t border-cyan-400/20 py-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-96 h-32 bg-cyan-400 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Copyright */}
          <div className="text-center md:text-left">
            <p className="text-gray-400 flex items-center justify-center md:justify-start gap-2">
              <span>© {currentYear} Kaiky Brito. Feito com</span>
              <Heart size={16} className="text-pink-500 animate-pulse" />
              <span>e código</span>
            </p>
            <p className="text-gray-500 text-sm mt-1">
              Todos os direitos reservados
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            {socialLinks.map((link, index) => (
              <a
                key={index}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-gray-800/50 border border-cyan-400/30 rounded-lg text-cyan-400 hover:text-pink-500 hover:border-pink-500 transition-all duration-300"
                style={{
                  boxShadow: "0 0 5px rgba(0, 255, 136, 0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 10px rgba(255, 0, 255, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 5px rgba(0, 255, 136, 0.2)";
                }}
                aria-label={link.name}
              >
                {link.icon}
              </a>
            ))}
          </div>
        </div>

        {/* Additional Links */}
        <div className="mt-6 pt-6 border-t border-gray-800 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <a
              href="#hero"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector("#hero")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-cyan-400 transition-colors"
            >
              Home
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector("#about")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-cyan-400 transition-colors"
            >
              Sobre
            </a>
            <a
              href="#projects"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector("#projects")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-cyan-400 transition-colors"
            >
              Projetos
            </a>
            <a
              href="#skills"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector("#skills")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-cyan-400 transition-colors"
            >
              Habilidades
            </a>
            <a
              href="#contact"
              onClick={(e) => {
                e.preventDefault();
                document.querySelector("#contact")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="hover:text-cyan-400 transition-colors"
            >
              Contato
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;