/* ── Customer identity & auth token stored in localStorage ─────────────── */
const KEY        = 'dhabaCustomer';
const KEY_UUID   = 'dhabaCustomerKey';
const TOKEN_KEY  = 'dhabaCustomerToken';

/**
 * Returns { name, phone } or null  (anonymous / non-logged-in identity)
 */
export const getCustomer = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
  catch { return null; }
};

/**
 * Save customer identity (name + phone) for this device.
 */
export const setCustomer = ({ name, phone }) => {
  localStorage.setItem(KEY, JSON.stringify({ name: name.trim(), phone: phone.trim() }));
};

/**
 * Remove saved customer identity + token.
 */
export const clearCustomer = () => {
  localStorage.removeItem(KEY);
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * Get or create a stable anonymous device UUID (backward-compatible key).
 */
export const getOrCreateCustomerKey = () => {
  let key = localStorage.getItem(KEY_UUID);
  if (!key) {
    key = crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem(KEY_UUID, key);
  }
  return key;
};

/* ── JWT token for logged-in customers ──────────────────────────────────── */
export const getCustomerToken = () => localStorage.getItem(TOKEN_KEY) || null;

export const setCustomerToken = (token) => {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
};
