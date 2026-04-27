import { useState, useEffect, useRef, useCallback } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import {
    addDoc,
    collection,
    doc,
    increment,
    onSnapshot,
    runTransaction,
    serverTimestamp,
} from "firebase/firestore";
import UserScreen from "./UserScreen";
import AdminDashboard from "./AdminDashboard";

const GAME_URL = import.meta.env.VITE_GAME_URL || null;
const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";

export default function GamePortal({ user, userData: initialUserData }) {
    const [userData, setUserData] = useState(initialUserData);
    const [activeTab, setActiveTab] = useState("profile");
    const [gameLoaded, setGameLoaded] = useState(false);

    const isAdmin = userData?.role === "admin";

    useEffect(() => {
        const userRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(userRef, (snapshot) => {
            if (snapshot.exists()) {
                setUserData(snapshot.data());
            }
        });
        return () => unsubscribe();
    }, [user.uid]);

    const iframeRef = useRef(null);
    const retryTimer = useRef(null);
    const authAcknowledged = useRef(false);
    const seenSessionIds = useRef(new Set());
    const sessionStartRef = useRef(null);

    const persistTelemetry = useCallback(async (rawPayload) => {
        if (!user?.uid || !rawPayload) return;

        const score = Number(rawPayload.score ?? rawPayload.finalScore ?? 0);
        if (!Number.isFinite(score) || score < 0) return;

        const sessionId = String(
            rawPayload.sessionId ||
            rawPayload.gameSessionId ||
            `${user.uid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        );

        if (seenSessionIds.current.has(sessionId)) return;
        seenSessionIds.current.add(sessionId);

        const nowIso = new Date().toISOString();
        const sessionStartIso = rawPayload.startTime || rawPayload.startedAt || sessionStartRef.current || nowIso;
        const sessionEndIso = rawPayload.endTime || rawPayload.endedAt || nowIso;

        const parsedStart = new Date(sessionStartIso);
        const parsedEnd = new Date(sessionEndIso);
        const startDate = Number.isNaN(parsedStart.getTime()) ? new Date() : parsedStart;
        const endDate = Number.isNaN(parsedEnd.getTime()) ? new Date() : parsedEnd;
        const durationSeconds = Number(
            rawPayload.durationSeconds ??
            rawPayload.duration ??
            Math.max(0, Math.round((endDate.getTime() - startDate.getTime()) / 1000))
        );

        const gameplayMetric = Number(rawPayload.pipesPassed ?? rawPayload.pipes ?? 0);
        const clicks = Number(rawPayload.clicks ?? rawPayload.totalClicks ?? 0);

        await addDoc(collection(db, "scores"), {
            sessionId,
            userId: user.uid,
            playerName: userData?.displayname || user.displayName || user.email || "Player",
            playerPhoto: user.photoURL || null,
            score,
            pipesPassed: Number.isFinite(gameplayMetric) ? gameplayMetric : 0,
            clicks: Number.isFinite(clicks) ? clicks : 0,
            durationSeconds: Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0,
            sessionStartAtIso: startDate.toISOString(),
            sessionEndAtIso: endDate.toISOString(),
            source: "unity-webgl",
            createdAt: serverTimestamp(),
        });

        const userRef = doc(db, "users", user.uid);
        await runTransaction(db, async (transaction) => {
            const snapshot = await transaction.get(userRef);
            if (!snapshot.exists()) return;
            const existing = snapshot.data() || {};
            const nextHigh = Math.max(Number(existing.highscore ?? 0), score);

            transaction.update(userRef, {
                highscore: nextHigh,
                gamesPlayed: increment(1),
                lastPlayedAt: serverTimestamp(),
            });
        });
    }, [user, userData]);

    const sendAuthToGame = useCallback(async () => {
        if (!iframeRef.current?.contentWindow || !user || authAcknowledged.current) return;
        try {
            const idToken = await user.getIdToken();
            const payload = {
                type: "firebase-auth",
                uid: user.uid,
                displayName: user.displayName || user.email || "Player",
                idToken,
                projectId: FIREBASE_PROJECT_ID,
            };
            iframeRef.current.contentWindow.postMessage(payload, "*");
        } catch (err) {
            console.error("Failed to send auth token to iframe", err);
        }
    }, [user]);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.source !== iframeRef.current?.contentWindow) return;

            if (event.data?.type === "firebase-auth-ack") {
                authAcknowledged.current = true;
                if (retryTimer.current) {
                    clearInterval(retryTimer.current);
                    retryTimer.current = null;
                }
                return;
            }

            const type = event.data?.type;
            const looksLikeTelemetry = (
                type === "game-telemetry" ||
                type === "game-over" ||
                type === "game-session-end" ||
                type === "score-update" ||
                (event.data && (event.data.score !== undefined || event.data.finalScore !== undefined))
            );

            if (looksLikeTelemetry) {
                persistTelemetry(event.data).catch((err) => {
                    console.error("Failed to persist telemetry", err);
                });
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [persistTelemetry]);

    const handleGameLoaded = useCallback(() => {
        setGameLoaded(true);
        sessionStartRef.current = new Date().toISOString();
        authAcknowledged.current = false;
        sendAuthToGame();
        retryTimer.current = setInterval(sendAuthToGame, 2000);
        setTimeout(() => {
            if (retryTimer.current) {
                clearInterval(retryTimer.current);
                retryTimer.current = null;
            }
        }, 30000);
    }, [sendAuthToGame]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (err) {
            console.error("Sign out error", err);
        }
    };

    const displayName = userData?.displayname || user.displayName || user.email || "Player";
    const initials = displayName.charAt(0).toUpperCase();

    return (
        <div className="portal-container">
            <header className="portal-header">
                <div className="brand">
                    <div className="brand-icon">N</div>
                    <h1>NotBeetleball</h1>
                </div>
                <div className="user-info">
                    {user.photoURL
                        ? <img src={user.photoURL} alt="avatar" className="avatar" />
                        : <div className="avatar-placeholder">{initials}</div>
                    }
                    <span className="user-name">{displayName}</span>
                    <button onClick={handleSignOut} className="btn-signout">Sign Out</button>
                </div>
            </header>

            <nav className="tab-bar">
                <button
                    className={`tab ${activeTab === "profile" ? "active" : ""}`}
                    onClick={() => setActiveTab("profile")}
                >
                    Profile
                </button>
                <button
                    className={`tab ${activeTab === "game" ? "active" : ""}`}
                    onClick={() => setActiveTab("game")}
                >
                    Play
                </button>
                {isAdmin && (
                    <button
                        className={`tab ${activeTab === "admin" ? "active" : ""}`}
                        onClick={() => setActiveTab("admin")}
                    >
                        Admin
                    </button>
                )}
            </nav>

            <main className="portal-content">
                {activeTab === "profile" && (
                    <div className="tab-panel">
                        <UserScreen user={user} userData={userData} />
                    </div>
                )}

                {activeTab === "game" && (
                    <div className="game-area">
                        {!gameLoaded && (
                            <div className="game-loading">
                                <div className="spinner" />
                                <p>Loading game...</p>
                            </div>
                        )}
                        {GAME_URL ? (
                            <iframe
                                ref={iframeRef}
                                src={GAME_URL}
                                title="NotBeetleball Game"
                                className={`game-iframe ${gameLoaded ? "visible" : "hidden"}`}
                                allow="fullscreen"
                                onLoad={handleGameLoaded}
                            />
                        ) : (
                            <div className="game-placeholder">
                                <div className="placeholder-content">
                                    <div className="placeholder-icon">
                                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                            <rect x="2" y="3" width="20" height="14" rx="2" />
                                            <path d="M8 21h8M12 17v4" />
                                        </svg>
                                    </div>
                                    <h2>Game Not Configured</h2>
                                    <p>Set <code>VITE_GAME_URL</code> in your <code>.env</code> file to embed the game.</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "admin" && isAdmin && (
                    <div className="tab-panel">
                        <AdminDashboard />
                    </div>
                )}
            </main>
        </div>
    );
}
