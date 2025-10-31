// Match scoring and pairing utilities for 9-hole, 2-player team matches
// Assumptions made:
// - Each team provides two players (array length 2). If more/fewer are provided,
//   pair by index after sorting by handicap.
// - Handicaps are 9-hole handicaps as a single number (can be decimal).
// - We distribute integer handicap strokes across the 9 holes by rounding the
//   handicap to nearest integer, then giving base = floor(strokes/9) to every
//   hole and +1 to the first (strokes % 9) holes (since we don't have hole
//   stroke index data). This is a reasonable approximation for local league use.
// - No-show handling: if a player has no hole scores (null/undefined or empty
//   array), they forfeit their 10 points to the opponent for that pairing.

function distributeStrokes(handicap) {
  const strokes = Math.max(0, Math.round(Number(handicap) || 0));
  const base = Math.floor(strokes / 9);
  const rem = strokes % 9;
  const arr = Array.from({ length: 9 }, (_, i) => base + (i < rem ? 1 : 0));
  return arr;
}

function computeNetHoleScores(holeScores = [], handicap = 0) {
  // holeScores: array of 9 integers (gross per hole)
  // returns array of 9 net hole scores (gross - strokes allocated)
  const strokes = distributeStrokes(handicap);
  const nets = Array.from({ length: 9 }, (_, i) => {
    const gross = Number(holeScores && holeScores[i]) || 0;
    return gross - strokes[i];
  });
  return nets;
}

function compareHole(aNet, bNet) {
  if (aNet < bNet) return { a: 1, b: 0 };
  if (aNet > bNet) return { a: 0, b: 1 };
  return { a: 0.5, b: 0.5 };
}

function computePairPoints(playerA, playerB, holeScoresById, handicapsById) {
  const aScores = holeScoresById[playerA.id];
  const bScores = holeScoresById[playerB.id];

  // Handle no-shows: if one player has no scores, opponent gets 10 points
  const aNoShow = !Array.isArray(aScores) || aScores.length === 0;
  const bNoShow = !Array.isArray(bScores) || bScores.length === 0;
  if (aNoShow && bNoShow) {
    return {
      playerA: {
        id: playerA.id,
        holeNet: [],
        holePoints: 0,
        totalNet: 0,
        points: 0,
        noShow: true,
      },
      playerB: {
        id: playerB.id,
        holeNet: [],
        holePoints: 0,
        totalNet: 0,
        points: 0,
        noShow: true,
      },
    };
  }
  if (aNoShow) {
    return {
      playerA: {
        id: playerA.id,
        holeNet: [],
        holePoints: 0,
        totalNet: 0,
        points: 0,
        noShow: true,
      },
      playerB: {
        id: playerB.id,
        holeNet: [],
        holePoints: 0,
        totalNet: 0,
        points: 10,
        noShow: false,
      },
    };
  }
  if (bNoShow) {
    return {
      playerA: {
        id: playerA.id,
        holeNet: [],
        holePoints: 0,
        totalNet: 0,
        points: 10,
        noShow: false,
      },
      playerB: {
        id: playerB.id,
        holeNet: [],
        holePoints: 0,
        totalNet: 0,
        points: 0,
        noShow: true,
      },
    };
  }

  const aHandicap = Number(handicapsById[playerA.id] || 0);
  const bHandicap = Number(handicapsById[playerB.id] || 0);

  const aNet = computeNetHoleScores(aScores, aHandicap);
  const bNet = computeNetHoleScores(bScores, bHandicap);

  let aHolePoints = 0;
  let bHolePoints = 0;
  for (let i = 0; i < 9; i++) {
    const comp = compareHole(aNet[i], bNet[i]);
    aHolePoints += comp.a;
    bHolePoints += comp.b;
  }

  const aTotalNet = aNet.reduce((s, v) => s + v, 0);
  const bTotalNet = bNet.reduce((s, v) => s + v, 0);
  let aTotalPoint = 0;
  let bTotalPoint = 0;
  if (aTotalNet < bTotalNet) aTotalPoint = 1;
  else if (aTotalNet > bTotalNet) bTotalPoint = 1;
  else {
    aTotalPoint = 0.5;
    bTotalPoint = 0.5;
  }

  const playerAResult = {
    id: playerA.id,
    holeNet: aNet,
    holePoints: Number(aHolePoints.toFixed(1)),
    totalNet: aTotalNet,
    points: Number((aHolePoints + aTotalPoint).toFixed(1)),
    noShow: false,
  };

  const playerBResult = {
    id: playerB.id,
    holeNet: bNet,
    holePoints: Number(bHolePoints.toFixed(1)),
    totalNet: bTotalNet,
    points: Number((bHolePoints + bTotalPoint).toFixed(1)),
    noShow: false,
  };

  return { playerA: playerAResult, playerB: playerBResult };
}

export function pairPlayersByHandicap(players = []) {
  // Return players sorted by handicap ascending (lower is better).
  return players.slice().sort((a, b) => (a.handicap || 0) - (b.handicap || 0));
}

export function computeMatchResult(
  teamA = { id: null, players: [] },
  teamB = { id: null, players: [] },
  holeScoresById = {},
  handicapsById = {}
) {
  // Each team.players should be array of player objects { id, name }
  const aSorted = pairPlayersByHandicap(teamA.players || []);
  const bSorted = pairPlayersByHandicap(teamB.players || []);

  // ensure we have two slots; if a team has fewer players, fill with placeholders
  while (aSorted.length < 2)
    aSorted.push({ id: `__bye-${aSorted.length}`, name: "BYE" });
  while (bSorted.length < 2)
    bSorted.push({ id: `__bye-${bSorted.length}`, name: "BYE" });

  const pairs = [];
  let teamAScore = 0;
  let teamBScore = 0;

  for (let i = 0; i < 2; i++) {
    const pA = aSorted[i];
    const pB = bSorted[i];
    const res = computePairPoints(pA, pB, holeScoresById, handicapsById);
    pairs.push({
      playerAId: pA.id,
      playerBId: pB.id,
      playerA: res.playerA,
      playerB: res.playerB,
    });
    teamAScore += res.playerA.points || 0;
    teamBScore += res.playerB.points || 0;
  }

  // Clamp to 20 max (floating rounding may create 20.0)
  teamAScore = Number(teamAScore.toFixed(1));
  teamBScore = Number(teamBScore.toFixed(1));

  return {
    date: new Date().toISOString(),
    teamAId: teamA.id,
    teamBId: teamB.id,
    pairs,
    teamAScore,
    teamBScore,
  };
}

// Small helper to extract handicaps map from player list
export function handicapsFromPlayers(players = []) {
  return Object.fromEntries(
    (players || []).map((p) => [p.id, p.currentHandicap9 ?? p.handicap ?? 0])
  );
}

export default {
  computeMatchResult,
  pairPlayersByHandicap,
  computePairPoints,
  handicapsFromPlayers,
};
