# Release Guide für RemObj

## 📋 Prerequisites

Bevor du einen Release erstellen kannst:

1. **NPM_TOKEN** muss in GitHub Secrets gesetzt sein
   - Gehe zu: [Settings → Secrets → Actions](https://github.com/remobj/remobj/settings/secrets/actions)
   - Erstelle ein neues Secret: `NPM_TOKEN`
   - Wert: Dein npm Access Token (von npmjs.com)

2. **LICENSE** Datei muss vorhanden sein (MIT License)

## 🚀 Release erstellen

### Option 1: Git Tag (Empfohlen)

```bash
# Stable Release
git tag -a v0.1.0 -m "Release v0.1.0"
git push origin v0.1.0

# Pre-release (Beta)
git tag -a v0.1.0-beta.1 -m "Beta release v0.1.0-beta.1"
git push origin v0.1.0-beta.1

# Pre-release (Release Candidate)
git tag -a v0.1.0-rc.1 -m "Release candidate v0.1.0-rc.1"
git push origin v0.1.0-rc.1
```

### Option 2: GitHub UI (Manual Trigger)

1. Gehe zu [Actions → Release](https://github.com/remobj/remobj/actions/workflows/release.yml)
2. Klicke auf "Run workflow"
3. Gib die Version ein (z.B. `0.1.0` oder `0.1.0-beta.1`)
4. Wähle ob es ein Pre-release ist
5. Klicke "Run workflow"

## 📦 Was passiert automatisch?

Die GitHub Action führt folgende Schritte aus:

### 1. **Validation**
- ✅ Prüft ob Version bereits auf npm existiert
- ✅ Bestimmt Release-Typ (stable/pre-release)

### 2. **Quality Checks**
- ✅ TypeScript Type Checking
- ✅ Linting mit oxlint
- ✅ Tests ausführen
- ✅ Coverage prüfen (min. 80%)

### 3. **Build & Prepare**
- ✅ Alle Packages bauen
- ✅ Source Maps generieren
- ✅ API Dokumentation aktualisieren
- ✅ CHANGELOG.md aus Commits generieren
- ✅ Bundle Size Report erstellen

### 4. **Publish to NPM**
- ✅ Packages mit Provenance publizieren
- ✅ Richtigen npm Tag setzen:
  - `latest` für stable releases
  - `beta` für beta releases
  - `rc` für release candidates
  - `alpha` für alpha releases
  - `next` für andere pre-releases

### 5. **GitHub Release**
- ✅ GitHub Release mit Changelog erstellen
- ✅ Bundle Size Report anhängen
- ✅ Tarball mit allen Builds anhängen

### 6. **Post-Release**
- ✅ CHANGELOG.md zu main branch committen
- ✅ Summary mit Links zu npm und GitHub

## 🏷️ Versioning Guidelines

Wir folgen [Semantic Versioning](https://semver.org/):

- **MAJOR** (1.0.0): Breaking Changes
- **MINOR** (0.1.0): Neue Features (backwards compatible)
- **PATCH** (0.0.1): Bug Fixes (backwards compatible)

### Pre-release Versionen

- **Beta**: `v0.1.0-beta.1` - Feature-complete, aber noch testing
- **RC**: `v0.1.0-rc.1` - Release Candidate, final testing
- **Alpha**: `v0.1.0-alpha.1` - Early development, instabil

## 📝 Commit Message Format

Für automatische Changelog-Generierung nutze [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Feature
git commit -m "feat(core): add new RPC endpoint"

# Bug Fix
git commit -m "fix(shared): resolve memory leak in WeakBiMap"

# Breaking Change
git commit -m "feat(core)!: change API signature

BREAKING CHANGE: consume() now requires config object"

# Documentation
git commit -m "docs: update README with examples"
```

## 🔍 Release Verification

Nach dem Release prüfe:

1. **NPM Registry** (nach ~1 Minute)
   - https://www.npmjs.com/package/@remobj/core
   - https://www.npmjs.com/package/@remobj/shared
   - https://www.npmjs.com/package/@remobj/devtools
   - https://www.npmjs.com/package/@remobj/weakbimap

2. **GitHub Releases**
   - https://github.com/remobj/remobj/releases

3. **Workflow Summary**
   - Check den Workflow Run für Details und Links

## ⚠️ Troubleshooting

### NPM Publish fehlgeschlagen
- Prüfe ob `NPM_TOKEN` korrekt gesetzt ist
- Stelle sicher dass der Token Publish-Rechte hat
- Prüfe ob die Version bereits existiert

### Tests/Coverage failing
- Führe lokal `npm test` und `npm run test:coverage` aus
- Stelle sicher dass Coverage >= 80% ist

### Changelog nicht generiert
- Stelle sicher dass Conventional Commits verwendet werden
- Prüfe mit `npx conventional-changelog-cli -p angular -r 1`

## 🚨 Rollback

Falls ein Release fehlerhaft ist:

```bash
# NPM Package deprecaten (nicht löschen!)
npm deprecate @remobj/core@0.1.0 "Contains critical bug, use 0.1.1"

# Neuen Fix-Release erstellen
git tag -a v0.1.1 -m "Fix critical bug from v0.1.0"
git push origin v0.1.1
```

## 💡 Tips

- **Teste Pre-releases first**: Erstelle erst eine `beta` Version
- **Check Bundle Sizes**: Review den Bundle Size Report im GitHub Release
- **Monitor Downloads**: Beobachte npm Stats nach Release
- **Communicate**: Informiere User über Breaking Changes

---

**Fragen?** Erstelle ein [Issue](https://github.com/remobj/remobj/issues) oder schaue in [CONTRIBUTING.md](./CONTRIBUTING.md).