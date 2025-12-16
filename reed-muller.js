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
    this.kroneckerMatrices = this.generateKroneckerMatrices();
  }

  /**
   * Sugeneruoja generuojančią matricą G.
   * Matricos dydis yra k x n.
   *
   * Struktūra:
   * - 0-oji eilutė susideda tik iš vienetų.
   * - Sekančios m eilučių atitinka kintamuosius x1...xm.
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
   * Sugeneruoja Kroneckerio matricų seką, naudojamą dekodavimui.
   *
   * Sudaromos matricos: I_{2^(m−i)} × H × I_{2^(i−1)}
   * Kur H yra 2x2 Hadamardo matrica.
   */
  generateKroneckerMatrices() {
    let matrices = [];

    const H = [
      [1, 1],
      [1, -1],
    ];

    for (let i = 1; i <= this.m; ++i) {
      const size1 = Math.pow(2, this.m - i);
      const size2 = Math.pow(2, i - 1);

      const identity1 = this.createIdentityMatrix(size1);
      const identity2 = this.createIdentityMatrix(size2);

      let intermediate = this.kroneckerProduct(identity1, H);
      let finalMatrix = this.kroneckerProduct(intermediate, identity2);

      matrices.push(finalMatrix);
    }

    return matrices;
  }

  /**
   * Užkoduoja informacinį vektorių u.
   * Atliekama vektorinė-matricinė daugyba: c = u * G (moduliu 2).
   *
   * @param {number[]} u - Informacinis vektorius (ilgis k). Turi susidėti iš 0 ir 1.
   * @returns {number[]} c - Užkoduotas vektorius (ilgis n).
   */
  encode(u) {
    if (u.length !== this.k) {
      throw new Error(`Vektoriaus ilgis turi būti ${this.k}`);
    }

    let c = new Array(this.n).fill(0);

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
   * Dekoduoja vieną Reed-Muller užkoduotą vektorių.
   *
   * @param {number[]} received - Iš kanalo gautas vektorius (ilgis n).
   * @returns {number[]} decoded - Atstatytas informacinis vektorius (ilgis k).
   */
  decode(received) {
    if (received.length !== this.n) {
      throw new Error("Neteisingas vektoriaus ilgis");
    }

    let w = [...received];

    // 1. Konversija į bipolinį signalą (0 -> -1, 1 -> 1)
    for (let i = 0; i < w.length; ++i) {
      if (w[i] === 0) {
        w[i] = -1;
      }
    }

    // 2. Taikoma Hadamardo transformacija naudojant Kroneckerio matricas
    for (let i = 0; i < this.m; ++i) {
      w = this.multiplyVectorMatrix(w, this.kroneckerMatrices[i]);
    }

    // 3. Ieškoma elemento su didžiausia absoliučia reikšme (koreliacija)
    let maxIdx = -1;
    let maxVal = -Infinity;

    for (let i = 0; i < w.length; ++i) {
      let abs = Math.abs(w[i]);
      if (abs > maxVal) {
        maxVal = abs;
        maxIdx = i;
      }
    }

    // 4. Informacijos atstatymas pagal rastą indeksą ir reikšmės ženklą
    const decoded = new Array(this.k).fill(0);

    for (let r = 0; r < this.m; r++) {
      decoded[r + 1] = (maxIdx >> r) & 1;
    }

    decoded[0] = w[maxIdx] > 0 ? 1 : 0;

    return decoded;
  }

  /**
   * Sukuria n x n dydžio vienetinę matricą.
   */
  createIdentityMatrix(size) {
    let mat = [];
    for (let i = 0; i < size; ++i) {
      let row = new Array(size).fill(0);
      row[i] = 1;
      mat.push(row);
    }
    return mat;
  }

  /**
   * Apskaičiuoja dviejų matricų A ir B Kroneckerio sandaugą.
   */
  kroneckerProduct(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const rowsB = B.length;
    const colsB = B[0].length;

    let result = [];

    for (let i = 0; i < rowsA; ++i) {
      for (let k = 0; k < rowsB; ++k) {
        let row = new Array(colsA * colsB);
        for (let j = 0; j < colsA; ++j) {
          for (let l = 0; l < colsB; ++l) {
            row[j * colsB + l] = A[i][j] * B[k][l];
          }
        }
        result.push(row);
      }
    }
    return result;
  }

  /**
   * Padaugina eilutės vektorių (1 x N) iš matricos (N x N).
   */
  multiplyVectorMatrix(vector, matrix) {
    const len = vector.length;
    let result = new Array(len).fill(0);

    for (let j = 0; j < len; ++j) {
      let sum = 0;
      for (let i = 0; i < len; ++i) {
        sum += vector[i] * matrix[i][j];
      }
      result[j] = sum;
    }

    return result;
  }
}

if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
  module.exports = { ReedMuller };
} else {
  window.ReedMuller = ReedMuller;
}
