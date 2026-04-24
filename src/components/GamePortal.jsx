import { useState, useEffect, useRef, useCallback } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, onSnapshot } from "firebase/firestore";
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
            console.log("Auth token sent to iframe... waiting for ack");
        } catch (err) {
            console.error("Failed to send auth token to iframe", err);
        }
    }, [user]);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data?.type === "firebase-auth-ack") {
                console.log("Game acknowledged successful");
                authAcknowledged.current = true;
                if (retryTimer.current) {
                    clearInterval(retryTimer.current);
                    retryTimer.current = null;
                }
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const handleGameLoaded = useCallback(() => {
        setGameLoaded(true);
        authAcknowledged.current = false;
        sendAuthToGame();
        retryTimer.current = setInterval(sendAuthToGame, 2000);
        setTimeout(() => {
            if (retryTimer.current) {
                clearInterval(retryTimer.current);
                retryTimer.current = null;
                if (!authAcknowledged.current) {
                    console.warn("Game never acknowledged auth after 30s. Did you put the FirebaseManager in the scene?");
                }
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
