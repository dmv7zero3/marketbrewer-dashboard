import React from "react";

export const Footer: React.FC = () => {
  const apiUrl =
    (process.env as any).REACT_APP_API_URL || "http://localhost:3001";
  const hasToken = Boolean((process.env as any).REACT_APP_API_TOKEN);

  return (
    <footer className="mt-8 border-t border-dark-700">
      <div className="container py-3 text-xs text-dark-500 flex justify-between items-center">
        <span>API: {apiUrl}</span>
        <span>Token: {hasToken ? "set" : "missing"}</span>
      </div>
    </footer>
  );
};

export default Footer;
