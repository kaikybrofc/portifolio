import React, { useState } from "react";
import { NeonText, NeonBox } from "@/components/NeonGlow";
import { Button } from "@/components/ui/button";
import { Mail, Github, Linkedin, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useContacts } from "@/hooks/useContacts";

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const { addContact, loading } = useContacts();
  const { toast } = useToast();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    const result = await addContact(formData);

    if (result.success) {
      toast({
        title: "Mensagem enviada com sucesso! ✨",
        description: "Obrigado pelo contato. Responderei em breve!",
      });
      setFormData({ name: "", email: "", message: "" });
    } else {
      toast({
        title: "Erro ao enviar",
        description: result.error || "Ocorreu um problema. Tente novamente mais tarde.",
        variant: "destructive"
      });
    }
  };

  const socialLinks = [
    {
      name: "GitHub",
      icon: <Github size={24} />,
      url: "https://github.com/kaikybrofc",
      color: "cyan",
    },
    {
      name: "LinkedIn",
      icon: <Linkedin size={24} />,
      url: "https://linkedin.com",
      color: "magenta",
    },
    {
      name: "Email",
      icon: <Mail size={24} />,
      url: "mailto:contact@example.com",
      color: "accent",
    },
  ];

  return (
    <section id="contact" className="py-20 bg-gray-950 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-1/3 left-10 w-96 h-96 bg-pink-500 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-10 w-96 h-96 bg-cyan-400 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
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

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <NeonBox color="cyan" className="p-8 bg-gray-800/50 backdrop-blur-lg">
              <h3 className="text-2xl font-bold text-white mb-6">
                <NeonText color="cyan">Envie uma mensagem</NeonText>
              </h3>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="name" className="block text-gray-300 mb-2 font-medium">Nome</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-900 border-2 border-cyan-400/30 rounded-lg text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-gray-300 mb-2 font-medium">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 bg-gray-900 border-2 border-cyan-400/30 rounded-lg text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-gray-300 mb-2 font-medium">Mensagem</label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3 bg-gray-900 border-2 border-cyan-400/30 rounded-lg text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none transition-all resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-400 to-pink-500 text-white font-semibold py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? "Enviando..." : (
                    <span className="flex items-center justify-center gap-2">
                      <Send size={18} /> Enviar Mensagem
                    </span>
                  )}
                </Button>
              </form>
            </NeonBox>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <NeonBox color="magenta" className="p-8 bg-gray-800/50 backdrop-blur-lg">
              <h3 className="text-2xl font-bold text-white mb-6">
                <NeonText color="magenta">Redes Sociais</NeonText>
              </h3>
              <p className="text-gray-300 mb-8 leading-relaxed">
                Conecte-se com <strong>Kaiky Brito</strong> nas redes sociais ou envie um email.
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
                  >
                    <div className="text-cyan-400 group-hover:text-pink-500 transition-colors">
                      {link.icon}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{link.name}</p>
                    </div>
                  </motion.a>
                ))}
              </div>
            </NeonBox>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
