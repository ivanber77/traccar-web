import { useMemo, useCallback, useState } from 'react';
import PhoneInput, {
  isValidPhoneNumber,
  isSupportedCountry,
} from 'react-phone-number-input';
import es from 'react-phone-number-input/locale/es.json';
import 'react-phone-number-input/style.css';
import './E164PhoneField.css';

const FALLBACK_COUNTRY_BY_MARKET = {
  ar: 'AR',
  uy: 'UY',
  br: 'BR',
};

function resolveDefaultCountry(marketId, defaultCountryCode) {
  const code = String(defaultCountryCode || '').trim().toUpperCase();
  if (code && isSupportedCountry(code)) return code;
  const fromMarket = FALLBACK_COUNTRY_BY_MARKET[String(marketId || '').toLowerCase()];
  if (fromMarket && isSupportedCountry(fromMarket)) return fromMarket;
  return 'AR';
}

export function validateE164Phone(value) {
  const v = String(value ?? '').trim();
  if (!v) {
    return { valid: false, message: 'El teléfono es obligatorio.' };
  }
  if (!isValidPhoneNumber(v)) {
    return { valid: false, message: 'Ingresá un número de teléfono válido con código de país.' };
  }
  return { valid: true, message: '' };
}

/**
 * Teléfono internacional con selector de país, inicializado según región/vendor.
 */
export default function E164PhoneField({
  id = 'conecty-phone',
  value,
  onChange,
  marketId,
  defaultCountryCode,
  disabled = false,
  required = false,
  label = 'Teléfono',
}) {
  const [touched, setTouched] = useState(false);

  const defaultCountry = useMemo(
    () => resolveDefaultCountry(marketId, defaultCountryCode),
    [marketId, defaultCountryCode],
  );

  const valid = !value ? false : isValidPhoneNumber(String(value));
  const showInvalid = touched && (!value || !valid);
  const message = !value
    ? 'El teléfono es obligatorio.'
    : 'Ingresá un número de teléfono válido con código de país.';

  const handleChange = useCallback((next) => {
    onChange(next || '');
  }, [onChange]);

  return (
    <div className={`e164-phone${showInvalid ? ' e164-phone--invalid' : ''}`}>
      {label ? (
        <label className="e164-phone__label" htmlFor={id}>
          {label}
          {required ? ' *' : ''}
        </label>
      ) : null}
      <PhoneInput
        key={`${marketId || 'ar'}-${defaultCountry}`}
        international
        countryCallingCodeEditable={false}
        defaultCountry={defaultCountry}
        labels={es}
        limitMaxLength
        value={value || undefined}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        disabled={disabled}
        numberInputProps={{
          id,
          // No HTML5 required: LoginLayout envuelve en <form>; al Enter no debe pelear con validación nativa.
          'aria-invalid': showInvalid,
          'aria-required': required || undefined,
        }}
      />
      {showInvalid ? (
        <div className="e164-phone__error" id={`${id}-help`}>
          {message}
        </div>
      ) : null}
    </div>
  );
}
