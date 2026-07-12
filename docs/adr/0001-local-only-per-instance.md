# Local-only, per-instance deployment (no shared hosting)

We considered hosting the app centrally on a Raspberry Pi, with the data
living on each spouse's own laptop instead of on the Pi, so both people could
access it independently over the home network.

This doesn't work: a process on one machine (the RPi) has no built-in way to
read or write another machine's local filesystem. The only way to bridge that
is a network file-sharing protocol (NFS, SMB, SSHFS, etc.) that makes the
remote files appear local — and that mount is exactly the mechanism whose
file-locking semantics SQLite doesn't trust. So hosting the app remotely from
the data isn't a separate problem from the SQLite-locking concern; the
network mount a remote host would require *is* the SQLite-locking concern.

Instead, each person runs their own fully independent local instance of the
app on their own machine, with its own local SQLite file. There is no live
sharing or sync between instances. Combining household data, if ever needed,
is an explicit export/import step, not a built-in feature.
