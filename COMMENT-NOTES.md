# Implementation rationale

Model additions append declarations to preserve user formatting and let aontu unify repeated paths. A conflicting value cannot be changed by appending a replacement: report the conflict instead of silently claiming it was applied.

Both flat message definitions and nested pattern chains are accepted. Read them through the shared adapter so flat metadata does not become extra messages.

Sources: [model additions](lib/add.ts), [CLI](cmd.ts), [agent guide](AGENTS.md).
