import React from "react";
import Header from "../organisms/Header";

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, className = "" }) => {
  return (
    <div className={`min-h-screen bg-slate-50 flex flex-col ${className}`}>
      <Header />

      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  );
};

export default AppLayout;
