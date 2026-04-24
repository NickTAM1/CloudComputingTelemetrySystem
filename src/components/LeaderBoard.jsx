import {useState, useEffect} from 'react';
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

const LEADERBOARD_LIMIT = 10;

export default function LeaderBoard({currentUserId}) {
    const [leaders, setLeaders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
         const unsubscribe = onSnapshot(
            collection(db, "users"),
            (snapshot) => {
                const data = snapshot.docs
                    .map((doc) => {
                        const user = doc.data();
                        return {
                            id: doc.id,
                            name: user.displayname || user.displayName || user.name || "Anonymous",
                            score: user.highscore ?? user.highScore ?? user.score ?? 0,
                            gamesPlayed: user.gamesPlayed ?? user.gamePlayer ?? 0,
                        };
                    })
                    .sort((a, b) => b.score - a.score)
                    .slice(0, LEADERBOARD_LIMIT);

                setLeaders(data);
                setLoading(false);
            },
            () => {
                setLeaders([]);
                setLoading(false);
            }
         );
         
         return () => unsubscribe();
    }, []);
    
    if(loading) {
        return(
        <div className="leaderboard">
            <h2 className="card-title">Leaderboard</h2>
                <div className="card-loading">
                    <div className="spinner"/>
                </div >
        </div>);
    }


return (
    <div className="leaderboard-card">
     <div className="leaderboard-header">
        <h2 className="card-title">Leaderboard</h2>
        <div className="card-badge">Top {LEADERBOARD_LIMIT}</div>
     </div>
        {leaders.length === 0 ? (
            <p>No scores yet :).</p>
         ):(
            <div className="leaderboard-list">
                {leaders.map((player, index) => {
                    const isCurrentUser = player.id === currentUserId;
                    const rankClass = 
                        index === 0 ? "rank-gold" : index === 1 ? "rank-silver" : index === 2 ? "rank-bronze" : "";
                    return (
                        <div key={player.id} className={`leaderboard-row ${isCurrentUser ? "is-you" : ""}`}>
                            <span className={`rank ${rankClass}`}>
                               {index + 1}
                            </span>
                            <div className="leader-info">
                                <span className="leader-name">
                                    {player.name || "Anonymous"}
                                    {isCurrentUser && <span className="you-tag">YOU</span>}
                                </span>
                            </div>

                            <div className="leader-stats">
                                <span className="leader-score">{player.score ?? 0}</span>
                                <span className="leader-games">{player.gamesPlayed ?? 0}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
        )}
    </div>
)}
