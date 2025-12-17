/**
 * Validation helpers for dashboard forms
 */

export const validateEmail = (email: string): string | null => {
  if (!email.trim()) return null; // Email is optional
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) return "Invalid email format";
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone.trim()) return null; // Phone is optional
  const re = /^[\d\-+\s()]{7,}$/; // Basic: at least 7 digits/symbols
  if (!re.test(phone)) return "Invalid phone format";
  return null;
};

export const validateURL = (url: string): string | null => {
  if (!url.trim()) return null; // URL is optional
  try {
    new URL(url.startsWith("http") ? url : `https://${url}`);
    return null;
  } catch {
    return "Invalid URL format";
  }
};

export const validateKeyword = (keyword: string): string | null => {
  const trimmed = keyword.trim();
  if (!trimmed) return "Keyword cannot be empty";
  if (trimmed.length < 2) return "Keyword must be at least 2 characters";
  if (trimmed.length > 100) return "Keyword must be less than 100 characters";
  return null;
};

export const validateCity = (city: string): string | null => {
  const trimmed = city.trim();
  if (!trimmed) return "City is required";
  // Support international characters using Unicode property escapes (\p{L} = any letter)
  if (!/^[\p{L}\s'-]+$/u.test(trimmed))
    return "City must contain only letters, spaces, hyphens, and apostrophes";
  return null;
};

export const validateState = (state: string): string | null => {
  const trimmed = state.trim().toUpperCase();
  if (!trimmed) return "State is required";
  if (!/^[A-Z]{2}$/.test(trimmed))
    return "State must be a 2-letter code (e.g., VA, MD)";
  return null;
};

export const validateBusinessName = (name: string): string | null => {
  const trimmed = name.trim();
  if (!trimmed) return "Business name is required";
  if (trimmed.length < 2) return "Business name must be at least 2 characters";
  return null;
};

export const validateIndustry = (industry: string): string | null => {
  const trimmed = industry.trim();
  if (!trimmed) return "Industry is required";
  if (trimmed.length < 2) return "Industry must be at least 2 characters";
  return null;
};
