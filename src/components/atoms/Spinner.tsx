import React from "react";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-10 h-10 border-3",
  };

  const classes = `${sizeClasses[size]} border-white border-t-transparent rounded-full animate-spin ${className}`;

  return <div className={classes}></div>;
};

export default Spinner;
