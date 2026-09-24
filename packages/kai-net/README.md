# @datagutt/kai-net

Other visitors, seen as ghosts. The client and the server share one protocol, so they
live together here.

- `./protocol`: the messages, the socket path and `Facing`.
- `./client`: the browser client (`GhostClient`) and the visitors-off switch.
- `./reconnect`: the client's backoff.
- `./rooms`: one room per map, independent of any server.
- `./node`: the rooms on a plain Node HTTP server, for the dev harness and tests. Next on
  Vercel serves them through `@datagutt/kai-next/world-socket`.

**Must not import:** any app, any other kai package, Next or React. The runtime depends
on it, so it depends on nothing of kai.
