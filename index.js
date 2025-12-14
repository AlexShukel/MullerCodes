class ReedMuller {
  constructor(m) {
    this.m = m;
    this.n = Math.pow(2, m);
    this.k = m + 1;
    this.generateMatrix();
  }

  generateMatrix() {
    this.G = [];
    let row0 = new Array(this.n).fill(1);
    this.G.push(row0);

    for (let r = 0; r < this.m; ++r) {
      let row = new Array(this.n);
      for (let c = 0; c < this.n; ++c) {
        row[c] = (c >> r) & 1;
      }
      this.G.push(row);
    }
  }

  encode(u) {
    if (u.length !== this.k)
      throw new Error(`Vektoriaus ilgis turi būti ${this.k}`);
    let c = new Array(this.n).fill(0);

    // u * G
    for (let col = 0; col < this.n; ++col) {
      let sum = 0;
      for (let row = 0; row < this.k; ++row) {
        sum ^= u[row] & this.G[row][col];
      }
      c[col] = sum;
    }

    return c;
  }

  decode(received) {
    if (received.length !== this.n) {
      throw new Error("Neteisingas vektoriaus ilgis");
    }

    // 1. Convert to bipolar
    let w = new Float32Array(this.n);
    for (let i = 0; i < this.n; ++i) {
      w[i] = received[i] === 0 ? 1 : -1;
    }

    this.fht(w);

    let maxVal = -Infinity;
    let maxIdx = -1;

    for (let i = 0; i < this.n; ++i) {
      let abs = Math.abs(w[i]);
      if (abs > maxVal) {
        maxVal = abs;
        maxIdx = i;
      }
    }

    let decoded = new Array(this.k).fill(0);

    for (let r = 0; r < this.m; r++) {
      decoded[r + 1] = (maxIdx >> r) & 1;
    }

    decoded[0] = w[maxIdx] > 0 ? 0 : 1;

    return decoded;
  }

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

const transmit = (vector, pe) => {
  let output = [...vector];

  for (let i = 0; i < output.length; ++i) {
    if (Math.random() < pe) {
      output[i] = 1 - output[i]; // Flip bit
    }
  }
  return output;
};

let rm = null;

const updateParams = () => {
  let m = parseInt(document.getElementById("paramM").value);
  let n = Math.pow(2, m);
  let k = m + 1;
  document.getElementById("codeParamsDisplay").innerText = `n=${n}, k=${k}`;
  rm = new ReedMuller(m);
};

/* SCENARIO 1 */
let s1LastEncoded = [];

const updateS1Errors = (output) => {
  let errors = 0;
  let errorIndices = [];
  for (let i = 0; i < rm.n; ++i) {
    if (output[i] !== s1LastEncoded[i]) {
      ++errors;
      errorIndices.push(i);
    }
  }

  document.getElementById(
    "s1ErrorCount"
  ).innerText = `${errors} (pozicijos: ${errorIndices.join(", ")})`;
};

document.getElementById("s1ReceivedInput").addEventListener("blur", () => {
  const raw = document.getElementById("s1ReceivedInput").value;
  const value = raw.split("").map(Number);
  updateS1Errors(value);
});

const s1Encode = () => {
  updateParams();
  const inputStr = document.getElementById("vectorInput").value.trim();
  const pe = parseFloat(document.getElementById("paramPe").value);

  // Validation
  if (!/^[01]+$/.test(inputStr)) {
    alert("Vektorius turi susidėti tik iš 0 ir 1.");
    return;
  }
  if (inputStr.length !== rm.k) {
    alert(`Vektoriaus ilgis turi būti ${rm.k} (nes m=${rm.m}).`);
    return;
  }

  const u = inputStr.split("").map(Number);
  document.getElementById("s1Original").innerText = u.join("");

  // Encode
  s1LastEncoded = rm.encode(u);
  document.getElementById("s1Encoded").innerText = s1LastEncoded.join("");

  // Transmit
  const output = transmit(s1LastEncoded, pe);

  document.getElementById("scen1Results").style.display = "block";
  const receivedInput = document.getElementById("s1ReceivedInput");
  receivedInput.value = output.join("");
  updateS1Errors(output);
};

const s1Decode = () => {
  const rawInput = document.getElementById("s1ReceivedInput").value.trim();

  // Validation
  if (rawInput.length !== rm.n || !/^[01]+$/.test(rawInput)) {
    alert(`Neteisingas vektorius. Turi būti ${rm.n} bitų (0/1).`);
    return;
  }

  const received = rawInput.split("").map(Number);
  updateS1Errors(received);

  // Decode
  const decoded = rm.decode(received);

  const original = document.getElementById("vectorInput").value;
  const decodedStr = decoded.join("");
  const isCorrect = original === decodedStr;
  const resultSpan = document.getElementById("s1Decoded");
  resultSpan.innerText = decodedStr;
  resultSpan.className = isCorrect ? "" : "error-highlight";

  document.getElementById("s1Status").innerHTML = isCorrect
    ? `<span style="color:green">✅ Dekoduota sėkmingai</span>`
    : `<span style="color:red">❌ Dekodavimo klaida</span>`;
};

/* SCENARIO 2 */

const textToBits = (text) => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);

  let bits = [];
  for (const b of bytes) {
    for (let i = 7; i >= 0; --i) {
      bits.push((b >> i) & 1);
    }
  }

  return bits;
};

const bitsToText = (bits) => {
  let bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      if (i + j < bits.length) {
        byte = (byte << 1) | bits[i + j];
      }
    }
    bytes.push(byte);
  }

  const decoder = new TextDecoder();
  return decoder.decode(new Uint8Array(bytes)).replace(/\0+$/, ""); // Remove null bytes at the end
};

const runScenario2 = () => {
  updateParams();
  const text = document.getElementById("textInput").value;
  const pe = parseFloat(document.getElementById("paramPe").value);

  const bits = textToBits(text);

  // No coding
  const responseNoCoding = transmit(bits, pe);
  const textNoCoding = bitsToText(responseNoCoding);
  document.getElementById("textNoCode").innerText = textNoCoding;

  // With coding
  const chunks = [];
  for (let i = 0; i < bits.length; i += rm.k) {
    let chunk = bits.slice(i, i + rm.k);
    while (chunk.length < rm.k) {
      chunk.push(0); // Pad with zeros
    }
    chunks.push(chunk);
  }

  const originalLen = bits.length;

  let decodedBits = [];
  for (let chunk of chunks) {
    // Encode
    let encoded = rm.encode(chunk);
    // Transmit
    let received = transmit(encoded, pe);
    // Decode
    let decodedChunk = rm.decode(received);
    decodedBits.push(...decodedChunk);
  }

  decodedBits = decodedBits.slice(0, originalLen);
  const textWithCoding = bitsToText(decodedBits);
  document.getElementById("textWithCode").innerText = textWithCoding;
};

/* SCENARIO 3 */

let selectedFile = null;

document.getElementById("imageInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    selectedFile = file;

    document.getElementById("imgNoCodeContainer").innerHTML = "";
    document.getElementById("imgWithCodeContainer").innerHTML = "";

    // Show Original Immediately using a Blob URL (Fast)
    const url = URL.createObjectURL(file);
    const container = document.getElementById("imgOriginalContainer");
    container.innerHTML = `<img src="${url}">`;
  }
});

const bitsToBytes = (bits) => {
  const len = Math.ceil(bits.length / 8);
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; ++i) {
    let val = 0;

    for (let j = 0; j < 8; ++j) {
      if (i * 8 + j < bits.length) {
        val = (val << 1) | bits[i * 8 + j];
      }
    }

    bytes[i] = val;
  }

  return bytes;
};

const showImage = (bytes, containerId) => {
  const blob = new Blob([bytes], { type: "image/bmp" });
  const url = URL.createObjectURL(blob);
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  const img = document.createElement("img");
  img.src = url;
  container.appendChild(img);
};

const BMP_FILE_HEADER_SIZE = 54;
const runScenario3 = () => {
  updateParams();
  const pe = parseFloat(document.getElementById("paramPe").value);

  const reader = new FileReader();
  reader.onload = function (e) {
    const arrayBuffer = e.target.result;
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.length <= BMP_FILE_HEADER_SIZE) {
      alert("Failas per mažas arba ne BMP.");
      return;
    }

    const header = bytes.slice(0, BMP_FILE_HEADER_SIZE);
    const body = bytes.slice(BMP_FILE_HEADER_SIZE);

    const bodyBits = [];
    for (const b of body) {
      for (let i = 7; i >= 0; --i) {
        bodyBits.push((b >> i) & 1);
      }
    }

    // No coding
    const output = transmit(bodyBits, pe);
    const corruptedBody = bitsToBytes(output);
    const corruptedFile = new Uint8Array(header.length + corruptedBody.length);
    corruptedFile.set(header);
    corruptedFile.set(corruptedBody, header.length);
    showImage(corruptedFile, "imgNoCodeContainer");

    // With coding
    const chunks = [];
    const totalBits = bodyBits.length;
    for (let i = 0; i < totalBits; i += rm.k) {
      const chunk = bodyBits.slice(i, i + rm.k);
      while (chunk.length < rm.k) {
        chunk.push(0);
      }
      chunks.push(chunk);
    }

    let decodedBodyBits = [];

    for (const chunk of chunks) {
      const encoded = rm.encode(chunk);
      const received = transmit(encoded, pe);
      const decoded = rm.decode(received);
      decodedBodyBits.push(...decoded);
    }

    decodedBodyBits = decodedBodyBits.slice(0, totalBits);
    const restoredBody = bitsToBytes(decodedBodyBits);

    const restoredFile = new Uint8Array(header.length + restoredBody.length);
    restoredFile.set(header);
    restoredFile.set(restoredBody, header.length);
    showImage(restoredFile, "imgWithCodeContainer");
  };

  reader.readAsArrayBuffer(selectedFile);
};
