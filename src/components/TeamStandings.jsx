import React, { useEffect, useState } from "react";
import firebase from "../firebase";

export default function TeamStandings() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const data = await firebase.getTeams();
      if (mounted) {
        const sorted = data
          .slice()
          .sort((a, b) => (b.seasonPoints || 0) - (a.seasonPoints || 0));
        setTeams(sorted);
        setLoading(false);
      }
    })();
    return () => (mounted = false);
  }, []);

  return (
    <div className="p-4">
      <div className="card">
        <h2 className="text-2xl font-semibold text-[#343A40] mb-4">
          Team Standings
        </h2>
        {loading ? (
          <div className="text-sm text-gray-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="text-left text-sm text-gray-600 border-b">
                  <th className="py-2">Rank</th>
                  <th className="py-2">Team</th>
                  <th className="py-2">Points</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((t, idx) => (
                  <tr key={t.id} className="border-b last:border-b-0">
                    <td className="py-3 font-medium text-gray-700">
                      {idx + 1}
                    </td>
                    <td className="py-3 text-gray-800">{t.name}</td>
                    <td className="py-3 font-semibold text-green-600">
                      {t.seasonPoints || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
