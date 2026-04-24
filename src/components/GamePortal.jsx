import { useState, useEffect, useRef, useCallback } from "react"
import { signOut } from "firebase/auth"
import { auth, db } from "../firebase";
import { doc, onSnapshot} from "firebase/firestore";
import UserScreen from "./UserScreen";
import AdminDashboard from "./AdminDashboard";

const GAME_URL = import.meta.env.VITE_GAME_URL || null;
const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || "";

export default function GamePortal({user}) {
    
    const [userData, setUserData] = useState(null);
    const [gameLoaded, setGameLoaded] = useState(false);
    const [activeTab, setActiveTab] = useState("game");
    const [authAcked, setAuthAcked] = useState(false);
    const displayName = userData?.displayname || user.displayName || user.email || "Player";

    useEffect(() => {
        const userRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(userRef, (snapshot) => {
            if(snapshot.exists()) {
                setUserData(snapshot.data());
            }
        });
        return () => unsubscribe();
    }, [user.uid]); // Listen for real-time updates to user data

     const iframeRef = useRef(null);
     const authAcknowledged = useRef(false);

    const sendAuthToGame = useCallback( async ()=>{
        if(!iframeRef.current?.contentWindow || !user || authAcked) return;
        try {
            const idToken = await user.getIdToken();
            const payload = {
                type: "firebase-auth",
                uid: user.uid,
                displayName: user.displayName || user.email|| "Player",
                idToken,
                projectId: FIREBASE_PROJECT_ID,

            };
            iframeRef.current.contentWindow.postMessage(payload, "*");
            console.log("Auth token sent to iframe... waiting for ack");
        } catch (err) {
            console.error("Failed to send auth token to iframe", err);
        }
    },   [authAcked, user]);

    useEffect(() => {
            const handleMessage = (event) => {
                if(event.data?.type === "firebase-auth-ack" ) {
                console.log("Game acknowkledged successful");
                authAcknowledged.current = true;
                setAuthAcked(true);
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const handleGameLoaded = useCallback(() => {
        setGameLoaded(true);
        authAcknowledged.current = false;
        setAuthAcked(false);
        sendAuthToGame();
    }, [sendAuthToGame]);

    useEffect(() => {
        if (!gameLoaded || authAcked) return;

        const intervalId = setInterval(sendAuthToGame, 2000);
        const timeoutId = setTimeout(() => {
            if (!authAcknowledged.current) {
                console.warn("Game never acknowledged auth after 30s, Did you put the FirebaseManager in the scene?");
                setAuthAcked(true);
            }
        }, 30000);

        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [authAcked, gameLoaded, sendAuthToGame]);

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (err) {
            console.log("Sign out error", err);
        }
    };

    return (
        <div className="portal-container">
            <div className="portal-header">
                <div className="brand">
                    <div className="brand-icon">NB</div>
                    <h1>NotBeetleball</h1>
                </div>
                <div className="user-info">
                    <span className="user-name">{displayName}</span>
                    <button onClick={ handleSignOut } className="btn-signout">Sign Out</button>
                </div>
            </div>

            <div className="tab-bar">
                <button
                    onClick={() => setActiveTab("game")}
                    className={`tab ${activeTab === "game" ? "active" : ""}`}
                >
                    Game
                </button>
                <button
                    onClick={() => setActiveTab("dashboard")}
                    className={`tab ${activeTab === "dashboard" ? "active" : ""}`}
                >
                    Dashboard
                </button>
            </div>

            <div className="portal-content">
                {activeTab === "game" ? (
                    <div className="game-area">
                        <iframe
                            ref={iframeRef}
                            src={GAME_URL}
                            title="Sponder Bird"
                            className={"game-frame " + `${gameLoaded ? "visible" : "hidden"}`}
                            allow="fullscreen"
                            onLoad={handleGameLoaded}
                        />
                    </div>
                ) : (
                    <div className="tab-panel">
                        {userData?.role === "admin"
                            ? <AdminDashboard />
                            : <UserScreen user={user} userData={userData} />}
                    </div>
                )}
            </div>
        </div>
    )
}