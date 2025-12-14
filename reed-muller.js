class ReedMuller {
  /**
   * Konstruktorius inicializuoja Reed-Muller (1, m) kodo parametrus.
   *
   * @param {number} m - Parametras m, nuo kurio priklauso kodo ilgis ir dimensija.
   *                     Kodo ilgis n = 2^m.
   *                     Informacijos ilgis k = m + 1.
   */
  constructor(m) {
    this.m = m;
    this.n = Math.pow(2, m);
    this.k = m + 1;
    this.generateMatrix();
  }

  /**
   * Sugeneruoja generuojančią matricą G.
   * Matricos dydis yra k x n (kur k = m + 1, n = 2^m).
   *
   * Struktūra:
   * - 0-oji eilutė susideda tik iš vienetų (v0).
   * - Sekančios m eilučių (v1...vm) atitinka kintamuosius x1...xm tiesinėse funkcijose.
   */
  generateMatrix() {
    this.G = [];

    // Pirmoji eilutė - visi vienetai
    let row0 = new Array(this.n).fill(1);
    this.G.push(row0);

    // Generuojamos likusios eilutės pagal stulpelio dvejetainę išraišką
    for (let r = 0; r < this.m; ++r) {
      let row = new Array(this.n);
      for (let c = 0; c < this.n; ++c) {
        row[c] = (c >> r) & 1;
      }
      this.G.push(row);
    }
  }

  /**
   * Užkoduoja informacinį vektorių u.
   * Atliekama vektorinė-matricinė daugyba: c = u * G (moduliu 2).
   *
   * @param {number[]} u - Informacinis vektorius (ilgis k). Turi susidėti iš 0 ir 1.
   * @returns {number[]} c - Užkoduotas vektorius (ilgis n).
   * @throws {Error} Jei įvesties vektoriaus ilgis neatitinka parametro k.
   */
  encode(u) {
    if (u.length !== this.k) {
      throw new Error(`Vektoriaus ilgis turi būti ${this.k}`);
    }

    let c = new Array(this.n).fill(0);

    // Matricos daugyba c = u * G
    for (let col = 0; col < this.n; ++col) {
      let sum = 0;
      for (let row = 0; row < this.k; ++row) {
        sum ^= u[row] & this.G[row][col];
      }
      c[col] = sum;
    }

    return c;
  }

  /**
   * Dekoduoja gautą vektorių naudojant Greitąją Hadamardo Transformaciją (FHT).
   * Tai yra didžiausio tikėtinumo (Maximum Likelihood) dekodavimas.
   *
   * @param {number[]} received - Iš kanalo gautas vektorius (ilgis n), gali turėti klaidų.
   * @returns {number[]} decoded - Atstatytas informacinis vektorius (ilgis k).
   * @throws {Error} Jei gauto vektoriaus ilgis neatitinka n.
   */
  decode(received) {
    if (received.length !== this.n) {
      throw new Error("Neteisingas vektoriaus ilgis");
    }

    // 1. Konversija į bipolinį signalą (0 -> 1, 1 -> -1)
    let w = new Float32Array(this.n);
    for (let i = 0; i < this.n; ++i) {
      w[i] = received[i] === 0 ? 1 : -1;
    }

    // 2. Atliekama Greitoji Hadamardo Transformacija
    this.fht(w);

    // 3. Ieškoma elemento su didžiausia absoliučia reikšme (koreliacija)
    let maxVal = -Infinity;
    let maxIdx = -1;

    for (let i = 0; i < this.n; ++i) {
      let abs = Math.abs(w[i]);
      if (abs > maxVal) {
        maxVal = abs;
        maxIdx = i;
      }
    }

    // 4. Informacijos atstatymas pagal rastą indeksą ir reikšmės ženklą
    let decoded = new Array(this.k).fill(0);

    for (let r = 0; r < this.m; r++) {
      decoded[r + 1] = (maxIdx >> r) & 1;
    }

    decoded[0] = w[maxIdx] > 0 ? 0 : 1;

    return decoded;
  }

  /**
   * Greitoji Hadamardo Transformacija (Fast Hadamard Transform).
   * Algoritmas veikia "in-place" principu, modifikuodamas masyvą a.
   * Sudėtingumas: O(n log n).
   *
   * @param {Float32Array|number[]} a - Bipolinis duomenų masyvas.
   */
  fht(a) {
    let n = a.length;
    for (let h = 1; h < n; h *= 2) {
      for (let i = 0; i < n; i += h * 2) {
        for (let j = i; j < i + h; ++j) {
          let x = a[j];
          let y = a[j + h];
          a[j] = x + y;
          a[j + h] = x - y;
        }
      }
    }
  }
}

// Detect environment: Node.js vs Browser
if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = { ReedMuller };
} else {
  window.ReedMuller = ReedMuller;
}
