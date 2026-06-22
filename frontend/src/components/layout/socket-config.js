export function resolveNotificationSocketUrl(env = import.meta.env) {
  return env.VITE_SOCKET_URL
    ?? (env.VITE_API_BASE_URL ?? 'http://localhost:3000/api').replace(/\/api\/?$/, '');
}
