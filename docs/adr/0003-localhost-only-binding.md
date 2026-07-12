# Server binds to localhost only

The app has no authentication layer (ADR 0001 — trusted single-user local
instance, no login). Binding the server to `0.0.0.0` would expose it, and
the HSA data behind it, to anything else on the local network with no
protection.

The server must bind to `127.0.0.1` only. LAN or remote access is not a
supported configuration; enabling it later would require first adding an
auth layer, not just changing a bind address.
