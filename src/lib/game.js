export const POSITIONS = ["GK", "DEF", "MID", "ATK"];
export const POSITION_LABELS = { GK: "Goleiro", DEF: "Defensor", MID: "Meia", ATK: "Atacante" };
export const POSITION_COLORS = { GK: "#f59e0b", DEF: "#60a5fa", MID: "#34d399", ATK: "#f87171" };
export const POSITION_ICONS = { GK: "🧤", DEF: "🛡️", MID: "⚙️", ATK: "⚡" };

export const K_FACTOR = 32;
export const MIN_ELO = 800;
export const BALANCE_ITERATIONS = 200;

export function eloRating(player) {
  return Math.round(player.elo + (player.skill - 5) * 20);
}

export function sortPlayers(players) {
  return [...players].sort((a, b) => eloRating(b) - eloRating(a));
}

export function teamStrength(team) {
  return team.reduce((sum, p) => sum + eloRating(p), 0);
}

export function distributeTeams(confirmed) {
  const byPosition = {};
  POSITIONS.forEach(p => { byPosition[p] = []; });
  confirmed.forEach(p => byPosition[p.position].push(p));
  const teamA = [], teamB = [];
  POSITIONS.forEach(pos => {
    const group = sortPlayers(byPosition[pos]);
    for (let i = 0; i < group.length; i += 2) {
      const pair = [group[i], group[i + 1]].filter(Boolean);
      if (pair.length === 2) {
        if (Math.random() < 0.5) { teamA.push(pair[0]); teamB.push(pair[1]); }
        else { teamA.push(pair[1]); teamB.push(pair[0]); }
      } else if (pair.length === 1) {
        (teamA.length <= teamB.length ? teamA : teamB).push(pair[0]);
      }
    }
  });
  return { teamA, teamB };
}

export function balanceTeams(teamA, teamB, iterations = BALANCE_ITERATIONS) {
  let best = { teamA: [...teamA], teamB: [...teamB] };
  let bestDiff = Math.abs(teamStrength(teamA) - teamStrength(teamB));
  for (let iter = 0; iter < iterations; iter++) {
    const a = [...best.teamA], b = [...best.teamB];
    if (a.length === 0 || b.length === 0) break;
    const ia = Math.floor(Math.random() * a.length);
    const candidates = b.filter(p => p.position === a[ia].position);
    if (candidates.length === 0) continue;
    const ib = b.indexOf(candidates[Math.floor(Math.random() * candidates.length)]);
    [a[ia], b[ib]] = [b[ib], a[ia]];
    const diff = Math.abs(teamStrength(a) - teamStrength(b));
    if (diff < bestDiff) { bestDiff = diff; best = { teamA: a, teamB: b }; }
  }
  return best;
}

export function computeEloDelta(player, opponents, didWin, k = K_FACTOR) {
  if (opponents.length === 0) return 0;
  const avgOpponent = opponents.reduce((s, o) => s + eloRating(o), 0) / opponents.length;
  const expected = 1 / (1 + Math.pow(10, (avgOpponent - eloRating(player)) / 400));
  return Math.round(k * ((didWin ? 1 : 0) - expected));
}

export function applyMatchResult(players, winners, losers, k = K_FACTOR) {
  const winnerIds = new Set(winners.map(w => w.id));
  const loserIds = new Set(losers.map(l => l.id));
  return players.map(p => {
    const isWinner = winnerIds.has(p.id);
    const isLoser = loserIds.has(p.id);
    if (!isWinner && !isLoser) return p;
    const delta = computeEloDelta(p, isWinner ? losers : winners, isWinner, k);
    return {
      ...p,
      elo: Math.max(MIN_ELO, p.elo + delta),
      wins: p.wins + (isWinner ? 1 : 0),
      losses: p.losses + (isLoser ? 1 : 0),
    };
  });
}
