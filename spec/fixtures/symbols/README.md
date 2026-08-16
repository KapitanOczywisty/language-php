This directory contains input files with lists of known language symbols used to test rules with long symbol enumerations.

- `./functions.properties`: known functions (target scope `/^support\.function\..+\.php$/`)
- `./constants.properties`: known constants (target scope `/^support\.constant\..+\.php$/`)
- `./classes.properties`: known classes (target scope `/^support\.class\.builtin\.php$/`)

In these files, there should be one identifier per line, with no extra characters except comments that start with `#` or `;`.

> `.properties` is used here for convenience. `.ini` or another plain text format is also fine.

- Any identifier added to an input file must be covered by a rule in the target scope, or the test fails.
- The reverse check expands target-scope regex rules (up to `MAX_REGEX_EXPANSIONS`), tokenizes the candidates, and verifies that every candidate resolving to that scope exists in the corresponding input file.

---

To add a new identifier: add it to `php.cson`, then add it to the corresponding input file.

To refresh snapshots after changes:

```sh
UPDATE_SNAPSHOTS=1 yarn test
```
