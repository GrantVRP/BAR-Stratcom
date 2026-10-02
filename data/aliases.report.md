# Harvested Aliases Report

Total valid aliases preserved: **107**

## Kept Cross-Faction Aliases (Resolved by Faction)

These aliases appear in multiple factions and are resolved in-game by the player’s active faction (03 §3).

| Alias | Matched Units |
|-------|---------------|
| `Advanced Fusion` | `armafus` (armada), `corafus` (cortex) |
| `Advanced Solar` | `armadvsol` (armada), `coradvsol` (cortex) |
| `Advanced Solar Generator` | `armadvsol` (armada), `coradvsol` (cortex) |
| `AFUS` | `armafus` (armada), `corafus` (cortex) |
| `Air Plant` | `armap` (armada), `corap` (cortex) |
| `Air Transport` | `armatlas` (armada), `corvalk` (cortex) |
| `Aircraft Factory` | `armap` (armada), `corap` (cortex) |
| `Con Air` | `armca` (armada), `corca` (cortex) |
| `Con Bot` | `armck` (armada), `corck` (cortex) |
| `Con Vehicle` | `armcv` (armada), `corcv` (cortex) |
| `Dragons Teeth` | `armdrag` (armada), `cordrag` (cortex) |
| `Fusion` | `armfus` (armada), `corfus` (cortex) |
| `Light Laser Tower` | `armllt` (armada), `corllt` (cortex) |
| `LLT` | `armllt` (armada), `corllt` (cortex) |
| `Mex` | `armmex` (armada), `cormex` (cortex) |
| `Nano Turret` | `armnanotc` (armada), `cornanotc` (cortex) |
| `Radar` | `armrad` (armada), `corrad` (cortex) |
| `Shadow` | `armthund` (armada), `corshad` (cortex) |
| `Solar` | `armsolar` (armada), `corsolar` (cortex) |
| `T2 Aircraft Plant` | `armaap` (armada), `coraap` (cortex) |
| `T2 Bot Lab` | `armalab` (armada), `coralab` (cortex) |
| `T2 Con Air` | `armaca` (armada), `coraca` (cortex) |
| `T2 Con Bot` | `armack` (armada), `corack` (cortex) |
| `T2 Vehicle Plant` | `armavp` (armada), `coravp` (cortex) |
| `Wind` | `armwin` (armada), `corwin` (cortex) |
| `Wind Generator` | `armwin` (armada), `corwin` (cortex) |

## Dropped Aliases: Same-Faction Ambiguities (Maps to 2+ Units Within One Faction)

These aliases were dropped because they resolve to more than one unitId within the same faction.

| Alias | Faction | Matched Units |
|-------|---------|---------------|
| `Raider` | cortex | `corfav`, `corraid` |

## Dropped Aliases: Collisions with Existing Unit Names

These aliases were dropped because the alias string equals the current official display name of a different unit.

| Alias | Unit for Which it was an Alias | Conflicts With Unit(s) Having this Current Name |
|-------|---------------------------------|--------------------------------------------------|
| `Advanced Metal Extractor` | `armamex` | `armmoho`, `cormoho` |
| `Blitz` | `corgator` | `armflash` |
| `Muskrat` | `armbeaver` | `cormuskrat` |
| `Sumo` | `corsumo` | `corcan` |
| `Titan` | `cortitan` | `armbanth` |
| `Wolverine` | `armmart` | `corwolv` |

## Historical Notes on Known Conflicts

- **Blitz / corgator**: In legacy data, `corgator` was nicknamed "Blitz", but "Blitz" is the official current name of Armada's `armflash`. Dropped by collision rule.
- **Sumo / corsumo / corcan**: In legacy scraped data, `corcan` was erroneously labeled "Sumo" while `corsumo` was labeled "Mammoth". Aliases mapping `Sumo` to `corsumo` conflict with `corcan`'s scraped name and map to multiple units within Cortex. Dropped.
- **Shadow / armthund / corshad**: "Shadow" was mapped to both the Armada bomber (`armthund`) and the Cortex bomber (`corshad`). It is preserved as a cross-faction alias resolved by faction.
- **Raider / corraid / corfav**: "Raider" was mapped to both Cortex Raider (`corraid`) and Cortex Rascal (`corfav`) within Cortex. Dropped as same-faction ambiguous.
- **Can / corcan**: "Can" represents the original TA/BAR unit name for `corcan`. In legacy data where `corcan` was mislabeled "Sumo", "Can" served as an alias; with the legacy `corcan`/`corsumo` mismatch resolved, exact unit definition takes precedence.

