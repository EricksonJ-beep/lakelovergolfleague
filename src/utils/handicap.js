export function differentialFromRound(gross, par = 36) {
  // league uses simple differential = gross - par for 9-hole
  return gross - par;
}

export function computeHandicap9FromDifferentials(differentials = []) {
  // take up to last 20, best 5 average; pad with 0s (par) until 5
  const last = differentials.slice(0, 20);
  while (last.length < 5) last.push(0);
  const best5 = last
    .slice()
    .sort((a, b) => a - b)
    .slice(0, 5);
  const avg = best5.reduce((s, v) => s + v, 0) / 5;
  return Number(avg.toFixed(1));
}
