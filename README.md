# NETA: Next.js Exhaustive Testing Agent

NETA is a CLI tool that automates the testing workflow for Next.js (App Router) projects. It generates unit, integration, and E2E tests using LLMs, sets up testing infrastructure, and enforces coverage thresholds.

## Features

- **Auto-Setup**: Installs Vitest, Playwright, and configures them automatically.
- **LLM-Powered Generation**: Write tests for your Components, Pages, and Actions using local or cloud LLMs.
- **Coverage Enforcement**: Ensures your project meets specific coverage goals.

## Installation

```bash
npm install -g neta_cli
```

Or run directly with `npx`:

```bash
npx neta_cli --help
```

## Local Development

To use NETA locally without publishing to NPM (e.g., for testing or contributing):

1.  **Clone & Build NETA:**

    ```bash
    git clone <repo-url>
    cd neta
    npm install
    npm run build
    npm link
    ```

2.  **Link in Target Project:**

    ```bash
    cd /path/to/your/nextjs-project
    npm link neta
    ```

3.  **Run Commands:**
    You can now use `neta` commands directly:

    ```bash
    neta init
    neta generate --mode file --file app/page.tsx
    ```

## Quick Start

1.  **Initialize NETA** in your Next.js project root:

    ```bash
    npx neta init
    ```

2.  **Configure LLM Settings** (Optional but recommended):

    ```bash
    npx neta config
    ```

    Follow the prompts to select a provider (Local/OpenAI/Anthropic) and set your API key.

3.  **Generate Tests**:

    ```bash
    npx neta generate --mode changed
    ```

    _Currently supported modes: `changed` (stub), `all`, `file`._

4.  **Run Checks**:

    ```bash
    npx neta check
    ```

## Configuration

NETA stores configuration in `.neta.config.json`.

**Supported LLM Providers:**

- **Local:** Uses local models (e.g., via Ollama/LocalAI). No API key required.
- **OpenAI:** Requires `OPENAI_API_KEY`.
- **Anthropic:** Requires `ANTHROPIC_API_KEY`.

> **Note:** Ensure `.neta.config.json` is in your `.gitignore` if you store API keys in it.

## Commands

- `neta init`: Scaffolds testing infrastructure.
- `neta config`: Interactively configure LLM provider and keys.
- `neta generate`: Generates tests.
  - `-m, --mode <mode>`: `all` | `file` | `changed`
  - `-f, --file <path>`: Specific file to test.
  - `--e2e`: Enable E2E test generation (Playwright).
  - `--dry-run`: Print generated code without writing.
- `neta check`: Runs tests and validates coverage.

## Publishing to NPM

This package is configured for automated publishing via GitHub Actions.

### Setup (One-time)

1. **Create an NPM account** at [npmjs.com](https://www.npmjs.com) if you don't have one
2. **Generate an NPM access token**:
   - Go to npmjs.com → Account Settings → Access Tokens
   - Click "Generate New Token" → Choose "Automation" type
   - Copy the token
3. **Add token to GitHub**:
   - Go to your repository: https://github.com/neelra8n/neta
   - Navigate to Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `NPM_TOKEN`
   - Value: Paste your NPM token
   - Click "Add secret"

### Publishing a New Version

1. **Update version** in `package.json`:
   ```bash
   # Manually edit package.json or use npm version
   npm version patch  # for bug fixes (0.1.0 → 0.1.1)
   npm version minor  # for new features (0.1.0 → 0.2.0)
   npm version major  # for breaking changes (0.1.0 → 1.0.0)
   ```

2. **Commit and push** the version change:
   ```bash
   git add package.json
   git commit -m "chore: bump version to v0.1.1"
   git push
   ```

3. **Create and push a tag**:
   ```bash
   git tag v0.1.1
   git push --tags
   ```

4. **Monitor the workflow**:
   - Go to https://github.com/neelra8n/neta/actions
   - The "Publish to NPM" workflow will run automatically
   - Once complete, your package will be live on NPM!

5. **Verify publication**:
   ```bash
   npm view neta
   npx neta@latest --help
   ```

## License

MIT
