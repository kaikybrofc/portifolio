import React, { useState } from "react";
import { NeonText, NeonBox } from "@/components/NeonGlow";
import { Button } from "@/components/ui/button";
import { Mail, Github, Linkedin, Send } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { useContacts } from "@/hooks/useContacts";
import {
  consumeRateLimitAttempt,
  createMathChallenge,
  formatRetryTime,
  getRateLimitStatus,
  isMathChallengeCorrect,
} from "@/lib/antiSpam";

const CONTACT_MIN_FILL_MS = 3000;
const CONTACT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const CONTACT_RATE_LIMIT_MAX_ATTEMPTS = 3;
const CONTACT_RATE_LIMIT_KEY = "contact_form";

const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [websiteField, setWebsiteField] = useState("");
  const [humanAnswer, setHumanAnswer] = useState("");
  const [challenge, setChallenge] = useState(() => createMathChallenge());
  const [formStartedAt, setFormStartedAt] = useState(() => Date.now());

  const { addContact, loading } = useContacts();
  const { toast } = useToast();

  const linkedinUrl =
    import.meta.env.VITE_LINKEDIN_URL ||
    import.meta.env.NEXT_PUBLIC_LINKEDIN_URL ||
    "https://www.linkedin.com";
  const contactEmail =
    import.meta.env.VITE_CONTACT_EMAIL ||
    import.meta.env.NEXT_PUBLIC_CONTACT_EMAIL ||
    "contato@omnizap.shop";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetAntiSpamState = () => {
    setWebsiteField("");
    setHumanAnswer("");
    setChallenge(createMathChallenge());
    setFormStartedAt(Date.now());
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (websiteField.trim()) {
      // Honeypot preenchido: encerramos silenciosamente para reduzir feedback para bots.
      resetAntiSpamState();
      return;
    }

    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }

    if (Date.now() - formStartedAt < CONTACT_MIN_FILL_MS) {
      toast({
        title: "Envio muito rapido",
        description: "Aguarde alguns segundos e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    if (!isMathChallengeCorrect(challenge, humanAnswer)) {
      toast({
        title: "Verificacao humana invalida",
        description: "Confirme a soma informada para enviar.",
        variant: "destructive",
      });
      setChallenge(createMathChallenge());
      setHumanAnswer("");
      return;
    }

    const rateLimitStatus = getRateLimitStatus(
      CONTACT_RATE_LIMIT_KEY,
      CONTACT_RATE_LIMIT_WINDOW_MS,
      CONTACT_RATE_LIMIT_MAX_ATTEMPTS
    );

    if (!rateLimitStatus.allowed) {
      toast({
        title: "Limite de envios atingido",
        description: `Tente novamente em ${formatRetryTime(rateLimitStatus.retryAfterMs)}.`,
        variant: "destructive",
      });
      return;
    }

    consumeRateLimitAttempt(CONTACT_RATE_LIMIT_KEY, CONTACT_RATE_LIMIT_WINDOW_MS);

    const result = await addContact(formData);

    if (result.success) {
      toast({
        title: "Mensagem enviada com sucesso! ✨",
        description: "Obrigado pelo contato. Responderei em breve!",
      });
      setFormData({ name: "", email: "", message: "" });
      resetAntiSpamState();
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
      url: linkedinUrl,
      color: "magenta",
    },
    {
      name: "Email",
      icon: <Mail size={24} />,
      url: `mailto:${contactEmail}`,
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

              <form onSubmit={handleSubmit} className="space-y-6 relative">
                <div
                  className="absolute left-[-9999px] top-auto w-px h-px overflow-hidden"
                  aria-hidden="true"
                >
                  <label htmlFor="website-field">Website</label>
                  <input
                    id="website-field"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={websiteField}
                    onChange={(event) => setWebsiteField(event.target.value)}
                  />
                </div>

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

                <div>
                  <label htmlFor="contact-human-check" className="block text-gray-300 mb-2 font-medium">
                    Verificacao humana: quanto e {challenge.left} + {challenge.right}?
                  </label>
                  <input
                    id="contact-human-check"
                    type="number"
                    inputMode="numeric"
                    value={humanAnswer}
                    onChange={(event) => setHumanAnswer(event.target.value)}
                    className="w-full px-4 py-3 bg-gray-900 border-2 border-cyan-400/30 rounded-lg text-white placeholder-gray-500 focus:border-cyan-400 focus:outline-none transition-all"
                    required
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
