import { useEffect, useState } from 'react';
import {
  Button, IconButton, TextField, Typography, Alert,
} from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import SmartphoneIcon from '@mui/icons-material/Smartphone';
import { makeStyles } from 'tss-react/mui';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoginLayout from './LoginLayout';
import BackIcon from '../common/components/BackIcon';
import { useTranslation } from '../common/components/LocalizationProvider';
import { conectyApiUrl } from './conectyAuthRouting';
import E164PhoneField, { validateE164Phone } from './E164PhoneField';

function maskEmail(email) {
  const [local, domain] = String(email || '').split('@');
  if (!domain) return email || '';
  return `${local.slice(0, 1)}***@${domain}`;
}

function maskPhone(phone) {
  const digits = String(phone || '').replace(/\s/g, '');
  if (digits.length < 6) return phone || '';
  return `${digits.slice(0, 3)} *** ***-${digits.slice(-4)}`;
}

const SMS_RESEND_COOLDOWN_SEC = 60;

const useStyles = makeStyles()((theme) => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(2),
  },
  header: {
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    fontSize: theme.spacing(3),
    fontWeight: 500,
    marginLeft: theme.spacing(1),
  },
  hint: {
    color: theme.palette.text.secondary,
  },
  sectionLabel: {
    fontWeight: 600,
    fontSize: '0.875rem',
  },
  pathOption: {
    display: 'block',
    padding: theme.spacing(1.75, 2),
    border: `1.5px solid ${theme.palette.divider}`,
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'border-color 0.15s ease, background 0.15s ease',
    '&:hover': {
      borderColor: theme.palette.secondary.light,
    },
  },
  pathOptionSelected: {
    borderColor: theme.palette.secondary.main,
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(255,255,255,0.06)'
      : 'rgba(153, 246, 2, 0.08)',
  },
  pathOptionDisabled: {
    opacity: 0.6,
    pointerEvents: 'none',
  },
  pathRadio: {
    position: 'absolute',
    opacity: 0,
    pointerEvents: 'none',
  },
  pathTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    fontWeight: 600,
    fontSize: '0.9375rem',
    marginBottom: 4,
  },
  pathDesc: {
    margin: 0,
    fontSize: '0.8125rem',
    color: theme.palette.text.secondary,
    lineHeight: 1.4,
  },
  otpInput: {
    '& input': {
      textAlign: 'center',
      fontSize: '1.375rem',
      fontWeight: 600,
      letterSpacing: '0.35em',
    },
  },
}));

const STEPS = {
  VENDOR: 'vendor',
  FORM: 'form',
  VERIFY: 'verify',
};

/**
 * Registro Conecty dentro del mismo origen (cotrack.conecty.io).
 * En la app nativa, navegar a conecty.com.ar abre otra pantalla/navegador;
 * llamar las APIs por CORS mantiene el flujo en el WebView.
 */
const ConectyRegisterPage = () => {
  const { classes } = useStyles();
  const navigate = useNavigate();
  const t = useTranslation();
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(STEPS.VENDOR);
  const [vendors, setVendors] = useState([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [session, setSession] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const [form, setForm] = useState({
    firstname: '',
    lastname: '',
    email: searchParams.get('email') || '',
    phonenumber: '',
    password: '',
    passwordConfirm: '',
  });
  const [code, setCode] = useState('');
  const [channel, setChannel] = useState(null);
  const [codeSent, setCodeSent] = useState(false);
  const [resentNotice, setResentNotice] = useState(false);
  const [smsResendCooldownSec, setSmsResendCooldownSec] = useState(0);
  const [devCode, setDevCode] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setVendorsLoading(true);
      setError('');
      try {
        const response = await fetch(conectyApiUrl('/api/cotrack/vendors'));
        const json = await response.json();
        if (!response.ok || !json.ok) {
          throw new Error(json.error || 'LOAD_FAILED');
        }
        if (!cancelled) {
          setVendors(json.vendors || []);
          if (json.vendors?.length === 1) {
            setVendor(json.vendors[0]);
            setStep(STEPS.FORM);
          }
        }
      } catch {
        if (!cancelled) {
          setError('No pudimos cargar las opciones de registro.');
        }
      } finally {
        if (!cancelled) {
          setVendorsLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (smsResendCooldownSec <= 0) return undefined;
    const timer = window.setInterval(() => {
      setSmsResendCooldownSec((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [smsResendCooldownSec]);

  const updateField = (name) => (event) => {
    setForm((prev) => ({ ...prev, [name]: event.target.value }));
  };

  const resolveDestination = (activeChannel) => (
    activeChannel === 'email'
      ? String(session?.email || form.email).trim().toLowerCase()
      : String(session?.phonenumber || form.phonenumber).trim()
  );

  const resolveMaskedDestination = (activeChannel) => (
    activeChannel === 'email'
      ? maskEmail(session?.email || form.email)
      : maskPhone(session?.phonenumber || form.phonenumber)
  );

  const goToExistingLogin = ({ email: emailOverride } = {}) => {
    const params = new URLSearchParams();
    params.set('existing', '1');
    const email = String(emailOverride || form.email).trim().toLowerCase();
    if (email) {
      params.set('email', email);
    }
    if (vendor?.market) {
      params.set('market', vendor.market);
    }
    if (vendor?.vendor_id) {
      params.set('vendor_id', vendor.vendor_id);
    }
    if (vendor?.slug) {
      params.set('vendor_slug', vendor.slug);
    }
    navigate(`/login?${params.toString()}`, { replace: true });
  };

  const handleSignup = async (event) => {
    event?.preventDefault?.();
    setError('');
    const firstname = form.firstname.trim();
    const lastname = form.lastname.trim();
    const email = form.email.trim().toLowerCase();
    const phonenumber = form.phonenumber.trim();
    const { password, passwordConfirm } = form;

    if (!vendor) {
      setError('Seleccioná una región.');
      return;
    }
    if (!firstname || !lastname || !email || !phonenumber) {
      setError('Completá todos los campos obligatorios.');
      return;
    }
    if (!validateE164Phone(phonenumber).valid) {
      setError(validateE164Phone(phonenumber).message);
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== passwordConfirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(conectyApiUrl('/api/cotrack/signup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_id: vendor.vendor_id,
          vendor_slug: vendor.slug,
          firstname,
          lastname,
          email,
          phonenumber,
          password,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        if (json.error === 'EMAIL_EXISTS') {
          goToExistingLogin({ email });
          return;
        }
        const messages = {
          INVALID_PHONE: 'Teléfono inválido. Usá formato internacional, ej. +54911...',
          WHMCS_NOT_CONFIGURED: 'El registro no está disponible en este momento.',
        };
        throw new Error(messages[json.error] || 'No pudimos iniciar el registro.');
      }
      setSession(json);
      setStep(STEPS.VERIFY);
      setChannel(null);
      setCode('');
      setCodeSent(false);
      setResentNotice(false);
      setSmsResendCooldownSec(0);
      setDevCode('');
      setStatus('');
    } catch (err) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async ({ isResend = false, activeChannel } = {}) => {
    const sendChannel = activeChannel || channel;
    if (!session?.verificationId || !sendChannel) return;
    setError('');
    setResentNotice(false);
    setLoading(true);
    try {
      const response = await fetch(conectyApiUrl('/api/cotrack/verification/send'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: session.verificationId,
          channel: sendChannel,
          destination: resolveDestination(sendChannel),
          resend: isResend,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        if (json.error === 'SMS_RESEND_COOLDOWN' && json.retryAfterSec) {
          setSmsResendCooldownSec(json.retryAfterSec);
          throw new Error(`Podés reenviar el SMS en ${json.retryAfterSec} s.`);
        }
        throw new Error(json.error || 'No pudimos enviar el código.');
      }
      setCodeSent(true);
      setDevCode(json.devCode || '');
      if (sendChannel === 'phone') {
        setSmsResendCooldownSec(SMS_RESEND_COOLDOWN_SEC);
      }
      if (isResend) {
        setCode('');
        setResentNotice(true);
      }
      setStatus('');
    } catch (err) {
      setError(err.message || 'No pudimos enviar el código.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectChannel = async (nextChannel) => {
    if (nextChannel === channel || loading) return;
    setChannel(nextChannel);
    setCode('');
    setDevCode('');
    setError('');
    setResentNotice(false);
    setCodeSent(false);
    setSmsResendCooldownSec(0);
    setStatus('');
    await handleSendCode({ activeChannel: nextChannel });
  };

  const handleVerify = async (event) => {
    event?.preventDefault?.();
    if (!session?.verificationId || !channel) return;
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Ingresá un código de 6 dígitos.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await fetch(conectyApiUrl('/api/cotrack/verification/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: session.verificationId,
          channel,
          destination: resolveDestination(channel),
          code: code.trim(),
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || 'Código inválido.');
      }
      if (json.handoffUrl) {
        // Misma origen (cotrack.conecty.io) → se queda en el WebView de la app.
        window.location.assign(json.handoffUrl);
        return;
      }
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'No pudimos verificar el código.');
    } finally {
      setLoading(false);
    }
  };

  const maskedDestination = channel ? resolveMaskedDestination(channel) : '';
  const smsResendBlocked = channel === 'phone' && smsResendCooldownSec > 0;
  const destinationHint = loading && channel && !codeSent
    ? `Enviando un código a ${maskedDestination}…`
    : resentNotice
      ? `Te enviamos un código nuevo a ${maskedDestination}.`
      : codeSent
        ? `Enviamos un código a ${maskedDestination}.`
        : '';
  const resendLabel = smsResendBlocked
    ? `Reenviar SMS en ${smsResendCooldownSec} s`
    : loading
      ? 'Enviando...'
      : 'Reenviar código';


  return (
    <LoginLayout>
      <div className={classes.container}>
        <div className={classes.header}>
          <IconButton color="primary" onClick={() => navigate('/login')}>
            <BackIcon />
          </IconButton>
          <Typography className={classes.title} color="primary">
            {t('loginRegister')}
          </Typography>
        </div>

        {error && <Alert severity="error">{error}</Alert>}
        {status && !error && <Alert severity="info">{status}</Alert>}

        {step === STEPS.VENDOR && (
          <div className={classes.container}>
            <Typography variant="body2">Seleccioná tu región</Typography>
            {vendorsLoading && <Typography variant="body2">Cargando...</Typography>}
            {!vendorsLoading && vendors.map((item) => {
              const key = item.vendor_id || item.slug || item.market;
              const selected = vendor && (
                (item.vendor_id && vendor.vendor_id === item.vendor_id)
                || (item.slug && vendor.slug === item.slug && vendor.market === item.market)
              );
              return (
                <Button
                  key={key}
                  type="button"
                  variant={selected ? 'contained' : 'outlined'}
                  color="secondary"
                  onClick={() => {
                    setVendor(item);
                    setForm((prev) => ({ ...prev, phonenumber: '' }));
                  }}
                >
                  {item.displayTitle || item.marketName || item.label}
                </Button>
              );
            })}
            <Button
              type="button"
              variant="contained"
              color="secondary"
              disabled={!vendor}
              onClick={() => setStep(STEPS.FORM)}
            >
              Continuar
            </Button>
          </div>
        )}

        {/* No anidar <form>: LoginLayout ya envuelve en form; HTML ignora forms anidados y el submit recarga → vuelve al paso región. */}
        {step === STEPS.FORM && (
          <div className={classes.container}>
            <Button type="button" size="small" onClick={() => setStep(STEPS.VENDOR)}>Cambiar región</Button>
            <TextField required label="Nombre" value={form.firstname} onChange={updateField('firstname')} autoComplete="given-name" />
            <TextField required label="Apellido" value={form.lastname} onChange={updateField('lastname')} autoComplete="family-name" />
            <TextField required type="email" label={t('userEmail')} value={form.email} onChange={updateField('email')} autoComplete="email" />
            <E164PhoneField
              required
              label="Teléfono"
              value={form.phonenumber}
              onChange={(value) => setForm((prev) => ({ ...prev, phonenumber: value }))}
              marketId={vendor?.market}
              defaultCountryCode={vendor?.country}
            />
            <TextField required type="password" label={t('userPassword')} value={form.password} onChange={updateField('password')} autoComplete="new-password" />
            <TextField required type="password" label="Confirmar contraseña" value={form.passwordConfirm} onChange={updateField('passwordConfirm')} autoComplete="new-password" />
            <Button type="button" variant="contained" color="secondary" disabled={loading} onClick={handleSignup}>
              {loading ? 'Enviando...' : 'Continuar'}
            </Button>
          </div>
        )}

        {step === STEPS.VERIFY && (
          <div className={classes.container}>
            <Typography variant="body2" className={classes.hint}>
              Para crear tu cuenta necesitamos validar tus datos. Si algo no está bien, podés corregirlo antes de continuar.
            </Typography>
            <Button type="button" size="small" onClick={() => setStep(STEPS.FORM)}>
              Volver al formulario
            </Button>

            <Typography className={classes.sectionLabel}>
              ¿Cómo preferís recibir el código?
            </Typography>

            <label
              className={[
                classes.pathOption,
                channel === 'email' ? classes.pathOptionSelected : '',
                loading ? classes.pathOptionDisabled : '',
              ].filter(Boolean).join(' ')}
            >
              <input
                className={classes.pathRadio}
                type="radio"
                name="verifyChannel"
                value="email"
                checked={channel === 'email'}
                disabled={loading}
                onChange={() => handleSelectChannel('email')}
              />
              <div className={classes.pathTitle}>
                <MailOutlineIcon fontSize="small" />
                Por email
              </div>
              <p className={classes.pathDesc}>{maskEmail(session?.email || form.email)}</p>
            </label>

            <label
              className={[
                classes.pathOption,
                channel === 'phone' ? classes.pathOptionSelected : '',
                loading ? classes.pathOptionDisabled : '',
              ].filter(Boolean).join(' ')}
            >
              <input
                className={classes.pathRadio}
                type="radio"
                name="verifyChannel"
                value="phone"
                checked={channel === 'phone'}
                disabled={loading}
                onChange={() => handleSelectChannel('phone')}
              />
              <div className={classes.pathTitle}>
                <SmartphoneIcon fontSize="small" />
                Por SMS
              </div>
              <p className={classes.pathDesc}>{maskPhone(session?.phonenumber || form.phonenumber)}</p>
            </label>

            {channel && codeSent ? (
              <>
                {destinationHint && (
                  <Typography variant="body2" className={classes.hint}>{destinationHint}</Typography>
                )}
                {resentNotice && (
                  <Typography variant="body2" className={classes.hint}>
                    Usá el último código recibido. Los anteriores ya no sirven.
                  </Typography>
                )}
                <TextField
                  required
                  className={classes.otpInput}
                  label="Código de verificación"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputProps={{
                    inputMode: 'numeric',
                    autoComplete: 'one-time-code',
                    maxLength: 6,
                  }}
                />
                {devCode ? (
                  <Typography variant="caption" className={classes.hint}>
                    Dev code: {devCode}
                  </Typography>
                ) : null}
                <Button
                  type="button"
                  variant="contained"
                  color="secondary"
                  disabled={loading || !/^\d{6}$/.test(code.trim())}
                  onClick={handleVerify}
                >
                  {loading ? 'Verificando y creando cuenta...' : 'Verificar y crear cuenta'}
                </Button>
                <Button
                  type="button"
                  disabled={loading || smsResendBlocked}
                  onClick={() => handleSendCode({ isResend: true })}
                >
                  {resendLabel}
                </Button>
              </>
            ) : null}

            {channel && loading && !codeSent && destinationHint ? (
              <Typography variant="body2" className={classes.hint}>{destinationHint}</Typography>
            ) : null}
          </div>
        )}

      </div>
    </LoginLayout>
  );
};

export default ConectyRegisterPage;
