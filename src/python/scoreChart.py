import json, io, base64
import matplotlib
matplotlib.use('agg')
import matplotlib.pyplot as plt
from js import document, window

data = json.loads(window.__pyodideScoreData)
names  = [d['name']  for d in data]
scores = [d['score'] for d in data]

fig, ax = plt.subplots(figsize=(7, 3.5))
fig.patch.set_facecolor('#221A15')
ax.set_facecolor('#2E2219')

ax.bar(names, scores, color='#E85D2A', edgecolor='#C1440E', linewidth=0.8)
ax.set_title('Top Player Scores', color='#EDE0D4', fontsize=13, pad=10)
ax.set_ylabel('High Score', color='#EDE0D4')
ax.tick_params(colors='#EDE0D4', labelsize=8)
for spine in ax.spines.values():
    spine.set_edgecolor('#4A3728')

buf = io.BytesIO()
fig.savefig(buf, format='png', bbox_inches='tight', facecolor=fig.get_facecolor())
buf.seek(0)
img_b64 = base64.b64encode(buf.read()).decode('utf-8')
plt.close(fig)

target = document.getElementById('pyodide-score-chart')
if target:
    target.innerHTML = f'<img src="data:image/png;base64,{img_b64}" alt="Score Chart" style="width:100%;border-radius:8px;" />'
