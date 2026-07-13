import { useEffect, useState } from 'react';
import {
  useMediaQuery, Select, MenuItem, FormControl, Button, TextField, Link, Snackbar, IconButton, Tooltip, Box, InputAdornment,
} from '@mui/material';
import ReactCountryFlag from 'react-country-flag';
import { makeStyles } from 'tss-react/mui';
import CloseIcon from '@mui/icons-material/Close';
import VpnLockIcon from '@mui/icons-material/VpnLock';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useTheme } from '@mui/material/styles';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { sessionActions } from '../store';
import { useLocalization, useTranslation } from '../common/components/LocalizationProvider';
import LoginLayout from './LoginLayout';
import usePersistedState from '../common/util/usePersistedState';
import {
  generateLoginToken, handleLoginTokenListeners, nativeEnvironment, appleNativeEnvironment, nativePostMessage,
} from '../common/components/NativeInterface';
import LogoImage from './LogoImage';
import { useCatch } from '../reactHelper';
import QrCodeDialog from '../common/components/QrCodeDialog';
import fetchOrThrow from '../common/util/fetchOrThrow';
import { buildConectyOidcAuthorizeUrl, buildConectyRegisterUrl, isEmailRoutingEnabled } from './conectyAuthRouting';

const useStyles = makeStyles()((theme) => ({
  options: {
    position: 'fixed',
    top: theme.spacing(2),
    right: theme.spacing(2),
    display: 'flex',
    flexDirection: 'row',
    gap: theme.spacing(1),
  },
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  extraContainer: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: theme.spacing(4),
    marginTop: theme.spacing(2),
  },
  registerButton: {
    minWidth: 'unset',
  },
  link: {
    cursor: 'pointer',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    color: '#3c4043',
    border: '1px solid #dadce0',
    borderRadius: '4px',
    textTransform: 'none',
    fontSize: '14px',
    fontWeight: 500,
    padding: '10px 24px',
    boxShadow: '0 1px 2px 0 rgba(60, 64, 67, 0.3), 0 1px 3px 1px rgba(60, 64, 67, 0.15)',
    '&:hover': {
      backgroundColor: '#f8f9fa',
      boxShadow: '0 1px 3px 0 rgba(60, 64, 67, 0.3), 0 4px 8px 3px rgba(60, 64, 67, 0.15)',
    },
    '&:active': {
      backgroundColor: '#f1f3f4',
    },
  },
  appleButton: {
    backgroundColor: '#000000',
    color: '#ffffff',
    border: '1px solid #000000',
    borderRadius: '4px',
    textTransform: 'none',
    fontSize: '14px',
    fontWeight: 500,
    padding: '10px 24px',
    '&:hover': {
      backgroundColor: '#333333',
    },
    '&:active': {
      backgroundColor: '#1a1a1a',
    },
  },
  socialIcon: {
    width: '18px',
    height: '18px',
    marginRight: theme.spacing(1.5),
  },
}));

const LoginPage = () => {
  const { classes } = useStyles();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = useTranslation();

  const { languages, language, setLocalLanguage } = useLocalization();
  const languageList = Object.entries(languages).map((values) => ({ code: values[0], country: values[1].country, name: values[1].name }));

  const emailRouting = isEmailRoutingEnabled();

  const [failed, setFailed] = useState(false);
  const [routeError, setRouteError] = useState('');
  const [routeLoading, setRouteLoading] = useState(false);
  const [loginStep, setLoginStep] = useState(emailRouting ? 'email' : 'password');

  const [email, setEmail] = usePersistedState('loginEmail', '');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showServerTooltip, setShowServerTooltip] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const languageEnabled = useSelector((state) => {
    const attributes = state.session.server?.attributes;
    return !attributes?.language && !attributes?.['ui.disableLoginLanguage'];
  });
  const changeEnabled = useSelector((state) => !state.session.server?.attributes?.disableChange);
  const emailEnabled = useSelector((state) => state.session.server?.emailEnabled);
  const openIdEnabled = useSelector((state) => state.session.server?.openIdEnabled === true || state.session.server?.openIdEnabled === 'true');
  const openIdForced = useSelector((state) => state.session.server?.openIdEnabled && state.session.server?.openIdForce);
  const [codeEnabled, setCodeEnabled] = useState(false);

  const [announcementShown, setAnnouncementShown] = useState(false);
  const announcement = useSelector((state) => state.session.server?.announcement);

  const showEmailStep = emailRouting && loginStep === 'email';
  const showNotFoundStep = emailRouting && loginStep === 'not_found';
  const showPasswordStep = !emailRouting || loginStep === 'password';
  const showSocialLogin = openIdEnabled && !appleNativeEnvironment && !openIdForced;
  const showRegisterLink = !openIdForced;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const handoffError = params.get('cotrack_error');
    if (handoffError) {
      setRouteError(handoffError);
      params.delete('cotrack_error');
      const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
      window.history.replaceState({}, '', next);
    }
  }, []);

  const resetToEmailStep = () => {
    setLoginStep('email');
    setFailed(false);
    setRouteError('');
    setPassword('');
    setCode('');
    setCodeEnabled(false);
  };

  const goToConectyRegister = () => {
    const returnTo = `${window.location.origin}/login`;
    window.location.href = buildConectyRegisterUrl('ar', returnTo, email.trim());
  };

  const handleEmailContinue = async (event) => {
    event.preventDefault();
    setRouteError('');
    setFailed(false);
    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      return;
    }

    setRouteLoading(true);
    try {
      const response = await fetch(`/api/session/auth-route?email=${encodeURIComponent(normalizedEmail)}`);
      if (response.status === 404) {
        setLoginStep('not_found');
        return;
      }
      if (!response.ok) {
        throw new Error('route_failed');
      }
      const data = await response.json();
      if (data.route === 'oidc') {
        const market = data.market || 'ar';
        window.location.href = buildConectyOidcAuthorizeUrl(market, normalizedEmail);
        return;
      }
      setLoginStep('password');
    } catch {
      setRouteError(t('loginRouteFailed'));
    } finally {
      setRouteLoading(false);
    }
  };

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setFailed(false);
    try {
      const query = `email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
      const response = await fetch('/api/session', {
        method: 'POST',
        body: new URLSearchParams(code.length ? `${query}&code=${code}` : query),
      });
      if (response.ok) {
        const user = await response.json();
        generateLoginToken();
        dispatch(sessionActions.updateUser(user));
        const target = window.sessionStorage.getItem('postLogin') || '/';
        window.sessionStorage.removeItem('postLogin');
        navigate(target, { replace: true });
      } else if (response.status === 401 && response.headers.get('WWW-Authenticate') === 'TOTP') {
        setCodeEnabled(true);
      } else {
        throw Error(await response.text());
      }
    } catch {
      setFailed(true);
      setPassword('');
    }
  };

  const handleTokenLogin = useCatch(async (token) => {
    const response = await fetchOrThrow(`/api/session?token=${encodeURIComponent(token)}`);
    const user = await response.json();
    dispatch(sessionActions.updateUser(user));
    navigate('/');
  });

  const handleOpenIdLogin = (connection) => {
    const url = connection
      ? `/api/session/openid/auth?connection=${encodeURIComponent(connection)}`
      : '/api/session/openid/auth';
    document.location = url;
  };

  useEffect(() => nativePostMessage('authentication'), []);

  useEffect(() => {
    const listener = (token) => handleTokenLogin(token);
    handleLoginTokenListeners.add(listener);
    return () => handleLoginTokenListeners.delete(listener);
  }, []);

  useEffect(() => {
    if (window.localStorage.getItem('hostname') !== window.location.hostname) {
      window.localStorage.setItem('hostname', window.location.hostname);
      setShowServerTooltip(true);
    }
  }, []);

  return (
    <LoginLayout>
      <div className={classes.options}>
        {nativeEnvironment && changeEnabled && (
          <IconButton color="primary" onClick={() => navigate('/change-server')}>
            <Tooltip
              title={`${t('settingsServer')}: ${window.location.hostname}`}
              open={showServerTooltip}
              arrow
            >
              <VpnLockIcon />
            </Tooltip>
          </IconButton>
        )}
        {!nativeEnvironment && (
          <IconButton color="primary" onClick={() => setShowQr(true)}>
            <QrCode2Icon />
          </IconButton>
        )}
        {languageEnabled && (
          <FormControl>
            <Select value={language} onChange={(e) => setLocalLanguage(e.target.value)}>
              {languageList.map((it) => (
                <MenuItem key={it.code} value={it.code}>
                  <Box component="span" sx={{ mr: 1 }}>
                    <ReactCountryFlag countryCode={it.country} svg />
                  </Box>
                  {it.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </div>
      <div className={classes.container}>
        {useMediaQuery(theme.breakpoints.down('lg')) && <LogoImage color={theme.palette.primary.main} />}
        {!openIdForced && showEmailStep && (
          <>
            <TextField
              required
              error={!!routeError}
              label={t('userEmail')}
              name="email"
              value={email}
              autoComplete="email"
              autoFocus
              onChange={(e) => setEmail(e.target.value)}
              helperText={routeError || ''}
            />
            <Button
              onClick={handleEmailContinue}
              type="submit"
              variant="contained"
              color="secondary"
              disabled={!email.trim() || routeLoading}
            >
              {t('loginContinue')}
            </Button>
            {showRegisterLink && (
              <div className={classes.extraContainer}>
                <Link
                  onClick={goToConectyRegister}
                  className={classes.link}
                  underline="none"
                  variant="caption"
                >
                  {t('loginRegister')}
                </Link>
              </div>
            )}
            {showSocialLogin && (
              <>
                <Box sx={{ textAlign: 'center', my: 1, color: 'text.secondary' }}>— o —</Box>
                <Button
                  onClick={() => handleOpenIdLogin('google-oauth2')}
                  className={classes.googleButton}
                  startIcon={(
                    <svg className={classes.socialIcon} viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  )}
                >
                  {t('loginGoogle')}
                </Button>
                <Button
                  onClick={() => handleOpenIdLogin('apple')}
                  className={classes.appleButton}
                  startIcon={(
                    <svg className={classes.socialIcon} viewBox="0 0 24 24">
                      <path
                        fill="#ffffff"
                        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                      />
                    </svg>
                  )}
                >
                  {t('loginApple')}
                </Button>
              </>
            )}
          </>
        )}
        {!openIdForced && showNotFoundStep && (
          <>
            <TextField
              label={t('userEmail')}
              name="email"
              value={email}
              disabled
            />
            <Box sx={{ color: 'error.main', typography: 'body2' }}>
              {t('loginAccountNotFound')}
            </Box>
            <Button
              onClick={resetToEmailStep}
              variant="outlined"
              color="secondary"
            >
              {t('loginChangeEmail')}
            </Button>
            <Button
              onClick={goToConectyRegister}
              variant="contained"
              color="secondary"
            >
              {t('loginCreateAccount')}
            </Button>
          </>
        )}
        {!openIdForced && showPasswordStep && (
          <>
            {emailRouting && (
              <>
                <TextField
                  label={t('userEmail')}
                  name="email"
                  value={email}
                  disabled
                />
                <Link
                  onClick={resetToEmailStep}
                  className={classes.link}
                  underline="none"
                  variant="caption"
                >
                  {t('loginChangeEmail')}
                </Link>
              </>
            )}
            {!emailRouting && (
              <TextField
                required
                error={failed}
                label={t('userEmail')}
                name="email"
                value={email}
                autoComplete="email"
                autoFocus={!email}
                onChange={(e) => setEmail(e.target.value)}
                helperText={failed && t('loginFailed')}
              />
            )}
            <TextField
              required
              error={failed}
              label={t('userPassword')}
              name="password"
              value={password}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              autoFocus={emailRouting || !!email}
              onChange={(e) => setPassword(e.target.value)}
              helperText={failed && emailRouting ? t('loginFailed') : (failed && !emailRouting ? t('loginFailed') : '')}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                      >
                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
            {codeEnabled && (
              <TextField
                required
                error={failed}
                label={t('loginTotpCode')}
                name="code"
                value={code}
                type="number"
                onChange={(e) => setCode(e.target.value)}
              />
            )}
            <Button
              onClick={handlePasswordLogin}
              type="submit"
              variant="contained"
              color="secondary"
              disabled={!email || !password || (codeEnabled && !code)}
            >
              {t('loginLogin')}
            </Button>
            <div className={classes.extraContainer}>
              {emailEnabled && (
                <Link
                  onClick={() => navigate('/reset-password')}
                  className={classes.link}
                  underline="none"
                  variant="caption"
                >
                  {t('loginReset')}
                </Link>
              )}
            </div>
          </>
        )}
        {showSocialLogin && showPasswordStep && !emailRouting && (
          <>
            <Box sx={{ textAlign: 'center', my: 1, color: 'text.secondary' }}>— o —</Box>
            <Button
              onClick={() => handleOpenIdLogin('google-oauth2')}
              className={classes.googleButton}
              startIcon={(
                <svg className={classes.socialIcon} viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
            >
              {t('loginGoogle')}
            </Button>
            <Button
              onClick={() => handleOpenIdLogin('apple')}
              className={classes.appleButton}
              startIcon={(
                <svg className={classes.socialIcon} viewBox="0 0 24 24">
                  <path
                    fill="#ffffff"
                    d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                  />
                </svg>
              )}
            >
              {t('loginApple')}
            </Button>
          </>
        )}
        {!openIdForced && !emailRouting && (
          <div className={classes.extraContainer}>
            <Link
              onClick={goToConectyRegister}
              className={classes.link}
              underline="none"
              variant="caption"
            >
              {t('loginRegister')}
            </Link>
            {emailEnabled && (
              <Link
                onClick={() => navigate('/reset-password')}
                className={classes.link}
                underline="none"
                variant="caption"
              >
                {t('loginReset')}
              </Link>
            )}
          </div>
        )}
      </div>
      <QrCodeDialog open={showQr} onClose={() => setShowQr(false)} />
      <Snackbar
        open={!!announcement && !announcementShown}
        message={announcement}
        action={(
          <IconButton size="small" color="inherit" onClick={() => setAnnouncementShown(true)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      />
    </LoginLayout>
  );
};

export default LoginPage;
