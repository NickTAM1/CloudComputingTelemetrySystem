import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import LeaderBoard from "./LeaderBoard";

export default function UserScreen({ user, userData }) {
    const displayName = userData?.displayname || user.displayName || user.email || "Player";
    const initials = displayName.charAt(0).toUpperCase();
    const highScore = userData?.highscore ?? 0;
    const gamesPlayed = userData?.gamesPlayed ?? 0;
    const role = userData?.role || "player";
    const lastPlayedAt = userData?.lastPlayedAt?.seconds
        ? new Date(userData.lastPlayedAt.seconds * 1000).toLocaleDateString()
        : null;

    const [recentSessions, setRecentSessions] = useState([]);

    useEffect(() => {
        const q = query(
            collection(db, "scores"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(5)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRecentSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, () => {});
        return () => unsubscribe();
    }, [user.uid]);

    return (
        <div className="user-screen">
            <div className="profile-card">
                <div className="profile-header">
                    {user.photoURL
                        ? <img src={user.photoURL} alt="avatar" className="profile-avatar" />
                        : <div className="profile-avatar-placeholder">{initials}</div>
                    }
                    <div className="profile-info">
                        <h2 className="profile-name">{displayName}</h2>
                        <p className="profile-email">{user.email}</p>
                        <span className={`profile-role-badge ${role === "admin" ? "role-admin" : "role-player"}`}>
                            {role}
                        </span>
                    </div>
                </div>
                <div className="profile-stats">
                    <div className="stat">
                        <span className="stat-label">High Score</span>
                        <span className="stat-value highlight">{highScore.toLocaleString()}</span>
                    </div>
                    <div className="stat-divider" />
                    <div className="stat">
                        <span className="stat-label">Games Played</span>
                        <span className="stat-value">{gamesPlayed}</span>
                    </div>
                    {lastPlayedAt && (
                        <>
                            <div className="stat-divider" />
                            <div className="stat">
                                <span className="stat-label">Last Played</span>
                                <span className="stat-value">{lastPlayedAt}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {recentSessions.length > 0 && (
                <div className="history-card">
                    <div className="card-header">
                        <h2 className="card-title">Recent Sessions</h2>
                        <div className="card-badge">Last {recentSessions.length}</div>
                    </div>
                    <div className="history-list">
                        {recentSessions.map((session) => {
                            const endDate = session.sessionEndAtIso
                                ? new Date(session.sessionEndAtIso)
                                : session.createdAt?.seconds
                                    ? new Date(session.createdAt.seconds * 1000)
                                    : null;
                            const startDate = session.sessionStartAtIso
                                ? new Date(session.sessionStartAtIso)
                                : null;
                            const pipes = session.pipesPassed ?? session.pipes ?? 0;
                            const duration = session.durationSeconds ?? session.duration ?? 0;
                            return (
                                <div key={session.id} className="history-row">
                                    <div className="history-score-col">
                                        <span className="history-score">{session.score ?? 0}</span>
                                        <span className="history-label">pts</span>
                                    </div>
                                    <div className="history-details">
                                        {pipes > 0 && <span>{pipes} pipes</span>}
                                        {pipes > 0 && duration > 0 && <span className="history-dot">·</span>}
                                        {duration > 0 && <span>{duration}s</span>}
                                        {startDate && (
                                            <>
                                                <span className="history-dot">·</span>
                                                <span>Start: {startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                            </>
                                        )}
                                    </div>
                                    {endDate && (
                                        <span className="history-time">
                                            {endDate.toLocaleDateString([], { month: "short", day: "numeric" })}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <LeaderBoard currentUserId={user.uid} />
        </div>
    );
}
