NotBeetleball — Game Web App(A2 Version)

A React + Firebase web app where players can log in, check the leaderboard, play an embedded game, and (for admins) view analytics dashboards.

Unity Telemetry Bridge (WebGL)

The React portal now listens for telemetry events from the embedded Unity iframe and writes them to Firestore in real time.

Getting Started

1. Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A Firebase project with **Authentication** and **Firestore** enabled

2. Clone / Download

```bash
git clone https://github.com/NickTAM1/WebT4A1.git
cd WebT4A1
```

3. Install Dependencies

```bash
npm install
```

4. Create a .env file

Create a `.env` file in the project root:

.env
```bash
VITE_FIREBASE_API_KEY=AIzaSyD5IuBKLFJN5sCTSkBr_tbZHT2tr6q_lNE
VITE_FIREBASE_AUTH_DOMAIN=webt4-f9d4b.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=webt4-f9d4b
VITE_FIREBASE_STORAGE_BUCKET=webt4-f9d4b.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=618619490178
VITE_FIREBASE_APP_ID=1:618619490178:web:b5b7527e08e272f2c9899b

VITE_GAME_URL=https://nicktam1.github.io/SponderBirdNew/
```

5. Run the Dev Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

Test Accounts

Player: 
```bash
sponder@sponder.com
spondersponder
```   

Admin: 
```bash
admin@admin.com
123456789
```  

Github Link
https://github.com/NickTAM1/CloudComputingTelemetrySystem.git




