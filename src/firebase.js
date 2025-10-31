// Lightweight Firebase helper with mock fallback for local development
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  getDocs as firestoreGetDocs,
  onSnapshot,
  limit,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let db = null;
let isFirebaseReady = false;

function hasFirebaseConfig() {
  return !!(firebaseConfig.apiKey && firebaseConfig.projectId);
}

if (hasFirebaseConfig()) {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseReady = true;
    console.log("Firebase initialized");
  } catch (e) {
    console.warn("Firebase init failed, falling back to mock data", e);
  }
}

const MOCK_TEAMS = Array.from({ length: 20 }).map((_, i) => ({
  id: `team-${i + 1}`,
  name: `Lake Lovers ${i + 1}`,
  player1Id: `p${i * 2 + 1}`,
  player2Id: `p${i * 2 + 2}`,
  seasonPoints: Math.max(0, Math.floor(Math.random() * 120)),
}));

const MOCK_PLAYERS = Array.from({ length: 40 }).map((_, i) => ({
  id: `p${i + 1}`,
  name: `Player ${i + 1}`,
  teamId: `team-${Math.floor(i / 2) + 1}`,
  currentHandicap9: 0,
}));

const MOCK_ROUNDS = [];

export async function getTeams() {
  if (isFirebaseReady && db) {
    try {
      const q = collection(db, "teams");
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error("Error fetching teams from Firestore", e);
      return MOCK_TEAMS;
    }
  }
  return new Promise((res) => setTimeout(() => res(MOCK_TEAMS), 200));
}

export async function getPlayers() {
  if (isFirebaseReady && db) {
    try {
      const q = collection(db, "players");
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error("Error fetching players from Firestore", e);
      return MOCK_PLAYERS;
    }
  }
  return new Promise((res) => setTimeout(() => res(MOCK_PLAYERS), 120));
}

export async function saveRound(round) {
  if (isFirebaseReady && db) {
    try {
      const col = collection(db, "rounds");
      const docRef = await addDoc(col, round);
      return { id: docRef.id, ...round };
    } catch (e) {
      console.error("Error saving round to Firestore", e);
    }
  }
  const saved = { id: `r-${MOCK_ROUNDS.length + 1}`, ...round };
  MOCK_ROUNDS.push(saved);
  return saved;
}

export async function getPlayerRounds(playerId) {
  if (isFirebaseReady && db) {
    try {
      const col = collection(db, "rounds");
      const q = query(
        col,
        where("playerId", "==", playerId),
        orderBy("date", "desc")
      );
      const snap = await firestoreGetDocs(q);
      return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.error("Error fetching rounds from Firestore", e);
      return MOCK_ROUNDS.filter((r) => r.playerId === playerId);
    }
  }
  return MOCK_ROUNDS.filter((r) => r.playerId === playerId)
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getPlayerHandicap9(playerId) {
  try {
    const rounds = await getPlayerRounds(playerId);
    const diffs = rounds
      .slice(0, 20)
      .map((r) =>
        typeof r.differential === "number"
          ? r.differential
          : r.grossScore - (r.coursePar || 36)
      );
    while (diffs.length < 5) diffs.push(0);
    const best5 = diffs
      .slice()
      .sort((a, b) => a - b)
      .slice(0, 5);
    const avg = best5.reduce((s, v) => s + v, 0) / 5;
    return Number(avg.toFixed(1));
  } catch (e) {
    console.error("Error computing handicap", e);
    return 0;
  }
}

export function subscribeToRounds(callback, options = {}) {
  if (isFirebaseReady && db) {
    const col = collection(db, "rounds")
    const q = query(col, orderBy("date", "desc"), ...(options.limit ? [limit(options.limit)] : []))
    return onSnapshot(
      q,
      (snap) => {
        const rounds = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        callback(rounds)
      },
      (err) => console.error("Rounds snapshot error", err)
    )
  }
  const t = setTimeout(() => callback(MOCK_ROUNDS.slice().sort((a, b) => new Date(b.date) - new Date(a.date))), 50)
  return () => clearTimeout(t)
}

export function subscribeToPlayers(callback) {
  if (isFirebaseReady && db) {
    const col = collection(db, "players")
    return onSnapshot(
      col,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Players snapshot error", err)
    )
  }
  const t = setTimeout(() => callback(MOCK_PLAYERS), 10)
  return () => clearTimeout(t)
}

export function subscribeToTeams(callback) {
  if (isFirebaseReady && db) {
    const col = collection(db, "teams")
    return onSnapshot(
      col,
      (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      (err) => console.error("Teams snapshot error", err)
    )
  }
  const t = setTimeout(() => callback(MOCK_TEAMS), 10)
  return () => clearTimeout(t)
}

export default {
  getTeams,
  getPlayers,
  saveRound,
  getPlayerRounds,
  getPlayerHandicap9,
};
