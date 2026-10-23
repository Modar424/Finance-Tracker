// Returns the last 12 month keys (YYYY-MM) ending with the month of `todayStr` (YYYY-MM-DD).
function monthKeys(todayStr, count = 12) {
  const [y, m] = todayStr.split('-').map(Number);
  const keys = [];
  for (let i = count - 1; i >= 0; i--) {
    keys.push(new Date(Date.UTC(y, m - 1 - i, 1)).toISOString().slice(0, 7));
  }
  return keys;
}

module.exports = { monthKeys };
