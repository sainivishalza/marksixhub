function money(hkd, cur) {
  const amount = Math.round(Number(hkd) * Number(cur.rate));
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency: cur.code, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${cur.code} ${amount.toLocaleString('en')}`;
  }
}

function date(str) {
  if (!str) return '';
  return new Date(`${str}T00:00:00Z`).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

module.exports = { money, date };
