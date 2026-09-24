# @datagutt/kai-assets

The asset pipeline and the `kai` command. Run it from an app's folder, the one with
`kai.json`:

- `kai content`: check `content/` and `kai.json`, write `.kai/`.
- `kai assets`: fetch the licensed art (a local checkout, a clone with a token, or
  placeholders), then build `public/<basePath>`: the tile atlas, characters, portraits,
  the bitmap font, UI sheets, music and the compiled Ink.
- `kai world gen|check|render`: the maps.
- `kai characters`: a contact sheet of every character.
- `kai art <tool>`: a tool of the art adapter.
- `kai dev`: the standalone game harness with live reload and the world socket.

It reaches game code only through the modules `kai.json` names (the map builders, the
dialogue host, the harness entry, the art adapter), so it holds no art family and no
game.

Build time only. **Must not import:** any app, or an art adapter directly.

See [docs/kai/ARCHITECTURE.md](../../docs/kai/ARCHITECTURE.md) and
[docs/kai/CONTENT.md](../../docs/kai/CONTENT.md).
