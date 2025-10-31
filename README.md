# lakelovergolfleague

This project is an in-progress SPA for the Lake Lover Golf League. It supports local mock data by default and can be configured to use Firebase Firestore for live scoring when you provide Firebase env vars.

To enable Firestore live scoring: create a `.env` file at the repo root from `.env.example` and fill in your Firebase web config values. The Live Leaderboard subscribes to `/rounds`, `/players`, and `/teams` when Firestore is initialized.
