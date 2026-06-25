export function getApiErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.error?.message ?? fallbackMessage;
}
