# Product Requirements Document (PRD)

**Product Name:** Next.js Exhaustive Testing Agent (NETA)

## 1. Executive Summary

Next.js Exhaustive Testing Agent (NETA) is a standalone npm library that automatically generates, updates, and validates exhaustive tests (unit, integration, and optional E2E) for a Next.js (App Router) + TypeScript project.

The agent:

- Analyzes code changes
- Generates or updates tests
- Sets up testing infrastructure if missing
- Runs tests and collects coverage
- Displays structured CLI results
- Exits, allowing developers to commit manually

The goal is to make comprehensive testing automatic, consistent, and scalable.

## 2. Problem Statement

Frontend teams frequently:

- Skip writing exhaustive tests due to time constraints
- Write shallow unit tests but miss integration coverage
- Rarely maintain E2E tests
- Fail to keep tests updated when code changes
- Lack consistent coverage enforcement

As a result:

- Regressions reach production
- Coverage is misleading
- Developer velocity decreases over time

NETA addresses this by embedding intelligent test automation into the development workflow.

## 3. Objectives

### Primary Goals

- Automatically generate:
  - Unit tests
  - Integration tests
  - Optional E2E tests (flag-based)
- Modify existing tests based on code changes
- Achieve and enforce a configurable coverage threshold
- Automatically configure testing infrastructure if missing
- Provide CLI-based interactive results
- Support local and optional cloud LLMs

### Non-Goals (v1)

- Support for frameworks other than Next.js
- JavaScript-only projects
- Multi-repo orchestration
- Pre-commit hook integration
- Multi-agent distributed architecture

## 4. Target Environment (v1 Scope)

- **Framework:** Next.js (App Router only)
- **Language:** TypeScript only
- **Testing Stack:**

| Library                     | Purpose                     |
| :-------------------------- | :-------------------------- |
| Vitest                      | Unit & integration runner   |
| @testing-library/react      | Component testing           |
| @testing-library/user-event | User interaction simulation |
| @testing-library/jest-dom   | DOM matchers                |
| Playwright                  | E2E browser testing         |
| @vitest/coverage-v8         | Code coverage               |
| jsdom                       | DOM simulation              |
| @vitejs/plugin-react        | React support               |

## 5. User Persona

**Primary user:** Frontend developers working in a Next.js + TypeScript application who want automated exhaustive testing without manual overhead.

## 6. High-Level Workflow

1. Developer runs: `neta --mode changed --e2e`
2. Planner analyzes project + git diff
3. Unit Test Generation
4. Integration Test Generation
5. (Optional) E2E Generation
6. Coverage Run
7. Coverage Critic Agent
8. CLI Results + Exit

## 7. Functional Requirements

### 7.1 CLI Interface

**Install Options:**

```bash
npm install -g neta
npx neta
```

**CLI Modes:**
| Mode | Description |
| :--- | :--- |
| `--changed` | Generate tests for changed files |
| `--all` | Analyze entire repo |
| `--file path` | Generate tests for specific file |
| `--e2e` | Enable E2E test generation |
| `--dry-run` | Show planned changes without writing |

### 7.2 Project Analysis

The agent must:

- Detect Next.js App Router structure (`app/`)
- Identify:
  - Server Components
  - Client Components
  - Server Actions
  - Route Handlers
  - Shared utilities/hooks
- Analyze git diff
- Detect dependent modules when shared utilities change

### 7.3 Test Folder Structure

All generated files must live under:

```
/tests/
    /unit/
    /integration/
    /e2e/
```

No tests outside this directory.

### 7.4 Test Generation Rules

- **Unit Tests:** Components, Hooks, Utilities, Edge cases, Error states, Accessibility assertions
- **Integration Tests:** Page-level flows, Layout + child component interaction, Server actions with mocked requests
- **E2E Tests (flag-based):** Full user journey, Navigation flows, Form submission, Error handling, API-backed behavior

### 7.5 Test Modification

If tests already exist:

- Update when related code changes
- Add missing edge cases
- Improve uncovered branches
- Remove obsolete assertions

### 7.6 Infrastructure Auto-Setup

If missing, the agent must:

- Install all required testing dependencies
- Configure:
  - `vitest.config.ts`
  - Coverage config
  - `jsdom` environment
  - Playwright setup
- Create base scripts in `package.json`
- Create default test directory structure

## 8. Coverage Strategy

- **Coverage Tool:** `@vitest/coverage-v8`
- **Enforcement:** Configurable threshold (default: 85%)
- **Coverage Critic Behavior:**
  - If coverage < threshold:
    1. Identify uncovered lines
    2. Regenerate additional tests
    3. Rerun coverage
    4. Repeat up to configurable retry limit
  - Final output: Average coverage summary, Missing areas, Pass/Fail status

## 9. Agent Architecture

**v1: Single Intelligent Orchestrator**

Internal Pipeline:

1. **Planner:** Parses project, Determines generation plan
2. **Unit Agent**
3. **Integration Agent**
4. **E2E Agent (optional)**
5. **Coverage Critic**

Execution is sequential.

## 10. LLM Strategy

- **Supported Modes:**
  - Local LLM (default)
  - Optional cloud LLM (config-based)
- **Configurable Providers:**
  - `provider`: "local" | "openai" | "anthropic"
  - `model`: string
- **Fallback:** If cloud fails → fallback to local

## 11. Configuration File

`neta.config.ts` example:

```typescript
export default {
  coverageThreshold: 85,
  e2eDefault: false,
  llm: {
    provider: "local",
    model: "llama3",
  },
  retryLimit: 2,
};
```

## 12. CLI Output Requirements

After execution:

- List generated files
- List modified files
- Show test results
- Show coverage summary (Highlight uncovered lines)
- Exit with status code:
  - 0 → Success
  - 1 → Coverage below threshold
  - 2 → Test failure
  - 3 → Infra setup failure
  - No automatic commit.

## 13. Non-Functional Requirements

- Must not exceed reasonable LLM token usage
- Must be deterministic in test structure
- Must not modify source code
- Must preserve TypeScript strictness
- Must scale to medium-sized codebases

## 14. Risks

| Risk                      | Mitigation                       |
| :------------------------ | :------------------------------- |
| Poor LLM test quality     | Constrained prompts + retry loop |
| Infinite generation loops | Retry limit                      |
| Large repos slow analysis | Diff-based generation            |
| Flaky E2E tests           | Deterministic mock patterns      |

## 15. Security Considerations

- No telemetry without explicit config
- Cloud LLM must require API key
- No source code external transmission unless cloud enabled

## 16. Milestones

**Phase 1**

- CLI skeleton
- Project analyzer
- Unit test generation
- Coverage reporting

**Phase 2**

- Integration test support
- Infra auto-setup

**Phase 3**

- E2E generation
- Retry coverage loop
- Cloud provider support

## 17. Success Metrics

- ≥ 85% coverage achieved automatically
- 70%+ of generated tests run without modification
- Setup time under 2 minutes
- Zero manual test config required

## 18. Future Roadmap (v2+)

- Multi-agent parallel execution
- AST-based context engine
- Learning from existing repo patterns
- Pre-commit integration
- Framework-agnostic support
- Snapshot testing intelligence
- Performance regression tests
- Mutation testing support

---

**Final Vision Statement:** NETA should function as an intelligent test engineer living inside your Next.js project — generating, refining, validating, and enforcing exhaustive test coverage automatically.
