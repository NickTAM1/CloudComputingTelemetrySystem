import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import SCORE_CHART_PY from '../python/scoreChart.py?raw';

// A global ish variable to store the Pyodide promise
let pyodideReady = null;
function getPyodide() {
    if (!pyodideReady) {
        pyodideReady = (async () => {
            const pyodide = await globalThis.loadPyodide(); // Load the core WebAssembly Python runtime
            await pyodide.loadPackage(['matplotlib']);
            return pyodide;
        })();
    }
    return pyodideReady;
}

export default function PyScoreChart() {

    // Track UI state: 'loading', 'error', 'empty', or 'done'
    const [status, setStatus] = useState('loading'); 

    useEffect(() => {
        (async () => {
            try {
                setStatus('loading');
                const [pyodide, snapshot] = await Promise.all([
                    getPyodide(),
                    getDocs(query(
                        collection(db, "users"),
                        orderBy("highscore", "desc"),
                        limit(8)
                    ))
                ]);

                const data = snapshot.docs
                    .map(doc => ({
                        name: (doc.data().displayname || doc.data().email || "?").split("@")[0].slice(0, 9),
                        score: Number(doc.data().highscore || 0)
                    }))
                    .filter(d => d.score > 0);

                if (data.length === 0) {
                    setStatus('empty');
                    return;
                }

                // Bridge JS to Python: Store data on the window object so the Python script can access 'js.window'
                window.__pyodideScoreData = JSON.stringify(data);

                // Execute the imported Python code string
                await pyodide.runPythonAsync(SCORE_CHART_PY);
                setStatus('done');
            } catch (err) {
                console.error('PyScoreChart error', err);
                setStatus('error');
            }
        })();
    }, []);

    
    return (
        <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
            <div className="chart-header">
                <h3 className="chart-title">Top Scores</h3>
                <p className="chart-subtitle">Python / Matplotlib via Pyodide</p>
            </div>
            {status === 'loading' && (
                <div className="card-loading"><div className="spinner" /></div>
            )}
            {status === 'error' && (
                <div className="card-error"><p>Chart failed to load.</p></div>
            )}
            {status === 'empty' && (
                <div className="card-empty">No scores recorded yet.</div>
            )}
            <div id="pyodide-score-chart" />
        </div>
    );
}
