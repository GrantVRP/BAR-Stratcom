# Harvested Aliases Report

Total valid aliases preserved: **55**

## Dropped Aliases: Multi-Unit Ambiguities (Maps to 2+ Units)

These aliases were dropped because they resolve to more than one unitId, violating uniqueness.

| Alias | Matched Units |
|-------|---------------|
| `Advanced Fusion` | `armafus`, `corafus` |
| `Advanced Solar` | `armadvsol`, `coradvsol` |
| `Advanced Solar Generator` | `armadvsol`, `coradvsol` |
| `AFUS` | `armafus`, `corafus` |
| `Air Plant` | `armap`, `corap` |
| `Air Transport` | `armatlas`, `corvalk` |
| `Aircraft Factory` | `armap`, `corap` |
| `Con Air` | `armca`, `corca` |
| `Con Bot` | `armck`, `corck` |
| `Con Vehicle` | `armcv`, `corcv` |
| `Dragon's Teeth` | `armdrag`, `cordrag` |
| `Dragons Teeth` | `armdrag`, `cordrag` |
| `Fusion` | `armfus`, `corfus` |
| `Light Laser Tower` | `armllt`, `corllt` |
| `LLT` | `armllt`, `corllt` |
| `Mex` | `armmex`, `cormex` |
| `Nano Turret` | `armnanotc`, `cornanotc` |
| `Radar` | `armrad`, `corrad` |
| `Raider` | `corfav`, `corraid` |
| `Shadow` | `armthund`, `corshad` |
| `Solar` | `armsolar`, `corsolar` |
| `T2 Aircraft Plant` | `armaap`, `coraap` |
| `T2 Bot Lab` | `armalab`, `coralab` |
| `T2 Con Air` | `armaca`, `coraca` |
| `T2 Con Bot` | `armack`, `corack` |
| `T2 Vehicle Plant` | `armavp`, `coravp` |
| `Wind` | `armwin`, `corwin` |
| `Wind Generator` | `armwin`, `corwin` |

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

- **Blitz / corgator**: In legacy data, `corgator` was nicknamed "Blitz", but "Blitz" is the official current name of Armada's `armflash`. Dropped.
- **Sumo / corsumo / corcan**: In legacy scraped data, `corcan` was erroneously labeled "Sumo" while `corsumo` was labeled "Mammoth". Aliases mapping `Sumo` to `corsumo` conflict with `corcan`'s scraped name and map to multiple units. Dropped.
- **Shadow / armthund / corshad**: "Shadow" was mapped to both the Armada bomber (`armthund`) and the Cortex bomber (`corshad`). Dropped.
- **Raider / corraid / corfav**: "Raider" was mapped to both Cortex Raider (`corraid`) and Cortex Rascal (`corfav`). Dropped.
- **Can / corcan**: "Can" represents the original TA/BAR unit name for `corcan`. In legacy data where `corcan` was mislabeled "Sumo", "Can" served as an alias; with the legacy `corcan`/`corsumo` mismatch resolved, exact unit definition takes precedence.

