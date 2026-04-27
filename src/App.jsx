import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import LoginForm from './components/LoginForm';
import GamePortal from './components/GamePortal';

async function createUserProfileIfNeeded(firebaseUser) {
    const userRef = doc(db, "users", firebaseUser.uid);
    const snapshot = await getDoc(userRef);

    if (!snapshot.exists()) {
        await setDoc(userRef, {
            email: firebaseUser.email,
            displayname: firebaseUser.displayName || "Player",
            photoURL: firebaseUser.photoURL || null,
            createdAt: serverTimestamp(),
            highscore: 0,
            gamesPlayed: 0,
            role: "player",
        });
        console.log(`User ${firebaseUser.email} created.`);
    }
}

export default function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                await createUserProfileIfNeeded(firebaseUser);
                const userRef = doc(db, "users", firebaseUser.uid);
                const snapshot = await getDoc(userRef);
                setUserData(snapshot.exists() ? snapshot.data() : null);
                setUser(firebaseUser);
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="spinner" />
                <p>Checking auth state...</p>
            </div>
        );
    }

    return (
        <div className="app">
            {user ? <GamePortal user={user} userData={userData} /> : <LoginForm />}
        </div>
    );
}

