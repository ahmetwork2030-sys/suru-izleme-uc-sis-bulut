# Enerji testi grafiği: enerji.json -> enerji.png (rapordaki şekil)
import json, os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch

BURADA = os.path.dirname(os.path.abspath(__file__))
d = json.load(open(os.path.join(BURADA, 'enerji.json'), encoding='utf-8'))['ana']

ZEMIN, IZGARA, MUREKKEP, SOLUK = '#fcfcfb', '#e9e8e4', '#0b0b0b', '#52514e'
KLASIK, UYUYAN = '#eb6834', '#2a78d6'
PROF = [('P1', 'P1\nSürekli'), ('P2', 'P2\nGünlük\naralıklı'), ('P3', 'P3\nUzun\nkesinti'), ('P4', 'P4\nSinyal\ngölgeli')]
virgul = lambda v, n=2: f'{v:.{n}f}'.replace('.', ',')

plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 8})
fig, ax = plt.subplots(figsize=(3.45, 2.55), dpi=300)
fig.patch.set_facecolor(ZEMIN); ax.set_facecolor(ZEMIN)

G, A = 0.34, 0.04          # çubuk genişliği, iki çubuk arası boşluk
for i, (p, _) in enumerate(PROF):
    k, u = d[p + '|K']['WhGun'], d[p + '|U']['WhGun']
    for x, v, renk in [(i - G / 2 - A / 2, k, KLASIK), (i + G / 2 + A / 2, u, UYUYAN)]:
        # yalnızca üst köşeleri yuvarlatılmış çubuk
        r = 0.04
        ax.add_patch(FancyBboxPatch((x - G / 2, 0), G, max(v, 0.001), boxstyle=f'round,pad=0,rounding_size={r}',
                                    mutation_aspect=8, linewidth=0, facecolor=renk))
        ax.add_patch(plt.Rectangle((x - G / 2, 0), G, min(v, 0.3), linewidth=0, facecolor=renk))
    ax.text(i - G / 2 - A / 2, k + 0.12, virgul(k), ha='center', va='bottom', fontsize=7, color=MUREKKEP)
    ax.text(i + G / 2 + A / 2, u + 0.12, virgul(u), ha='center', va='bottom', fontsize=7, color=MUREKKEP)
    ax.text(i + G / 2 + A / 2, u + 0.62, '−%' + virgul(100 * (1 - u / k), 0), ha='center', va='bottom',
            fontsize=7, color=SOLUK, fontweight='bold')

ax.set_xlim(-0.6, len(PROF) - 0.4); ax.set_ylim(0, 8.4)
ax.set_xticks(range(len(PROF))); ax.set_xticklabels([e for _, e in PROF], fontsize=7, color=SOLUK)
ax.set_yticks([0, 2, 4, 6, 8]); ax.set_yticklabels(['0', '2', '4', '6', '8'], fontsize=7, color=SOLUK)
ax.set_ylabel('Modem enerjisi (Wh / gün)', fontsize=7.5, color=SOLUK)
ax.grid(axis='y', color=IZGARA, linewidth=0.6); ax.set_axisbelow(True)
for s in ['top', 'right', 'left']: ax.spines[s].set_visible(False)
ax.spines['bottom'].set_color('#d1d0cb'); ax.tick_params(length=0)
from matplotlib.patches import Patch
ax.legend(handles=[Patch(facecolor=KLASIK, label='Klasik (kalıcı oturum)'), Patch(facecolor=UYUYAN, label='Uyuyan Bulut')],
          loc='upper right', frameon=False, fontsize=7, handlelength=1.0, handleheight=0.8, borderaxespad=0.1)
fig.tight_layout(pad=0.3)
out = os.path.join(BURADA, 'enerji.png')
fig.savefig(out, facecolor=ZEMIN)
print(out)
