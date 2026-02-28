# Diagrams

This project uses **Mermaid** diagrams embedded inline in markdown docs. Mermaid renders flowcharts, sequence diagrams, and other charts from text definitions.

## Where diagrams live

Diagrams are defined directly in the following docs (not in separate files):

| Document | Location |
|----------|----------|
| [ARCHITECTURE.md](../ARCHITECTURE.md) | Layer model, PDAs, data flows |
| [TESTING.md](../TESTING.md) | Test stack flowchart |
| [OPERATIONS.md](../OPERATIONS.md) | Runbook flowchart |
| [ORACLE.md](../ORACLE.md) | Oracle integration flow |
| [SDK.md](../SDK.md) | SDK usage flows |
| [COMPLIANCE.md](../COMPLIANCE.md) | Compliance flows |
| [SECURITY.md](../SECURITY.md) | Security model |
| [DEPLOYMENT.md](../DEPLOYMENT.md) | Deployment flow |
| [README.md](../../README.md) | High-level architecture |

## How to render

- **GitHub** — Mermaid blocks in `.md` files render automatically in the repo UI.
- **VS Code** — Install the [Mermaid extension](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) for live preview.
- **CLI** — Use [mermaid-cli](https://github.com/mermaid-js/mermaid-cli) (`mmdc`) to export to PNG/SVG:
  ```bash
  npx @mermaid-js/mermaid-cli mmdc -i doc.md -o output/
  ```
