const AUTH_ERROR_MESSAGES: Array<[string, string]> = [
  ['invalid login credentials', 'Email o contrasena incorrectos. Revisa tus datos e intenta nuevamente.'],
  ['email not confirmed', 'Tu cuenta todavia no fue confirmada. Revisa tu correo y vuelve a intentar.'],
  ['user already registered', 'Ya existe una cuenta con ese email. Puedes iniciar sesion o recuperar tu contrasena.'],
  ['password should be at least', 'La contrasena debe tener al menos 6 caracteres.'],
  ['network request failed', 'No pudimos conectarnos. Verifica tu conexion e intenta nuevamente.'],
  ['unable to validate email address', 'El formato del email no es valido.'],
  ['auth session missing', 'Tu sesion de recuperacion ya no es valida. Solicita un nuevo enlace.'],
  ['same password', 'Elige una contrasena diferente a la anterior.'],
];

const FALLBACK_ERROR_MESSAGE = 'Ocurrio un problema inesperado. Intenta nuevamente en unos segundos.';

export const getAuthErrorMessage = (
  error: unknown,
  fallbackMessage = FALLBACK_ERROR_MESSAGE,
) => {
  const rawMessage =
    typeof error === 'string'
      ? error
      : typeof error === 'object' &&
          error !== null &&
          'message' in error &&
          typeof error.message === 'string'
        ? error.message
        : '';

  const normalizedMessage = rawMessage.trim().toLowerCase();

  for (const [matcher, friendlyMessage] of AUTH_ERROR_MESSAGES) {
    if (normalizedMessage.includes(matcher)) {
      return friendlyMessage;
    }
  }

  return fallbackMessage;
};
