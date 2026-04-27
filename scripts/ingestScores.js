import { readFileSync } from "fs";
import {resolve, dirname} from "path";
import {fileURLToPath} from "url";
import {initializeApp} from 'firebase/app';
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    addDoc,
    getDocs,
    deleteDoc,
    query,
    where,
    Timestamp,
} from 'firebase/firestore';
import "dotenv/config";



const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env");
const envVars = {};

try {
    const envFile = readFileSync(envPath, "utf-8");
    for (const line of envFile.split("\n")) {
        const trimmed = line.trim();
        if(!trimmed )continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim();
        envVars[key] = value;
    }
} catch (error) {
    console.error("Error");
}

const firebaseConfig = {
    apiKey: envVars.VITE_FIREBASE_API_KEY,
    authDomain: envVars.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: envVars.VITE_FIREBASE_PROJECT_ID,
    storageBucket: envVars.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: envVars.VITE_FIREBASE_APP_ID,

};

const requiredFirebaseVars = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
];

const missingFirebaseVars = requiredFirebaseVars.filter((key) => !firebaseConfig[key]);
if (missingFirebaseVars.length > 0) {
    throw new Error(`Missing Firebase config values in .env: ${missingFirebaseVars.join(", ")}`);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const MOCK_PLAYERS = [
    {id: "m_evelyn" , name: "Evelyn", email: "evelyn@example.com"},
    {id: "m_diana" , name: "Diana", email: "diana@example.com"},
    {id: "m_julian" , name: "Julian", email: "julian@example.com"},
    {id: "m_kiran" , name: "Kiran", email: "kiran@example.com"},
    {id: "m_vini" , name: "Vini", email: "vini@example.com"},
    {id: "m_vi" , name: "Vi", email: "vi@example.com"},
    {id: "m_nick" , name: "Nick", email: "nick@example.com"},
    {id: "m_tyler" , name: "Tyler", email: "tyler@example.com"},
    {id: "m_tobias" , name: "Tobias", email: "tobias@example.com"},
    {id: "m_ken" , name: "Ken", email: "ken@example.com"},
    {id: "m_dylan" , name: "Dylan", email: "dylan@example.com"},
    {id: "m_cris" , name: "Cris", email: "cris@example.com"}
];

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPastTimestamp(maxDaysAgo = 30) {
    const now = Date.now();
    const offset = randomInt(0, maxDaysAgo * 24 * 60 * 60 * 1000);
    return Timestamp.fromDate(new Date(now - offset));
}

async function pushScores() {
    console.log("Ingestion started...");
    for (const player of MOCK_PLAYERS) {
        const sessionCount = randomInt(3, 8);
        const scores = [];

        for (let i = 0; i < sessionCount; i++) {
            const score = randomInt(1, 42);
            const pipes = score;
            const timestamp = randomPastTimestamp();

            scores.push({score, pipes, timestamp});

            await addDoc(collection(db, "scores"), {
                userId: player.id,
                playerName: player.name,
                playerPhoto: null,
                score,
                pipes,
                duration: randomInt(10, 180),
                timestamp,
                isMock: true,

            });

        }
        const highScore = Math.max(...scores.map((s) => s.score));
        const memberSince = randomPastTimestamp(90);

        await setDoc(doc(db, "users", player.id), {
            email: player.email,
            displayname: player.name,
            photoURL: null,
            createdAt: memberSince,
            highscore: highScore,
            gamesPlayed: sessionCount,
            isMock: true,
        });

        console.log(`${player.name} -> ${sessionCount} game, ${highScore} high score.`);

    }

    console.log("Pushed data :)");
}

async function clearMockData() {
    for(const player of MOCK_PLAYERS) {
        await deleteDoc(doc(db, "users", player.id));

    }
    const scoresQuery = query(
        collection(db, "scores"),
        where("isMock", "==", true)
    );

    const scoresSnapshot = await getDocs(scoresQuery);

    let count = 0;
    for (const scoreDoc of scoresSnapshot.docs) {
        await deleteDoc(scoreDoc.ref);
        count++;
    }
    console.log(`Deleted ${count} scores :) :).`);
}


const shouldClear = process.argv.includes("--clear");

if(shouldClear) {
    await clearMockData();
}

await pushScores();
process.exit(0);
