const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
});

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatDate(value) {
  if (!value) {
    return 'Chưa có';
  }

  return dateFormatter.format(new Date(value));
}

export function formatDateTime(value) {
  if (!value) {
    return 'Chưa có';
  }

  return dateTimeFormatter.format(new Date(value));
}

export function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}
