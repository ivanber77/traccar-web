import { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

const TURNSTILE_SCRIPT_ID = 'cf-turnstile-script';
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** Cloudflare always-passes test key when unset (local/dev). */
const SITE_KEY =
  import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()
  || '1x00000000000000000000AA';

/**
 * Explicit Cloudflare Turnstile widget for login.
 * @param {{ onVerify: (token: string) => void, onExpire?: () => void, onError?: () => void }} props
 */
const LoginTurnstile = ({ onVerify, onExpire, onError }) => {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);

  useEffect(() => {
    const renderWidget = () => {
      if (!containerRef.current || !window.turnstile) {
        return;
      }

      if (widgetIdRef.current != null) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: 'light',
        size: 'flexible',
        callback: onVerify,
        'expired-callback': onExpire,
        'error-callback': onError,
      });
    };

    if (window.turnstile) {
      renderWidget();
      return () => {
        if (widgetIdRef.current != null && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }
      };
    }

    const existingScript = document.getElementById(TURNSTILE_SCRIPT_ID);
    if (existingScript) {
      existingScript.addEventListener('load', renderWidget);
      return () => existingScript.removeEventListener('load', renderWidget);
    }

    const script = document.createElement('script');
    script.id = TURNSTILE_SCRIPT_ID;
    script.src = TURNSTILE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = renderWidget;
    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current != null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [onVerify, onExpire, onError]);

  return (
    <Box
      ref={containerRef}
      sx={{ width: '100%', minHeight: 65 }}
      aria-label="Verificación de seguridad"
    />
  );
};

export default LoginTurnstile;
