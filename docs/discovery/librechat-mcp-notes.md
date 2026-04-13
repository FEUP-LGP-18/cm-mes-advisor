# LGP2026 LibreChat / MCP ZIP Notes

Source file: `(Copy) LGP2026.zip`
Workspace location: `98_archive/large-artifacts/(Copy) LGP2026.zip`
Source type: password-protected ZIP package from Rui Barbosa via Dropbox
Confidence: current canonical support package for Phase 1
Date captured in notes: 2026-04-13

## Purpose

Rui described this package as a way to run LibreChat locally with access to MES documentation through an MCP Server. He said it should help with Phase 1 objectives.

## Archive Contents

The ZIP contains:

- `LGP2026/.env`
- `LGP2026/clickhouse_lgp2026.tar.gz`
- `LGP2026/docker-compose.yml`
- `LGP2026/images/`
- `LGP2026/INSTRUCTIONS.txt`
- `LGP2026/librechat.yaml`
- `LGP2026/logs/`
- `LGP2026/rag_lgp2026.tar.gz`
- `LGP2026/uploads/`

## Instructions Summary

The `INSTRUCTIONS.txt` file says to:

- Enter the `LGP2026` directory.
- Load the RAG and ClickHouse Docker images from their `.tar.gz` files.
- Create a Docker network named `lgp-network`.
- Run the ClickHouse container on ports `8123` and `9000`.
- Run the RAG container on port `8080`.
- Run Docker Compose.
- Visit `http://localhost:3080`.
- Create a new local LibreChat account, with a dummy email allowed.
- Pick the `rag` MCP Server in the MCP Servers dropdown.
- Start asking MES documentation questions, for example asking what a Material is.

## Security Notes

- The ZIP password is intentionally not stored here.
- The `.env` file is intentionally not copied into notes because Rui said it contains the Bedrock LLM API key.
- Rui said the Bedrock API key has a usage limit and should not be shared.

## Implication For The Project

- This package is the fastest route to a Phase 1 technical proof of concept.
- It gives the team a locally runnable chat interface grounded in MES documentation.
- The next useful technical step is to connect this documentation access to the Customer X requirements workflow.
