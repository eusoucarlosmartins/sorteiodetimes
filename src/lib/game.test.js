import {
  eloRating,
  sortPlayers,
  teamStrength,
  distributeTeams,
  balanceTeams,
  computeEloDelta,
  applyMatchResult,
  POSITIONS,
  MIN_ELO,
} from "./game";

const makePlayer = (overrides = {}) => ({
  id: 1, name: "Test", position: "MID", skill: 5, elo: 1000, wins: 0, losses: 0,
  ...overrides,
});

describe("eloRating", () => {
  test("returns base elo when skill is 5 (neutral)", () => {
    expect(eloRating(makePlayer({ elo: 1000, skill: 5 }))).toBe(1000);
  });

  test("adds 20 points per skill above 5", () => {
    expect(eloRating(makePlayer({ elo: 1000, skill: 8 }))).toBe(1060);
  });

  test("subtracts 20 points per skill below 5", () => {
    expect(eloRating(makePlayer({ elo: 1000, skill: 3 }))).toBe(960);
  });
});

describe("sortPlayers", () => {
  test("sorts by effective ELO descending", () => {
    const a = makePlayer({ id: 1, elo: 1000, skill: 5 });  // 1000
    const b = makePlayer({ id: 2, elo: 900, skill: 9 });   // 980
    const c = makePlayer({ id: 3, elo: 1100, skill: 4 });  // 1080
    const sorted = sortPlayers([a, b, c]);
    expect(sorted.map(p => p.id)).toEqual([3, 1, 2]);
  });

  test("does not mutate the input array", () => {
    const players = [
      makePlayer({ id: 1, elo: 1000 }),
      makePlayer({ id: 2, elo: 1200 }),
    ];
    const snapshot = [...players];
    sortPlayers(players);
    expect(players).toEqual(snapshot);
  });
});

describe("teamStrength", () => {
  test("sums effective ELO of all members", () => {
    const team = [
      makePlayer({ elo: 1000, skill: 5 }),  // 1000
      makePlayer({ elo: 1000, skill: 7 }),  // 1040
    ];
    expect(teamStrength(team)).toBe(2040);
  });

  test("returns 0 for empty team", () => {
    expect(teamStrength([])).toBe(0);
  });
});

describe("distributeTeams", () => {
  test("splits players without duplication or loss", () => {
    const players = POSITIONS.flatMap((pos, i) =>
      [0, 1, 2, 3].map(j => makePlayer({ id: i * 10 + j, position: pos, skill: 5 + j }))
    );
    const { teamA, teamB } = distributeTeams(players);
    const all = [...teamA, ...teamB].map(p => p.id).sort((a, b) => a - b);
    expect(all).toEqual(players.map(p => p.id).sort((a, b) => a - b));
    expect(teamA.length + teamB.length).toBe(players.length);
  });

  test("handles odd number of players per position", () => {
    const players = [
      makePlayer({ id: 1, position: "GK", skill: 7 }),
      makePlayer({ id: 2, position: "DEF", skill: 5 }),
      makePlayer({ id: 3, position: "DEF", skill: 8 }),
      makePlayer({ id: 4, position: "DEF", skill: 6 }),
    ];
    const { teamA, teamB } = distributeTeams(players);
    expect(teamA.length + teamB.length).toBe(4);
  });
});

describe("balanceTeams", () => {
  test("never increases the strength difference", () => {
    const teamA = [
      makePlayer({ id: 1, position: "MID", skill: 9, elo: 1300 }),
      makePlayer({ id: 2, position: "ATK", skill: 8, elo: 1200 }),
    ];
    const teamB = [
      makePlayer({ id: 3, position: "MID", skill: 5, elo: 1000 }),
      makePlayer({ id: 4, position: "ATK", skill: 4, elo: 950 }),
    ];
    const initialDiff = Math.abs(teamStrength(teamA) - teamStrength(teamB));
    const balanced = balanceTeams(teamA, teamB);
    const finalDiff = Math.abs(teamStrength(balanced.teamA) - teamStrength(balanced.teamB));
    expect(finalDiff).toBeLessThanOrEqual(initialDiff);
  });

  test("preserves total player count", () => {
    const teamA = [makePlayer({ id: 1, position: "GK" })];
    const teamB = [makePlayer({ id: 2, position: "GK" })];
    const balanced = balanceTeams(teamA, teamB);
    expect(balanced.teamA.length + balanced.teamB.length).toBe(2);
  });
});

describe("computeEloDelta", () => {
  test("equally matched win yields K/2 rounded", () => {
    const player = makePlayer({ elo: 1000, skill: 5 });
    const opp = [makePlayer({ id: 99, elo: 1000, skill: 5 })];
    expect(computeEloDelta(player, opp, true, 32)).toBe(16);
  });

  test("equally matched loss yields -K/2 rounded", () => {
    const player = makePlayer({ elo: 1000, skill: 5 });
    const opp = [makePlayer({ id: 99, elo: 1000, skill: 5 })];
    expect(computeEloDelta(player, opp, false, 32)).toBe(-16);
  });

  test("beating stronger opponent yields larger positive delta", () => {
    const player = makePlayer({ elo: 1000, skill: 5 });
    const strong = [makePlayer({ id: 99, elo: 1400, skill: 5 })];
    expect(computeEloDelta(player, strong, true, 32)).toBeGreaterThan(16);
  });

  test("returns 0 when no opponents", () => {
    expect(computeEloDelta(makePlayer(), [], true)).toBe(0);
  });
});

describe("applyMatchResult", () => {
  test("increments wins for winners and losses for losers", () => {
    const p1 = makePlayer({ id: 1, wins: 2, losses: 1 });
    const p2 = makePlayer({ id: 2, wins: 0, losses: 3 });
    const updated = applyMatchResult([p1, p2], [p1], [p2]);
    expect(updated[0].wins).toBe(3);
    expect(updated[0].losses).toBe(1);
    expect(updated[1].wins).toBe(0);
    expect(updated[1].losses).toBe(4);
  });

  test("does not modify uninvolved players", () => {
    const p1 = makePlayer({ id: 1 });
    const p2 = makePlayer({ id: 2 });
    const bystander = makePlayer({ id: 3, elo: 1500, wins: 10, losses: 5 });
    const updated = applyMatchResult([p1, p2, bystander], [p1], [p2]);
    expect(updated[2]).toEqual(bystander);
  });

  test("enforces the MIN_ELO floor", () => {
    const weak = makePlayer({ id: 1, elo: MIN_ELO + 1, skill: 1 });
    const strong = makePlayer({ id: 2, elo: 1600, skill: 10 });
    const updated = applyMatchResult([weak, strong], [strong], [weak]);
    expect(updated[0].elo).toBeGreaterThanOrEqual(MIN_ELO);
  });

  test("does not mutate input players", () => {
    const p1 = makePlayer({ id: 1, wins: 0 });
    const p2 = makePlayer({ id: 2, losses: 0 });
    const snapshot1 = { ...p1 };
    const snapshot2 = { ...p2 };
    applyMatchResult([p1, p2], [p1], [p2]);
    expect(p1).toEqual(snapshot1);
    expect(p2).toEqual(snapshot2);
  });
});
