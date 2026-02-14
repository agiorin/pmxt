# Contributing to pmxt

If you contribute, you'll get the Contributor rank on the Discord!

Welcome! We love contributors. This project is a monorepo setup to support multiple languages while keeping the core logic centralized.

## Repository Structure

- **[core](./core)**: The heart of the project. Contains the server implementation and the native Node.js library (`pmxt-core`).
- **[sdks/python](./sdks/python)**: The Python SDK. (Pip package `pmxt`).
- **[sdks/typescript](./sdks/typescript)**: The future home of the HTTP-based TypeScript/Node.js SDK (`pmxtjs`).

## Getting Started

### 1. Running the Server (Core)

The server is the backbone of the SDKs. To develop on it or run it locally:

```bash
# From the root
npm run server
```

Or navigating manually:

```bash
cd core
npm install
npm run server
```

### 2. Developing the Python SDK

See the [Python SDK Development Guide](./sdks/SDK_DEVELOPMENT.md) for detailed instructions on generating and testing the Python client.

## Development Workflow

This project uses a **Sidecar Architecture**: the core logic is in TypeScript (`core/`), which SDKs spawn as a background process.

### Quick Start: Single Command Dev Mode
From the root directory, run:

```bash
npm run dev
```

This starts both the build watcher and the server concurrently. The SDKs will auto-restart on code changes via a version hash.

### Manual Setup (if needed)
If you prefer to run things separately:

```bash
# Terminal 1: Build watcher
cd core && npm run build -- --watch

# Terminal 2: Server
npm run server
```

### Manual Forced Restart
If you need a guaranteed fresh server state:
```bash
export PMXT_ALWAYS_RESTART=1
# Run your SDK script
```

## Stopping the Server
If the server doesn't shut down cleanly, use:

```bash
python3 -c "import sys; sys.path.insert(0, 'sdks/python'); import pmxt; pmxt.stop_server()"
```

Thank you for helping us build the future of prediction markets!
