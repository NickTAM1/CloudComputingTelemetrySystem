import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

function BarChart({ data, valueKey, labelKey, color, title, subtitle }) {
    const max = Math.max(...data.map(d => d[valueKey]), 1);

    return (
        <div className="chart-card">
            <div className="chart-header">
                <h3 className="chart-title">{title}</h3>
                {subtitle && <p className="chart-subtitle">{subtitle}</p>}
            </div>
            <div className="bar-chart">
                {data.map((item, i) => {
                    const pct = (item[valueKey] / max) * 100;
                    return (
                        <div key={i} className="bar-group">
                            <span className="bar-value">{item[valueKey]}</span>
                            <div className="bar-track">
                                <div
                                    className="bar-fill"
                                    style={{ height: `${Math.max(pct, 2)}%`, background: color }}
                                />
                            </div>
                            <span className="bar-label">{item[labelKey]}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function weekLabel(weeksAgo) {
    if (weeksAgo === 0) return "This wk";
    if (weeksAgo === 1) return "Last wk";
    return `${weeksAgo}w ago`;
}

export default function AdminDashboard() {
    const [users, setUsers] = useState([]);
    const [scores, setScores] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubscribeScores = onSnapshot(collection(db, "scores"), (snapshot) => {
            setScores(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => {
            unsubscribeUsers();
            unsubscribeScores();
        };
    }, []);

    if (loading) {
        return (
            <div className="card-loading">
                <div className="spinner" />
            </div>
        );
    }

    // New players per week over the last 5 weeks
    const weekBuckets = Array.from({ length: 5 }, (_, i) => ({ weeksAgo: i, count: 0 }));
    users.forEach(u => {
        if (!u.createdAt?.seconds) return;
        const weeksAgo = Math.floor(
            (Date.now() - u.createdAt.seconds * 1000) / (7 * 24 * 60 * 60 * 1000)
        );
        if (weeksAgo >= 0 && weeksAgo < 5) {
            weekBuckets[weeksAgo].count += 1;
        }
    });
    const newUsersData = [...weekBuckets]
        .reverse()
        .map(b => ({ label: weekLabel(b.weeksAgo), count: b.count }));

    // Top 8 most active players by games played
    const topPlayersData = [...users]
        .sort((a, b) => (b.gamesPlayed ?? 0) - (a.gamesPlayed ?? 0))
        .slice(0, 8)
        .map(u => ({
            label: (u.displayname || u.email || "?").split("@")[0].slice(0, 9),
            games: u.gamesPlayed ?? 0,
        }));

    const today = new Date();
    const sessionsByDay = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        const label = d.toLocaleDateString(undefined, { weekday: "short" });
        return { key: d.toDateString(), label, count: 0 };
    });

    scores.forEach((s) => {
        const dateValue = s.sessionEndAtIso || s.sessionStartAtIso;
        if (!dateValue) return;
        const key = new Date(dateValue).toDateString();
        const bucket = sessionsByDay.find((d) => d.key === key);
        if (bucket) bucket.count += 1;
    });

    const sessionsTrendData = sessionsByDay.map(({ label, count }) => ({ label, count }));

    const topSessionScoresData = [...scores]
        .filter((s) => Number.isFinite(Number(s.score)))
        .sort((a, b) => Number(b.score) - Number(a.score))
        .slice(0, 8)
        .map((s, idx) => ({
            label: (s.playerName || `P${idx + 1}`).slice(0, 9),
            score: Number(s.score || 0),
        }));

    const totalUsers = users.length;
    const totalGames = scores.length;
    const avgScore = scores.length
        ? Math.round(scores.reduce((sum, s) => sum + Number(s.score || 0), 0) / scores.length)
        : 0;

    return (
        <div className="admin-dashboard">
            <div className="admin-header">
                <h2 className="admin-title">Admin Dashboard</h2>
                <span className="admin-badge">Admin Only</span>
            </div>

            <div className="admin-stats-row">
                <div className="admin-stat-card">
                    <span className="admin-stat-label">Total Players</span>
                    <span className="admin-stat-value">{totalUsers}</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-label">Total Games Played</span>
                    <span className="admin-stat-value">{totalGames}</span>
                </div>
                <div className="admin-stat-card">
                    <span className="admin-stat-label">Avg High Score</span>
                    <span className="admin-stat-value">{avgScore.toLocaleString()}</span>
                </div>
            </div>

            <div className="charts-grid">
                <BarChart
                    data={sessionsTrendData}
                    valueKey="count"
                    labelKey="label"
                    color="var(--secondary)"
                    title="Game Sessions (Last 7 Days)"
                    subtitle="Live telemetry from Unity sessions"
                />
                <BarChart
                    data={topSessionScoresData.length ? topSessionScoresData : topPlayersData}
                    valueKey={topSessionScoresData.length ? "score" : "games"}
                    labelKey="label"
                    color="var(--accent)"
                    title={topSessionScoresData.length ? "Top Session Scores" : "Most Active Players"}
                    subtitle={topSessionScoresData.length ? "Highest recorded Unity session scores" : "Total games played"}
                />
            </div>
        </div>
    );
}
