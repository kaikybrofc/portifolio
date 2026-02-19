import React from "react";
import { NeonText, NeonBox } from "@/components/NeonGlow";
import {
  Mail,
  Github,
  Linkedin,
  Instagram,
  MessageCircle,
} from "lucide-react";
import { motion } from "framer-motion";

const ContactSection = () => {
  const socialLinks = [
    {
      name: "GitHub",
      icon: <Github size={24} />,
      url: "https://github.com/kaikybrofc",
      color: "cyan",
      detail: "@kaikybrofc",
    },
    {
      name: "LinkedIn",
      icon: <Linkedin size={24} />,
      url: "https://www.linkedin.com/in/kaikybrofc/",
      color: "magenta",
      detail: "/in/kaikybrofc",
    },
    {
      name: "Instagram",
      icon: <Instagram size={24} />,
      url: "https://www.instagram.com/kaikybrofc/",
      color: "pink",
      detail: "@kaikybrofc",
    },
    {
      name: "WhatsApp",
      icon: <MessageCircle size={24} />,
      url: "https://wa.me/5595991122954",
      color: "green",
      detail: "+55 95 99112-2954",
    },
    {
      name: "Email",
      icon: <Mail size={24} />,
      url: "mailto:kaikyggomesribeiroof@gmail.com",
      color: "accent",
      detail: "kaikyggomesribeiroof@gmail.com",
    },
  ];

  return (
    <section id="contact" className="py-20 bg-gray-950 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/3 left-10 w-96 h-96 bg-pink-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
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
              Contato
            </NeonText>
          </h2>
          <div
            className="h-1 w-32 mx-auto rounded-full bg-gradient-to-r from-pink-500 to-cyan-400"
            style={{ boxShadow: "0 0 10px #ff00ff" }}
          ></div>
          <p className="text-gray-400 mt-6 text-lg max-w-2xl mx-auto">
            Fale diretamente com <strong>Kaiky Brito</strong> para discutir projetos ou oportunidades
          </p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <NeonBox color="magenta" className="p-8 bg-gray-800/50 backdrop-blur-lg">
              <h3 className="text-2xl font-bold text-white mb-6">
                <NeonText color="magenta">Redes Sociais</NeonText>
              </h3>

              <p className="text-gray-300 mb-8 leading-relaxed">
                Conecte-se com <strong>Kaiky Brito</strong> nas redes sociais ou envie um email. Estou sempre aberto
                a novas oportunidades e colaborações!
              </p>

              <div className="space-y-4">
                {socialLinks.map((link, index) => (
                  <motion.a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.05, x: 10 }}
                    className="flex items-center gap-4 p-4 bg-gray-700/30 border-2 border-transparent rounded-lg transition-all group"
                    style={{
                      borderColor: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      const colors = {
                        cyan: "#00ff88",
                        magenta: "#ff00ff",
                        pink: "#E1306C",
                        green: "#25D366",
                        accent: "#00ffff",
                      };
                      e.currentTarget.style.borderColor = colors[link.color];
                      e.currentTarget.style.boxShadow = `0 0 10px ${colors[link.color]}`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "transparent";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    <div className="text-cyan-400 group-hover:text-pink-500 transition-colors">
                      {link.icon}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{link.name}</p>
                      <p className="text-gray-400 text-sm">{link.detail}</p>
                    </div>
                  </motion.a>
                ))}
              </div>
            </NeonBox>

            <NeonBox color="accent" className="p-8 bg-gray-800/50 backdrop-blur-lg">
              <h3 className="text-xl font-bold text-white mb-4">
                <NeonText color="accent">Disponibilidade</NeonText>
              </h3>
              <p className="text-gray-300 leading-relaxed">
                Atualmente disponível para projetos freelance e oportunidades de trabalho
                remoto. Tempo de resposta: 24-48 horas.
              </p>
            </NeonBox>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
