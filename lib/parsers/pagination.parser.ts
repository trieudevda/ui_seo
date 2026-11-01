function parsePage(input: string | null) {
  if (!input || !/^[1-9]\d*$/.test(input)) return 1;
  const value = Number(input);
  return Number.isSafeInteger(value) ? value : 1;
}
function parseLimit(input: string | null) {
  const value = Number(input);
  return [10, 20, 50, 100].includes(value) ? value : 20;
}
export { parsePage, parseLimit };