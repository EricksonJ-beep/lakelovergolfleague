import React, { useState } from "react";
import TeamStandings from "./components/TeamStandings";
import ScoreEntry from "./components/ScoreEntry";

const TABS = [
  { id: "score", label: "Score Entry" },
  { id: "live", label: "Live Leaderboard" },
  { id: "standings", label: "Team Standings" },
  { id: "players", label: "Player Stats" },
  { id: "schedule", label: "Schedule" },
];

export default function App() {
  const [active, setActive] = useState("score");

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#0B7A49]">
              Lake Lover Golf League
            </h1>
            <p className="text-sm text-gray-600">
              Whispering Pines — Live scoring & standings
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <nav className="mb-6">
          <div className="flex gap-2 overflow-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium ${
                  active === tab.id
                    ? "bg-[#0B7A49] text-white"
                    : "bg-[#E9ECEF] text-gray-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <section>
          {active === "standings" && <TeamStandings />}
          {active === "score" && <ScoreEntry />}

          {active === "live" && (
            <div className="card">
              <h2 className="text-xl font-semibold text-[#343A40]">
                Live Leaderboard (placeholder)
              </h2>
              <p className="text-sm text-gray-600 mt-2">
                Real-time match cards and hole-by-hole details will show here.
              </p>
            </div>
          )}

          {active === "players" && (
            <div className="card">
              <h2 className="text-xl font-semibold text-[#343A40]">
                Player Stats (placeholder)
              </h2>
            </div>
          )}

          {active === "schedule" && (
            <div className="card">
              <h2 className="text-xl font-semibold text-[#343A40]">
                Schedule / Results (placeholder)
              </h2>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
