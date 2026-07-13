import { useEffect, useMemo, useState } from 'react';
import {
  Box, Button, IconButton, MenuItem, TextField, Typography, Alert,
} from '@mui/material';
import { makeStyles } from 'tss-react/mui';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LoginLayout from './LoginLayout';
import BackIcon from '../common/components/BackIcon';
import { useTranslation } from '../common/components/LocalizationProvider';
import { resolveOidcHost } from './conectyAuthRouting';

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
  const apiBase = useMemo(() => resolveOidcHost('ar').replace(/\/$/, ''), []);

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
  const [channel, setChannel] = useState('email');
  const [codeSent, setCodeSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setVendorsLoading(true);
      setError('');
      try {
        const response = await fetch(`${apiBase}/api/cotrack/vendors`);
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
  }, [apiBase]);

  const updateField = (name) => (event) => {
    setForm((prev) => ({ ...prev, [name]: event.target.value }));
  };

  const handleSignup = async (event) => {
    event.preventDefault();
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
      const response = await fetch(`${apiBase}/api/cotrack/signup`, {
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
        const messages = {
          EMAIL_EXISTS: 'Ese email ya está registrado.',
          INVALID_PHONE: 'Teléfono inválido. Usá formato internacional, ej. +54911...',
          WHMCS_NOT_CONFIGURED: 'El registro no está disponible en este momento.',
        };
        throw new Error(messages[json.error] || 'No pudimos iniciar el registro.');
      }
      setSession(json);
      setStep(STEPS.VERIFY);
      setCodeSent(false);
    } catch (err) {
      setError(err.message || 'Error de conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!session?.verificationId || !channel) return;
    setError('');
    setLoading(true);
    try {
      const destination = channel === 'email'
        ? String(session.email || form.email).trim().toLowerCase()
        : String(session.phonenumber || form.phonenumber).trim();
      const response = await fetch(`${apiBase}/api/cotrack/verification/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: session.verificationId,
          channel,
          destination,
          resend: codeSent,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) {
        throw new Error(json.error || 'No pudimos enviar el código.');
      }
      setCodeSent(true);
      setStatus('Código enviado. Revisá tu bandeja o mensajes.');
    } catch (err) {
      setError(err.message || 'No pudimos enviar el código.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    if (!session?.verificationId || !code.trim()) return;
    setError('');
    setLoading(true);
    try {
      const destination = channel === 'email'
        ? String(session.email || form.email).trim().toLowerCase()
        : String(session.phonenumber || form.phonenumber).trim();
      const response = await fetch(`${apiBase}/api/cotrack/verification/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationId: session.verificationId,
          channel,
          destination,
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
          <>
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
                  variant={selected ? 'contained' : 'outlined'}
                  color="secondary"
                  onClick={() => setVendor(item)}
                >
                  {item.displayTitle || item.marketName || item.label}
                </Button>
              );
            })}
            <Button
              variant="contained"
              color="secondary"
              disabled={!vendor}
              onClick={() => setStep(STEPS.FORM)}
            >
              Continuar
            </Button>
          </>
        )}

        {step === STEPS.FORM && (
          <Box component="form" className={classes.container} onSubmit={handleSignup}>
            <Button size="small" onClick={() => setStep(STEPS.VENDOR)}>Cambiar región</Button>
            <TextField required label="Nombre" value={form.firstname} onChange={updateField('firstname')} autoComplete="given-name" />
            <TextField required label="Apellido" value={form.lastname} onChange={updateField('lastname')} autoComplete="family-name" />
            <TextField required type="email" label={t('userEmail')} value={form.email} onChange={updateField('email')} autoComplete="email" />
            <TextField
              required
              label="Teléfono"
              value={form.phonenumber}
              onChange={updateField('phonenumber')}
              placeholder="+54911..."
              helperText="Formato internacional con +"
              autoComplete="tel"
            />
            <TextField required type="password" label={t('userPassword')} value={form.password} onChange={updateField('password')} autoComplete="new-password" />
            <TextField required type="password" label="Confirmar contraseña" value={form.passwordConfirm} onChange={updateField('passwordConfirm')} autoComplete="new-password" />
            <Button type="submit" variant="contained" color="secondary" disabled={loading}>
              {loading ? 'Enviando...' : 'Continuar'}
            </Button>
          </Box>
        )}

        {step === STEPS.VERIFY && (
          <Box component="form" className={classes.container} onSubmit={handleVerify}>
            <Typography variant="body2">Verificá tu cuenta para terminar el registro.</Typography>
            <TextField
              select
              label="Canal"
              value={channel}
              onChange={(e) => {
                setChannel(e.target.value);
                setCodeSent(false);
              }}
            >
              <MenuItem value="email">Email</MenuItem>
              <MenuItem value="phone">SMS</MenuItem>
            </TextField>
            <Button variant="outlined" color="secondary" disabled={loading} onClick={handleSendCode}>
              {codeSent ? 'Reenviar código' : 'Enviar código'}
            </Button>
            <TextField
              required
              label="Código"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputProps={{ inputMode: 'numeric' }}
            />
            <Button type="submit" variant="contained" color="secondary" disabled={loading || !codeSent || !code.trim()}>
              {loading ? 'Verificando...' : 'Crear cuenta'}
            </Button>
            <Button onClick={() => setStep(STEPS.FORM)}>Volver</Button>
          </Box>
        )}
      </div>
    </LoginLayout>
  );
};

export default ConectyRegisterPage;
