import React from "react";
import { cn } from "@/lib/utils";

// Neon text component with customizable glow - Intensity reduced by 40-50%
export const NeonText = ({ 
  children, 
  className, 
  color = "cyan",
  intensity = "medium",
  animated = false,
  ...props 
}) => {
  const colorStyles = {
    cyan: {
      textColor: "text-cyan-400",
      shadowColor: "0 0 5px #00ff88, 0 0 10px #00ff88, 0 0 15px #00ff88",
    },
    magenta: {
      textColor: "text-pink-500",
      shadowColor: "0 0 5px #ff00ff, 0 0 10px #ff00ff, 0 0 15px #ff00ff",
    },
    accent: {
      textColor: "text-cyan-300",
      shadowColor: "0 0 5px #00ffff, 0 0 10px #00ffff, 0 0 15px #00ffff",
    },
  };

  const intensityMultiplier = {
    low: 0.3,
    medium: 0.7,
    high: 1.0,
  };

  const selectedColor = colorStyles[color];
  const multiplier = intensityMultiplier[intensity];

  return (
    <span
      className={cn(selectedColor.textColor, animated && "animate-pulse", className)}
      style={{
        textShadow: selectedColor.shadowColor,
        filter: `brightness(${multiplier})`,
      }}
      {...props}
    >
      {children}
    </span>
  );
};

// Neon box component with border glow - Intensity reduced by 40-50%
export const NeonBox = ({ 
  children, 
  className, 
  color = "cyan",
  intensity = "medium",
  hover = true,
  ...props 
}) => {
  const colorStyles = {
    cyan: {
      borderColor: "border-cyan-400/60",
      shadowColor: "0 0 6px #00ff88",
      hoverShadow: "0 0 12px #00ff88, 0 0 24px #00ff88",
    },
    magenta: {
      borderColor: "border-pink-500/60",
      shadowColor: "0 0 6px #ff00ff",
      hoverShadow: "0 0 12px #ff00ff, 0 0 24px #ff00ff",
    },
    accent: {
      borderColor: "border-cyan-300/60",
      shadowColor: "0 0 6px #00ffff",
      hoverShadow: "0 0 12px #00ffff, 0 0 24px #00ffff",
    },
  };

  const selectedColor = colorStyles[color];

  return (
    <div
      className={cn(
        "border-2 rounded-lg transition-all duration-300",
        selectedColor.borderColor,
        hover && "hover:scale-105",
        className
      )}
      style={{
        boxShadow: selectedColor.shadowColor,
      }}
      onMouseEnter={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = selectedColor.hoverShadow;
        }
      }}
      onMouseLeave={(e) => {
        if (hover) {
          e.currentTarget.style.boxShadow = selectedColor.shadowColor;
        }
      }}
      {...props}
    >
      {children}
    </div>
  );
};

// Hook to get neon glow classes
export const useNeonGlow = (color = "cyan") => {
  const glowClasses = {
    cyan: {
      text: "text-cyan-400",
      border: "border-cyan-400/60",
      bg: "bg-cyan-400/5",
      shadow: "shadow-cyan-400/30",
    },
    magenta: {
      text: "text-pink-500",
      border: "border-pink-500/60",
      bg: "bg-pink-500/5",
      shadow: "shadow-pink-500/30",
    },
    accent: {
      text: "text-cyan-300",
      border: "border-cyan-300/60",
      bg: "bg-cyan-300/5",
      shadow: "shadow-cyan-300/30",
    },
  };

  return glowClasses[color];
};

export default { NeonText, NeonBox, useNeonGlow };