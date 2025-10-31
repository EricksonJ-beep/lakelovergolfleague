import React, { useEffect, useState } from "react";
import firebase from "../firebase";
import matchUtils from "../utils/match";

export default function MatchEntry() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [teamAPlayers, setTeamAPlayers] = useState([]);
  const [teamBPlayers, setTeamBPlayers] = useState([]);
  const [holeScoresById, setHoleScoresById] = useState({});
  const [useLastRounds, setUseLastRounds] = useState(true);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const t = await firebase.getTeams();
      const p = await firebase.getPlayers();
      if (!mounted) return;
      setTeams(t);
      setPlayers(p);
      if (t.length >= 2) {
        setTeamAId(t[0].id);
        setTeamBId(t[1].id);
      } else if (t.length === 1) {
        setTeamAId(t[0].id);
      }
    })();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    setTeamAPlayers(players.filter((p) => p.teamId === teamAId));
  }, [teamAId, players]);

  useEffect(() => {
    setTeamBPlayers(players.filter((p) => p.teamId === teamBId));
  }, [teamBId, players]);

  async function populateFromLastRounds() {
    const ids = [
      ...(teamAPlayers || []).map((p) => p.id),
      ...(teamBPlayers || []).map((p) => p.id),
    ];
    const copy = { ...holeScoresById };
    for (const id of ids) {
      const rounds = await firebase.getPlayerRounds(id);
      if (rounds && rounds.length) {
        copy[id] = rounds[0].holeScores || [];
      } else {
        copy[id] = Array(9).fill("");
      }
    }
    setHoleScoresById(copy);
  }

  function updateHole(playerId, idx, val) {
    const copy = { ...holeScoresById };
    const cleaned = String(val).replace(/[^0-9]/g, "");
    if (!Array.isArray(copy[playerId])) copy[playerId] = Array(9).fill("");
    copy[playerId][idx] = cleaned;
    setHoleScoresById(copy);
  }

  async function computeMatch() {
    setMessage("");
    // build team objects
    const tA = { id: teamAId, players: teamAPlayers.slice(0, 2) };
    const tB = { id: teamBId, players: teamBPlayers.slice(0, 2) };

    // collect selected players (if a team has players but they are missing handicap, compute)
    const handicapsById = {};
    const holeInputs = {};

    for (const p of [...tA.players, ...tB.players]) {
      if (!p || !p.id) continue;
      const hid = p.id;
      const h = await firebase.getPlayerHandicap9(hid);
      handicapsById[hid] = h;
      const raw = holeScoresById[hid];
      // normalize to numeric array of length 9
      if (Array.isArray(raw) && raw.length >= 9) {
        holeInputs[hid] = raw.map((v) => Number(v) || 0);
      } else {
        holeInputs[hid] = Array(9).fill(0);
      }
    }

    const match = matchUtils.computeMatchResult(
      tA,
      tB,
      holeInputs,
      handicapsById
    );
    setResult(match);
  }

  async function handleSave() {
    if (!result) return setMessage("Compute match before saving");
    setSaving(true);
    try {
      const saved = await firebase.saveMatch(result);
      setMessage("Match saved: " + (saved.id || "(mock)"));
    } catch (e) {
      console.error(e);
      setMessage("Failed to save match");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4">
      <div className="card max-w-4xl mx-auto">
        <h2 className="text-xl font-semibold text-[#343A40] mb-3">
          Match Entry
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Team A</label>
            <select
              value={teamAId}
              onChange={(e) => setTeamAId(e.target.value)}
              className="w-full p-2 rounded border mb-2"
            >
              <option value="">Select team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <div className="text-sm text-gray-600">Players</div>
            <ul className="mb-2">
              {teamAPlayers.map((p) => (
                <li key={p.id} className="text-sm py-1">
                  {p.name} (handicap: {p.currentHandicap9 ?? "—"})
                </li>
              ))}
              {teamAPlayers.length === 0 && (
                <li className="text-sm">No players</li>
              )}
            </ul>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Team B</label>
            <select
              value={teamBId}
              onChange={(e) => setTeamBId(e.target.value)}
              className="w-full p-2 rounded border mb-2"
            >
              <option value="">Select team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <div className="text-sm text-gray-600">Players</div>
            <ul className="mb-2">
              {teamBPlayers.map((p) => (
                <li key={p.id} className="text-sm py-1">
                  {p.name} (handicap: {p.currentHandicap9 ?? "—"})
                </li>
              ))}
              {teamBPlayers.length === 0 && (
                <li className="text-sm">No players</li>
              )}
            </ul>
          </div>
        </div>

        <div className="mb-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={useLastRounds}
              onChange={(e) => setUseLastRounds(e.target.checked)}
              className="mr-2"
            />
            Use players' last saved rounds to pre-fill hole scores
          </label>
          {useLastRounds && (
            <div>
              <button
                className="mt-2 bg-[#0B7A49] text-white px-3 py-1 rounded"
                onClick={populateFromLastRounds}
              >
                Load Last Rounds
              </button>
            </div>
          )}
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">
            Hole Scores (manual override)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...teamAPlayers.slice(0, 2), ...teamBPlayers.slice(0, 2)].map(
              (p) => (
                <div key={p.id} className="p-2 border rounded">
                  <div className="text-sm font-medium mb-1">{p.name}</div>
                  <div className="grid grid-cols-9 gap-1">
                    {Array.from({ length: 9 }).map((_, i) => (
                      <input
                        key={i}
                        value={
                          (holeScoresById[p.id] && holeScoresById[p.id][i]) ??
                          ""
                        }
                        onChange={(e) => updateHole(p.id, i, e.target.value)}
                        className="p-1 text-center border rounded text-sm"
                        inputMode="numeric"
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        <div className="flex gap-2 items-center mb-4">
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded"
            onClick={computeMatch}
          >
            Compute Match
          </button>
          <button
            className="bg-green-600 text-white px-3 py-1 rounded"
            onClick={handleSave}
            disabled={!result || saving}
          >
            {saving ? "Saving…" : "Save Match"}
          </button>
          {message && <div className="text-sm text-gray-700">{message}</div>}
        </div>

        {result && (
          <div className="bg-white p-3 rounded border">
            <h3 className="text-sm font-medium mb-2">Match Result</h3>
            <div className="mb-2">
              Team A Score: <strong>{result.teamAScore}</strong>
            </div>
            <div className="mb-2">
              Team B Score: <strong>{result.teamBScore}</strong>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.pairs.map((pair, idx) => (
                <div key={idx} className="p-2 border rounded">
                  <div className="text-sm font-medium mb-1">Pair {idx + 1}</div>
                  <div className="text-sm">Player A: {pair.playerAId}</div>
                  <div className="text-sm">
                    Hole Points: {pair.playerA.holePoints}
                  </div>
                  <div className="text-sm">
                    Total Points: {pair.playerA.points}
                  </div>
                  <hr className="my-2" />
                  <div className="text-sm">Player B: {pair.playerBId}</div>
                  <div className="text-sm">
                    Hole Points: {pair.playerB.holePoints}
                  </div>
                  <div className="text-sm">
                    Total Points: {pair.playerB.points}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
