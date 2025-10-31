import React, { useEffect, useState } from "react";
import firebase from "../firebase";

const DEFAULT_PAR = 36;

export default function ScoreEntry() {
  const [players, setPlayers] = useState([]);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [holeScores, setHoleScores] = useState(Array(9).fill(""));
  const [coursePar, setCoursePar] = useState(DEFAULT_PAR);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [handicap, setHandicap] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const pl = await firebase.getPlayers();
      if (!mounted) return;
      setPlayers(pl);
      if (pl.length) setSelectedPlayer(pl[0].id);
    })();
    return () => (mounted = false);
  }, []);

  useEffect(() => {
    // update handicap display
    let mounted = true;
    (async () => {
      if (!selectedPlayer) return;
      const h = await firebase.getPlayerHandicap9(selectedPlayer);
      if (mounted) setHandicap(h);
    })();
    return () => (mounted = false);
  }, [selectedPlayer]);

  function updateHole(idx, val) {
    const copy = holeScores.slice();
    // accept only digits
    const cleaned = val.replace(/[^0-9]/g, "");
    copy[idx] = cleaned;
    setHoleScores(copy);
  }

  function grossTotal() {
    return holeScores.reduce((s, v) => s + (Number(v) || 0), 0);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    if (!selectedPlayer) return setMessage("Select a player");
    const gross = grossTotal();
    const differential = gross - Number(coursePar || DEFAULT_PAR);
    const round = {
      playerId: selectedPlayer,
      date: new Date().toISOString(),
      coursePar: Number(coursePar || DEFAULT_PAR),
      holeScores: holeScores.map((s) => Number(s) || 0),
      grossScore: gross,
      differential,
    };

    setSaving(true);
    try {
      await firebase.saveRound(round);
      const newHandicap = await firebase.getPlayerHandicap9(selectedPlayer);
      setHandicap(newHandicap);
      setMessage("Score saved");
      setHoleScores(Array(9).fill(""));
    } catch (err) {
      console.error(err);
      setMessage("Failed to save score");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4">
      <div className="card max-w-md mx-auto">
        <h2 className="text-xl font-semibold text-[#343A40] mb-3">
          Score Entry
        </h2>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm text-gray-700 mb-2">Player</label>
          <select
            value={selectedPlayer || ""}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="w-full mb-3 p-2 rounded border"
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <label className="block text-sm text-gray-700 mb-2">Course Par</label>
          <input
            type="number"
            value={coursePar}
            onChange={(e) => setCoursePar(e.target.value)}
            className="w-full mb-3 p-2 rounded border"
          />

          <div className="grid grid-cols-3 gap-2 mb-3">
            {holeScores.map((h, idx) => (
              <div key={idx}>
                <label className="text-xs text-gray-600">Hole {idx + 1}</label>
                <input
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={h}
                  onChange={(e) => updateHole(idx, e.target.value)}
                  className="w-full p-2 rounded border text-center"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-sm text-gray-600">
                Gross: <strong>{grossTotal()}</strong>
              </div>
              <div className="text-sm text-gray-600">
                Differential:{" "}
                <strong>
                  {grossTotal() - Number(coursePar || DEFAULT_PAR)}
                </strong>
              </div>
              <div className="text-sm text-gray-600">
                Current Handicap9: <strong>{handicap ?? "—"}</strong>
              </div>
            </div>
            <button
              type="submit"
              className="bg-[#0B7A49] text-white px-4 py-2 rounded"
              disabled={saving}
            >
              {saving ? "Saving…" : "Submit Score"}
            </button>
          </div>

          {message && <div className="text-sm text-green-600">{message}</div>}
        </form>
      </div>
    </div>
  );
}
