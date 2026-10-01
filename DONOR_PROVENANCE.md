# Donor Provenance Registry

## Purpose

This registry is the mandatory provenance and licensing gate for every external file, code unit, or reference-derived design adopted into HomePlus/HomeCloud. It exists to preserve attribution, keep donor boundaries explicit, and prevent unlicensed or uncontrolled derivation.

No donor code or reference-derived design has been adopted at the time this registry was initialized. An entry must be added and reviewed before an adopted unit enters the repository.

## Required fields

For each adopted file or code unit, record all of the following both here and in the adopted file where its format permits:

```text
SPDX-License-Identifier: <id>
Provenance: <owner>/<repo> @ <40-character commit SHA>
Source path: <path in the donor>
Upstream copyright: <verbatim copyright line from the donor LICENSE>
Modifications: <what changed and the HomeCloud constraint that required it>
```

For each independently designed unit informed by a reference-only donor, record:

```text
Idea source: <donor and file:line>
HomeCloud constraint that makes this necessary: <constraint with HomePlus file:line>
Independent design: <what HomePlus designed independently>
```

## Licensing and provenance rules

1. Verify a donor's license from the donor repository at the exact recorded commit before adoption. A README claim is not a substitute for a license file.
2. Preserve every required notice and copyright statement. Never imply upstream endorsement.
3. One adopted file may contain code from only one donor. Keep donor code and HomePlus code separated by an explicit boundary.
4. Record a full 40-character donor commit SHA and source path; branch names, tags, and moving references are insufficient.
5. Reference-only sources may inform an independent design only when a concrete HomeCloud constraint is recorded. If that constraint cannot be stated, the design must be re-derived.
6. Never transliterate Immich or Twake line-for-line into another language, and never copy their code, schema, SQL, constants, or fixtures.
7. Do not adopt code with a missing, incompatible, or ambiguous license. Do not remove MIT notices.
8. Update this registry in the same change that first adopts or derives the unit.

## Adopted units

| HomePlus unit | Adoption type | SPDX | Donor and 40-char SHA | Source path / idea source | Upstream copyright | Modifications / HomeCloud constraint / independent design |
|---|---|---|---|---|---|---|

<!-- Intentionally empty. Nothing has been adopted yet. -->
