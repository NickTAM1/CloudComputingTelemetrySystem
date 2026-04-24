import LeaderBoard from "./LeaderBoard";

export default function UserScreen({ user, userData }) {
    const displayName = userData?.displayname || user.displayName || user.email || "Player";
    const initials = displayName.charAt(0).toUpperCase();
    const highScore = userData?.highscore ?? 0;
    const gamesPlayed = userData?.gamesPlayed ?? 0;
    const role = userData?.role || "player";

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
                </div>
            </div>

            <LeaderBoard currentUserId={user.uid} />
        </div>
    );
}
