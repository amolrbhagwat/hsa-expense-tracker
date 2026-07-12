# Server-rendered HTML + HTMX for the frontend

We need live filtering and inline editing of expense records. The default
reach for this today is a full SPA framework (React/Vue/Svelte), which
brings a build pipeline, client-side state management, and a separate JSON
API layer.

We're using server-rendered HTML with HTMX instead: Fastify renders pages
directly, and HTMX handles partial updates (filtering, inline edit forms)
via HTML attributes, no client-side framework or bundler involved. This
fits the project's low-ceremony, single-command-to-run ethos (ADR 0001)
better than a SPA would, for an app of this size.
