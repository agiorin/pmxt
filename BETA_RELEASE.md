# Beta Release Guide

## Quick Start

To publish a beta version, simply tag with a beta version number:

```bash
git tag v1.0.0b1
git push origin v1.0.0b1
```

The GitHub Actions workflow will automatically:
1. ✅ Detect it's a pre-release
2. ✅ Publish to npm with `--tag beta`
3. ✅ Publish to PyPI (auto-detected as pre-release)

## Version Formats

### Beta Versions (Pre-release)
- `v1.0.0b1` - Beta 1 (recommended for PyPI compatibility)
- `v1.0.0-beta.1` - Beta 1 (npm style)
- `v1.0.0-alpha.1` - Alpha 1
- `v1.0.0-rc.1` - Release candidate 1

All of these will publish to npm with the `beta` tag.

### Stable Versions
- `v1.0.0` - Stable release
- `v1.0.1` - Patch release

These will publish to npm with the `latest` tag (default).

## How Users Install

### Beta Versions
```bash
# npm packages
npm install pmxtjs@beta
npm install pmxt-core@beta

# Or specific version
npm install pmxtjs@1.0.0b1

# Python package
pip install pmxt==1.0.0b1
# Or latest pre-release
pip install --pre pmxt
```

### Stable Versions
```bash
# npm packages (gets latest stable)
npm install pmxtjs
npm install pmxt-core

# Python package (gets latest stable)
pip install pmxt
```

## Testing Beta Releases

After publishing, test in an isolated environment:

```bash
# Create temp directory
mkdir -p /tmp/pmxt-beta-test
cd /tmp/pmxt-beta-test

# Test TypeScript SDK
mkdir ts-test && cd ts-test
npm init -y
npm install pmxtjs@beta pmxt-core@beta

# Test Python SDK
cd ..
mkdir py-test && cd py-test
python -m venv venv
source venv/bin/activate
pip install pmxt==1.0.0b1

# Copy examples and run them
```

## Workflow Detection Logic

The workflow automatically detects pre-releases by checking if the version contains:
- `alpha` or `a`
- `beta` or `b`
- `rc`

If detected → npm publishes with `--tag beta`
If not detected → npm publishes with `--tag latest` (default)

PyPI automatically recognizes pre-release versions based on PEP 440.

## Promoting Beta to Stable

When ready to release stable:

```bash
git tag v1.0.0
git push origin v1.0.0
```

This will:
1. Publish to npm with `latest` tag (becomes the default)
2. Publish to PyPI as stable version

The beta versions remain available but won't be installed by default.
