# Hyalus Desktop

Hyalus desktop client (Windows/macOS/Linux)

## Building

### Requirements

- Node.js 20.x
- PNPM (run `corepack enable`)

### Instructions

1. Clone the repository

```sh
git clone https://github.com/atriplex-co/hyalus-desktop.git
cd hyalus-desktop
```

2. Install dependencies

```sh
pnpm i
```

3. Build JS code

```sh
pnpm build:main
pnpm build:preload
```

4. Build packaged binaries

```sh
pnpm electron-builder -w # for Windows
pnpm electron-builder -m # for macOS
pnpm electron-builder -l # for Linux
```

## Notes

- The build output should be in `dist/packaged`.
- Edit `electron-builder.yml` if you want to build for a new platform/architecture.
