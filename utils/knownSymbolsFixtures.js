const fs = require("fs");
const path = require("path");

const UPDATE_SNAPSHOTS =
  process.env.UPDATE_SNAPSHOTS === "1" ||
  process.env.UPDATE_SNAPSHOTS?.toLowerCase() === "true";

const fixturePath = (fileName) =>
  path.join(__dirname, "../spec/fixtures/symbols", fileName);

const readIdentifierList = (fileName) => {
  const filePath = fixturePath(fileName);
  const content = fs.readFileSync(filePath, "utf8");
  const names = [];
  const seen = new Set();

  content.split(/\r?\n/).forEach((raw, index) => {
    let line = raw.trim();

    // Ignore comments - lines starting with `#` or `;`
    if (line.length === 0 || line.startsWith("#") || line.startsWith(";")) {
      return;
    }

    // Handle trailing comments as well
    line = line.split(/\s*[;#]/)[0];

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(line)) {
      throw new Error(
        `Invalid identifier name in ${filePath}:${index + 1}: "${raw}"`,
      );
    }

    if (!seen.has(line)) {
      seen.add(line);
      names.push(line);
    }
  });

  return names.sort((a, b) => a.localeCompare(b));
};

const readSnapshot = (snapshotName) => {
  const snapshotPath = fixturePath(snapshotName);
  if (!fs.existsSync(snapshotPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
};

const writeSnapshot = (snapshotName, scopes) => {
  const snapshotPath = fixturePath(snapshotName);
  const payload = Object.fromEntries(
    Object.entries(scopes).sort(([a], [b]) => a.localeCompare(b)),
  );

  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(
    snapshotPath,
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
};

module.exports = {
  UPDATE_SNAPSHOTS,
  readIdentifierList,
  readSnapshot,
  writeSnapshot,
};
