import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  GOOGLE_TOKEN_STORAGE_KEY,
  GOOGLE_USER_STORAGE_KEY,
} from "../../constants/auth";

type GoogleCredentialResponse = {
  credential: string;
};

type JwtPayload = {
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  exp?: number;
};

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

function parseJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + (4 - (normalized.length % 4)) % 4, "=");
    const decoded = atob(padded);
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
}

function isTokenValid(token: string): boolean {
  const payload = parseJwt(token);
  if (!payload?.exp) {
    return true;
  }
  return Date.now() / 1000 < payload.exp - 60;
}

export const GoogleAuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, token, setAuth, signOut } = useAuth();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLDivElement | null>(null);

  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || "";
  const allowedEmails = useMemo(
    () =>
      (process.env.REACT_APP_GOOGLE_ALLOWED_EMAILS || "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    []
  );

  useEffect(() => {
    if (!clientId) {
      setReady(true);
      return;
    }

    if (token && isTokenValid(token)) {
      setReady(true);
      return;
    }

    const storedToken = localStorage.getItem(GOOGLE_TOKEN_STORAGE_KEY);
    const storedUser = localStorage.getItem(GOOGLE_USER_STORAGE_KEY);

    if (storedToken && isTokenValid(storedToken)) {
      const payload = parseJwt(storedToken);
      if (payload?.email) {
        if (allowedEmails.length > 0 && !allowedEmails.includes(payload.email.toLowerCase())) {
          signOut();
          setError("This Google account does not have access.");
          return;
        }
        setAuth(storedToken, {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        });
        setReady(true);
        return;
      }
    }

    if (storedToken && !isTokenValid(storedToken)) {
      signOut();
    }
  }, [allowedEmails, clientId, setAuth, signOut, token]);

  useEffect(() => {
    if (!clientId || user) {
      return;
    }

    if (document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`)) {
      setReady(true);
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => setReady(true);
    script.onerror = () => setError("Unable to load Google sign-in.");
    document.head.appendChild(script);
  }, [clientId, user]);

  useEffect(() => {
    if (!ready || !clientId || user || !buttonRef.current) {
      return;
    }

    const google = window.google;
    if (!google?.accounts?.id) {
      setError("Google sign-in is not available.");
      return;
    }

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: GoogleCredentialResponse) => {
        const payload = parseJwt(response.credential);
        if (!payload?.email || payload.email_verified === false) {
          setError("Google authentication failed. Try again.");
          return;
        }
        if (allowedEmails.length > 0 && !allowedEmails.includes(payload.email.toLowerCase())) {
          setError("This Google account does not have access.");
          return;
        }
        setError(null);
        setAuth(response.credential, {
          email: payload.email,
          name: payload.name,
          picture: payload.picture,
        });
      },
    });

    google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      width: 280,
      text: "signin_with",
      shape: "pill",
    });

    google.accounts.id.prompt();
  }, [allowedEmails, clientId, ready, setAuth, user]);

  if (!clientId) {
    return <>{children}</>;
  }

  if (user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-dark-900 text-dark-50 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-dark-700 bg-dark-800 p-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-dark-400">MarketBrewer</p>
            <h1 className="mt-2 text-2xl font-semibold text-dark-50">Admin Dashboard</h1>
          </div>
          <div className="rounded-full bg-dark-700 px-3 py-1 text-xs text-dark-300">Secure</div>
        </div>
        <p className="mt-4 text-sm text-dark-300">
          Sign in with your Google Workspace account to manage MarketBrewer clients.
        </p>
        {error ? (
          <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
        <div className="mt-6 flex justify-center">
          <div ref={buttonRef} />
        </div>
        <p className="mt-6 text-xs text-dark-400">
          Access is limited to approved MarketBrewer accounts.
        </p>
      </div>
    </div>
  );
};

export default GoogleAuthGate;
