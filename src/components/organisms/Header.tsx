import React from "react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  className?: string;
}

const Header: React.FC<HeaderProps> = ({
  title = "Atome",
  subtitle = "Compresseur d'images intelligent",
  className = "",
}) => {
  return (
    <header
      className={`bg-white border-b border-slate-200 shadow-sm ${className}`}
    >
      <div className="text-center py-8 px-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          {title}
        </h1>
        <p className="text-slate-600 text-lg mt-2">{subtitle}</p>
      </div>
    </header>
  );
};

export default Header;
