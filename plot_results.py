import json
import matplotlib.pyplot as plt
from collections import defaultdict

# 1. Įkeliami duomenys
input_file = 'simulation_results.json'

try:
    with open(input_file, 'r') as f:
        data = json.load(f)
except FileNotFoundError:
    print(f"Klaida: failas '{input_file}' nerastas. Pirmiausia paleiskite 'experiments.js'.")
    exit()

# 2. Duomenys grupuojami pagal parametrą 'm'
# Struktūra: { m_reikšmė: { 'pe': [], 'rate': [] } }
grouped_data = defaultdict(lambda: {'pe': [], 'rate': []})

for entry in data:
    m = entry['m']
    grouped_data[m]['pe'].append(entry['pe'])
    grouped_data[m]['rate'].append(entry['successRate'])

# 3. Braižomas grafikas
plt.figure(figsize=(10, 6))

# Stiliai skirtingoms kreivėms
markers = ['o', 's', '^', 'D', 'v']
colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd']

# Rikiuojame pagal m, kad legendoje būtų tvarka
sorted_m = sorted(grouped_data.keys())

for i, m in enumerate(sorted_m):
    pe_vals = grouped_data[m]['pe']
    rates = grouped_data[m]['rate']
    
    # Etiketė su m, kodo ilgiu (n) ir informacijos ilgiu (k)
    n = 2**m
    label = f'RM(1, {m}), n={n}, k={m+1}'
    
    plt.plot(pe_vals, rates, 
             marker=markers[i % len(markers)], 
             color=colors[i % len(colors)], 
             linewidth=2, 
             markersize=6,
             label=label)

# 4. Formatavimas (Lietuvių kalba)
plt.title('Reed-Muller (1, m) dekodavimo efektyvumas', fontsize=14, fontweight='bold')
plt.xlabel('Kanalo klaidos tikimybė ($P_e$)', fontsize=12)
plt.ylabel('Sėkmingo dekodavimo dažnis (%)', fontsize=12)

plt.grid(True, which='both', linestyle='--', alpha=0.7)
plt.legend(title="Kodo parametrai", loc='best', fontsize=10)

# Ašių ribos geresniam vaizdui
plt.xlim(0, 0.26)
plt.ylim(0, 105)

# 5. Išsaugojimas ir atvaizdavimas
plt.tight_layout()
output_img = 'reed_muller_rezultatai.png'
plt.savefig(output_img, dpi=300)
print(f"Grafikas išsaugotas kaip '{output_img}'")
plt.show()