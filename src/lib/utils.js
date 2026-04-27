export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

export const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

export const formatDate = (date) => {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatBookingDate = (value) => {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value || '';
  }

  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const day = date.getDate();
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const year = date.getFullYear();

  return `${weekday}. ${day} ${month}, ${year}`;
};

export const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatCompactTime = (time) => {
  if (!time) return '';

  const [hourRaw, minuteRaw = '0'] = String(time).split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return String(time);
  }

  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  const minuteLabel = minute === 0 ? '' : `:${String(minute).padStart(2, '0')}`;

  return `${hour12}${minuteLabel}${period}`;
};

export const formatCompactTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) return '';

  const startLabel = formatCompactTime(startTime);
  const endLabel = formatCompactTime(endTime);

  if (!startLabel || !endLabel) return '';

  const startPeriod = startLabel.slice(-2);
  const endPeriod = endLabel.slice(-2);
  const compactStart = startPeriod === endPeriod ? startLabel.slice(0, -2) : startLabel;

  const compactEnd = endLabel.slice(0, -2);
  return `${compactStart}-${compactEnd} ${endPeriod}`;
};

export const isSameDay = (d1, d2) => {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
};

export const isDateInRange = (date, start, end) => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const s = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
  const e = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
  return d >= s && d <= e;
};

export const normalizePhone = (value = '') => {
  const digits = String(value).replace(/\D/g, '');

  if (!digits) return '';
  if (digits.startsWith('63') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('9') && digits.length === 10) return `0${digits}`;
  return digits;
};
