const fs = require("fs");
const { ReedMuller } = require("./reed-muller.js");

const TRIALS = 10000;
const M_VALUES = [3, 4, 5, 6];
const PE_VALUES = [0.01, 0.05, 0.1, 0.2, 0.25];

const generateRandomVector = (k) => {
  const v = [];
  for (let i = 0; i < k; ++i) {
    v.push(Math.random() < 0.5 ? 0 : 1);
  }
  return v;
};

const transmit = (vector, pe) => {
  let output = [...vector];

  for (let i = 0; i < output.length; ++i) {
    if (Math.random() < pe) {
      output[i] = 1 - output[i]; // Flip bit
    }
  }
  return output;
};

function areEqual(v1, v2) {
  if (v1.length !== v2.length) {
    return false;
  }

  for (let i = 0; i < v1.length; ++i) {
    if (v1[i] !== v2[i]) {
      return false;
    }
  }

  return true;
}

function runExperiment() {
  console.log(`Running simulations... (${TRIALS} trials per configuration)`);
  console.log(
    "----------------------------------------------------------------"
  );

  const rmInstances = {};
  M_VALUES.forEach((m) => {
    rmInstances[m] = new ReedMuller(m);
  });

  const experimentData = [];

  const tableResults = {};

  PE_VALUES.forEach((pe) => {
    tableResults[pe] = {};

    process.stdout.write(`Simulating Pe = ${pe.toFixed(2)}: `);

    M_VALUES.forEach((m) => {
      const rm = rmInstances[m];
      let successCount = 0;

      for (let t = 0; t < TRIALS; ++t) {
        // 1. Generate Info Vector
        const u = generateRandomVector(rm.k);

        // 2. Encode
        const c = rm.encode(u);

        // 3. Transmit
        const r = transmit(c, pe);

        // 4. Decode
        const decoded = rm.decode(r);

        // 5. Check
        if (areEqual(u, decoded)) {
          ++successCount;
        }
      }

      const successRate = (successCount / TRIALS) * 100;

      tableResults[pe][m] = successRate.toFixed(1) + "%";

      experimentData.push({
        m: m,
        n: Math.pow(2, m),
        pe: pe,
        successRate: successRate,
      });

      process.stdout.write(`[m=${m}: ${tableResults[pe][m]}] `);
    });

    console.log("");
  });

  // Export to JSON
  const fileName = "simulation_results.json";
  fs.writeFileSync(fileName, JSON.stringify(experimentData, null, 2));
  console.log(`\nData successfully saved to ${fileName}`);

  printTable(tableResults);
}

function printTable(results) {
  console.log("\n\n=== FINAL RESULTS TABLE ===");

  let header = "| Pe   |";
  M_VALUES.forEach((m) => {
    header += ` m=${m} (n=${Math.pow(2, m)}) |`;
  });
  console.log(header);

  let separator = "|------|";
  M_VALUES.forEach(() => (separator += "--------------|"));
  console.log(separator);

  PE_VALUES.forEach((pe) => {
    let row = `| ${pe.toFixed(2)} |`;
    M_VALUES.forEach((m) => {
      row += ` ${results[pe][m].padEnd(12)} |`;
    });
    console.log(row);
  });
}

runExperiment();
