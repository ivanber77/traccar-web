/**
 * Conecty OIDC redirect hosts and handoff path for email-first login routing.
 */
export const CONECTY_OIDC_HOSTS = {
  ar: import.meta.env.VITE_CONECTY_OIDC_HOST_AR || 'https://conecty.com.ar',
  uy: import.meta.env.VITE_CONECTY_OIDC_HOST_UY || 'https://conecty.com.uy',
};

function resolveOidcHost(market) {
  const key = market === 'uy' ? 'uy' : 'ar';
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    // Local dev always goes through conecty-web on 3000 (WHMCS redirect_uri registered there).
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3000';
    }
  }
  return CONECTY_OIDC_HOSTS[key];
}

export const CONECTY_HANDOFF_PATH = '/auth/cotrack/handoff';
export const CONECTY_REGISTER_PATH = '/cotrack/registro';

function normalizeLoginHint(email) {
  if (typeof email !== 'string') {
    return null;
  }
  const normalized = email.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return null;
  }
  return normalized;
}

export function buildConectyRegisterUrl(market, returnTo, email) {
  const host = resolveOidcHost(market);
  const params = new URLSearchParams();
  if (returnTo) {
    params.set('return_to', returnTo);
  }
  const loginHint = normalizeLoginHint(email);
  if (loginHint) {
    params.set('email', loginHint);
  }
  const query = params.toString();
  return `${host}${CONECTY_REGISTER_PATH}${query ? `?${query}` : ''}`;
}

export function buildConectyOidcAuthorizeUrl(market, email) {
  const host = resolveOidcHost(market);
  const params = new URLSearchParams({
    market: market || 'ar',
    return_to: CONECTY_HANDOFF_PATH,
  });
  const loginHint = normalizeLoginHint(email);
  if (loginHint) {
    params.set('login_hint', loginHint);
  }
  return `${host}/api/auth/whmcs/authorize?${params.toString()}`;
}

export function isEmailRoutingEnabled() {
  const flag = import.meta.env.VITE_EMAIL_ROUTING_ENABLED;
  if (flag === '0' || flag === 'false') {
    return false;
  }
  if (flag === '1' || flag === 'true' || flag === true) {
    return true;
  }
  return true;
}
