<div align="center">
  <img src="https://raw.githubusercontent.com/hyalusapp/hyalus/master/packages/client-web/src/assets/images/icon-circle.png" width="128" height="128">
</div>

# Hyalus

Talk on an open platform with cryptographically secure messaging & calls.

## Beta

Hyalus is currently in beta, please report bugs & issues.

## Features

- Modern cryptography (x25519/salsa20/argon2id).
- DM/Group messaging & calls.
- File attachments in channels.
- Image/video/audio file previews.
- Configurable typing indicators.
- Noise cancelation for calls.
- Desktop & webapp client.
- 2FA/TOTP authentication support.
- Mostly finished UI design.
- iOS/Android PWA support.
- Push notifications support.

## Requirements

- Node.js 14.\*
- MongoDB

## Hacking

- Please lint & test any modified packages before making a PR.

```sh
$ yarn lint
$ yarn test:server
$ yarn test:web
$ yarn test:common
```

- Setting up a basic development enviornment can be done like this.

```sh
./scripts/dev.sh
```

- Generating VAPID keys (for push notifications) can be done like this.

```sh
yarn exec -- web-push generate-vapid-keys
```
