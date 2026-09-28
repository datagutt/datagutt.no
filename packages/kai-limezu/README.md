# @datagutt/kai-limezu

The art adapter for LimeZu's Modern Exteriors, Interiors and Office packs, used by map
builders and by the asset build (`kai.json` `assets.adapter` names `./adapter`).

- Map pieces: terrain `blocks`, `sheets` and `singles` references, the `catalog`, the
  `palette`, generic `prefabs`, `furniture`, `lighting`, `interior` (rooms, walls,
  floors) and `features` (buildings, forests).
- Build support: `seasons` (the winter tile rule), `cuts` (checks on how prefabs are
  cut from their sheets), `source` (`LimeZuSheets`), `characters` (the character
  generator's layers composed into the runtime's sheet layout).
- `kai art catalog` rebuilds the catalogue from a checkout of the art.

Prefabs named for their role in one game (a town hall, a library) belong to that game.
The pixels live in the private art repository, never here.

Build time only. **Must not import:** any app.
