import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { NeonText } from "@/components/NeonGlow";
import { motion, AnimatePresence } from "framer-motion";
import UserProfile from "@/components/UserProfile";
import LoginButton from "@/components/LoginButton";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, isOwner } = useAuth();

  const scrollToHashSection = (hash, offset = 96) => {
    if (!hash) return;

    const targetId = hash.replace("#", "");
    const element = document.getElementById(targetId);
    if (!element) return;

    const elementTop = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: Math.max(0, elementTop - offset),
      behavior: "smooth",
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navItems = [
    { name: "Home", href: "/#hero" },
    { name: "Sobre", href: "/#about" },
    { name: "Projetos", href: "/#projects" },
    { name: "OmniZap", href: "/projetos/omnizap-system" },
    { name: "Habilidades", href: "/#skills" },
    { name: "Blog", href: "/blog" },
    { name: "Contato", href: "/#contact" },
  ];

  if (isOwner) {
    navItems.splice(navItems.length - 1, 0, { name: "Analytics", href: "/analytics" });
  }

  const handleNavClick = (e, href) => {
    e.preventDefault();
    const closeMenuDelay = isMobileMenuOpen ? 220 : 0;
    setIsMobileMenuOpen(false);

    if (!href.includes("#")) {
      navigate(href);
      window.scrollTo(0, 0);
      return;
    }

    const hash = href.startsWith("/#") ? href.slice(1) : "";
    if (!hash) return;

    const delayedScroll = () => {
      window.setTimeout(() => {
        scrollToHashSection(hash);
      }, closeMenuDelay);
    };

    // Navega para home com hash quando estiver fora da home.
    if (location.pathname !== "/") {
      navigate(`/${hash}`);
      delayedScroll();
      return;
    }

    // Se o hash ja for o mesmo, garante o scroll mesmo sem mudar rota.
    if (location.hash === hash) {
      delayedScroll();
      return;
    }

    navigate(`/${hash}`);
    delayedScroll();
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-gray-900/80 backdrop-blur-lg border-b border-cyan-400/30 shadow-lg shadow-cyan-400/20"
          : "bg-gray-900/50 backdrop-blur-sm"
      }`}
    >
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" onClick={(e) => handleNavClick(e, "/#hero")} className="shrink-0">
            <NeonText
              color="cyan"
              intensity="high"
              className="text-2xl font-bold cursor-pointer hover:scale-110 transition-transform block"
            >
              Kaiky Brito
            </NeonText>
          </Link>

          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            <ul className="flex items-center space-x-6 lg:space-x-8">
              {navItems.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={(e) => handleNavClick(e, item.href)}
                    className="text-gray-300 hover:text-cyan-400 transition-all duration-300 relative group font-medium text-sm lg:text-base"
                    style={{
                      textShadow: "0 0 0px transparent",
                      transition: "all 0.3s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.textShadow = "0 0 5px #00ff88, 0 0 10px #00ff88";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.textShadow = "0 0 0px transparent";
                    }}
                  >
                    {item.name}
                    <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-cyan-400 to-pink-500 group-hover:w-full transition-all duration-300"></span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4 pl-4 border-l border-gray-700">
              {currentUser ? <UserProfile /> : <LoginButton />}
            </div>
          </div>

          <div className="flex md:hidden items-center gap-4">
            {currentUser && <UserProfile />}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-cyan-400 hover:text-pink-500 transition-colors focus:outline-none"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 overflow-hidden"
            >
              <div className="flex flex-col space-y-4 bg-gray-800/95 backdrop-blur-xl rounded-xl p-4 border border-cyan-400/30 shadow-2xl">
                <ul className="flex flex-col space-y-2">
                  {navItems.map((item) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        onClick={(e) => handleNavClick(e, item.href)}
                        className="block text-gray-300 hover:text-cyan-400 hover:bg-gray-700/50 rounded-lg px-4 py-2 transition-colors font-medium"
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="pt-4 border-t border-gray-700 px-4">
                  {!currentUser && <LoginButton />}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};

export default Header;
