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
    const [loading, setLoading] = useState(true);
    const [nowMs] = useState(() => Date.now());

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
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
            (nowMs - u.createdAt.seconds * 1000) / (7 * 24 * 60 * 60 * 1000)
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

    const totalUsers = users.length;
    const totalGames = users.reduce((sum, u) => sum + (u.gamesPlayed ?? 0), 0);
    const avgScore = users.length
        ? Math.round(users.reduce((sum, u) => sum + (u.highscore ?? 0), 0) / users.length)
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
                    data={newUsersData}
                    valueKey="count"
                    labelKey="label"
                    color="var(--secondary)"
                    title="New Players per Week"
                    subtitle="Registrations over last 5 weeks"
                />
                <BarChart
                    data={topPlayersData}
                    valueKey="games"
                    labelKey="label"
                    color="var(--accent)"
                    title="Most Active Players"
                    subtitle="Total games played"
                />
            </div>
        </div>
    );
}
