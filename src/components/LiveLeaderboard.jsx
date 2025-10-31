import React, { useEffect, useState } from "react";
import firebase from "../firebase";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch (e) {
    return iso;
  }
}

export default function LiveLeaderboard() {
  const [rounds, setRounds] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [openMatchId, setOpenMatchId] = useState(null);

  useEffect(() => {
    const unsubRounds = firebase.subscribeToRounds(setRounds, { limit: 200 });
    const unsubPlayers = firebase.subscribeToPlayers(setPlayers);
    const unsubTeams = firebase.subscribeToTeams(setTeams);
    const unsubMatches = firebase.subscribeToMatches(setMatches, {
      limit: 100,
    });

    return () => {
      try {
        unsubRounds && unsubRounds();
      } catch (e) {}
      try {
        unsubPlayers && unsubPlayers();
      } catch (e) {}
      try {
        unsubTeams && unsubTeams();
      } catch (e) {}
      try {
        unsubMatches && unsubMatches();
      } catch (e) {}
    };
  }, []);

  // map player id -> player
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const teamMap = Object.fromEntries(teams.map((t) => [t.id, t]));

  // Simple team aggregate: sum of differentials (lower is better)
  const teamAgg = {};
  for (const r of rounds) {
    const p = playerMap[r.playerId];
    const teamId = p ? p.teamId : null;
    if (!teamId) continue;
    teamAgg[teamId] =
      (teamAgg[teamId] || 0) +
      (typeof r.differential === "number"
        ? r.differential
        : r.grossScore - (r.coursePar || 36));
  }

  const teamRanking = Object.entries(teamAgg)
    .map(([teamId, total]) => ({
      teamId,
      total,
      name: (teamMap[teamId] && teamMap[teamId].name) || teamId,
    }))
    .sort((a, b) => a.total - b.total);

  return (
    <div className="p-4">
      <div className="card mb-4">
        <h2 className="text-2xl font-semibold text-[#343A40] mb-3">
          Live Leaderboard
        </h2>
        <p className="text-sm text-gray-600 mb-2">
          Latest rounds will appear here as players submit scores.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Team Aggregates
            </h3>
            <ul>
              {teamRanking.map((t, idx) => (
                <li key={t.teamId} className="py-1 flex justify-between">
                  <span className="text-sm text-gray-800">
                    {idx + 1}. {t.name}
                  </span>
                  <span className="text-sm font-medium text-green-600">
                    {t.total}
                  </span>
                </li>
              ))}
              {teamRanking.length === 0 && (
                <li className="text-sm text-gray-500">No live data yet</li>
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Recent Rounds
            </h3>
            <div className="overflow-auto max-h-80">
              <table className="min-w-full table-auto text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-1">Time</th>
                    <th className="py-1">Player</th>
                    <th className="py-1">Team</th>
                    <th className="py-1">Gross</th>
                    <th className="py-1">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {rounds.map((r) => {
                    const p = playerMap[r.playerId];
                    const t = p && teamMap[p.teamId];
                    return (
                      <tr key={r.id} className="border-b">
                        <td className="py-1">{formatDate(r.date)}</td>
                        <td className="py-1">{p ? p.name : r.playerId}</td>
                        <td className="py-1">
                          {t ? t.name : p ? p.teamId : "—"}
                        </td>
                        <td className="py-1">{r.grossScore}</td>
                        <td className="py-1">
                          {typeof r.differential === "number"
                            ? r.differential
                            : r.grossScore - (r.coursePar || 36)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-[#343A40] mb-3">
            Recent Matches
          </h3>
          <div className="space-y-2">
            {matches.length === 0 && (
              <div className="text-sm text-gray-500">No matches yet</div>
            )}
            {matches.map((m) => {
              const teamA = teamMap[m.teamAId];
              const teamB = teamMap[m.teamBId];
              return (
                <div key={m.id} className="p-3 bg-white border rounded">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">
                      {(teamA && teamA.name) || m.teamAId}{" "}
                      <span className="text-gray-500">{m.teamAScore}</span> vs{" "}
                      {(teamB && teamB.name) || m.teamBId}{" "}
                      <span className="text-gray-500">{m.teamBScore}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-gray-500">
                        {formatDate(m.date)}
                      </div>
                      <button
                        className="text-sm text-blue-600"
                        onClick={() =>
                          setOpenMatchId(openMatchId === m.id ? null : m.id)
                        }
                      >
                        {openMatchId === m.id ? "Hide" : "Details"}
                      </button>
                    </div>
                  </div>
                  {openMatchId === m.id && (
                    <div className="mt-3 text-sm text-gray-700">
                      {m.pairs &&
                        m.pairs.map((p, idx) => (
                          <div key={idx} className="py-2 border-t">
                            <div className="font-medium">Pair {idx + 1}</div>
                            <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                              <div>
                                <div className="text-gray-600">
                                  A:{" "}
                                  {players.find((pp) => pp.id === p.playerAId)
                                    ?.name || p.playerAId}
                                </div>
                                <div>Hole Points: {p.playerA.holePoints}</div>
                                <div>Total Points: {p.playerA.points}</div>
                              </div>
                              <div>
                                <div className="text-gray-600">
                                  B:{" "}
                                  {players.find((pp) => pp.id === p.playerBId)
                                    ?.name || p.playerBId}
                                </div>
                                <div>Hole Points: {p.playerB.holePoints}</div>
                                <div>Total Points: {p.playerB.points}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
