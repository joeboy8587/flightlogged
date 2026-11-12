# Architecture rules
- New Neon integrations use the linked connector gateway from server-only helpers, never direct database clients; credentials stay inside request handlers.
- Share KCSO policy eligibility through the client-safe aircraft list so feeds and dossiers agree.
- Public case-file responses expose only aggregate inventory until explicit per-record publication approval exists; active and verified are not publication permission.
- Machine record panels return independent per-source errors and bounded samples so a missing source cannot blank the page or masquerade as zero findings.
- Use the supported router-ssr-query integration with a per-request QueryClient and the existing root provider; the legacy router-with-query adapter calls removed SSR APIs and blanks pages.