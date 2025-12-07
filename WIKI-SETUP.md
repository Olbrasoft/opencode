# Wiki Setup Instructions

This repository has documentation prepared for GitHub Wiki.

## Creating GitHub Wiki

1. **Initialize Wiki** (first time only):
   - Go to https://github.com/Olbrasoft/opencode/wiki
   - Click "Create the first page"
   - Enter any content (will be replaced)
   - Click "Save Page"

2. **Clone Wiki Repository**:
   ```bash
   git clone https://github.com/Olbrasoft/opencode.wiki.git
   cd opencode.wiki
   ```

3. **Copy Documentation**:
   ```bash
   # Copy prepared wiki pages
   cp ../opencode/docs/*.md .
   ```

4. **Push to Wiki**:
   ```bash
   git add -A
   git commit -m "Add documentation pages"
   git push
   ```

## Wiki Pages

The following pages are prepared in `docs/`:

- **Home.md** - Wiki home page with project overview
- **Deployment-Guide.md** - How to build and deploy automatically
- **Configuration.md** - How to configure OpenCode

## Updating Wiki

When documentation changes:

1. Update files in `docs/` directory
2. Commit to main repository
3. Copy updated files to wiki repository:
   ```bash
   cd opencode.wiki
   cp ../opencode/docs/*.md .
   git add -A
   git commit -m "Update documentation"
   git push
   ```

## Documentation Location

Documentation is available in multiple places:

- **Repository**: [docs/](docs/) directory
- **Wiki**: https://github.com/Olbrasoft/opencode/wiki (once initialized)
- **README**: Links to docs in main [README.md](README.md)
