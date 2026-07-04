import React from "react";

interface LogoProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const Logo: React.FC<LogoProps> = ({ size = 24, className, style }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
      <path d="M12 9v4" />
      <path d="M8 11v2" />
      <path d="M16 11v2" />
    </svg>
  );
};

export default Logo;
