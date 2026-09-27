# Versioning and upgrades

## Versions
- `LOOKUP_STARTER_VERSION` holds the Starter version (semver); `package.json` `version` matches it.
- Every release is an annotated git tag `vX.Y.Z` (e.g. `v1.0.0`, `v1.1.0`) with a GitHub Release on the Starter
  repository, and a `CHANGELOG.md` entry that lists core files changed and migrations added.
- **Patch**: core bug/security fix, no migration or config change. **Minor**: new optional capability, additive
  migration or new optional config key with a default. **Major**: required config/env change or frontend adapter change.

## In a client site
- Keep `LOOKUP_STARTER_VERSION` at the version the site was created from or last upgraded to.
- Keep client changes out of core paths (`architecture.md` → Layers). If a core change is unavoidable, mark it with
  `// CLIENT-OVERRIDE:` and note it in `docs/client-notes.md`, so upgrades can find it.

## Pulling core fixes into a client site
Client repositories are created from the template, so they do not share git history with the Starter. Use a remote
plus a path-limited diff:

```bash
git remote add starter https://github.com/<org>/lookup-starter.git
```
```bash
git fetch starter --tags
```
```bash
git diff v1.0.0 v1.1.0 -- src/lookup src/app/admin supabase/migrations scripts src/proxy.ts src/app/layout.tsx > starter-upgrade.patch
```
```bash
git apply --3way starter-upgrade.patch
```

Then:
1. Read the CHANGELOG entries between the two versions (config keys, env vars, migrations).
2. Resolve conflicts (usually only `CLIENT-OVERRIDE` spots).
3. `npm run lint && npm run typecheck && npm test && npm run db:types:check && npm run build`.
4. Apply the new migration files to the client's Supabase project (never `fresh-install.sql` on an existing project).
5. Bump `LOOKUP_STARTER_VERSION`, deploy a Preview, run the Preview validation list (`deployment.md`), then Production.

## Fixing a bug found in a client site
Fix it in the Starter first (with a test), release a patch, then apply that patch to affected clients as above.
Fixes made only in one client site drift and are lost on the next upgrade.
