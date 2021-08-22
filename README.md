<div align="center">
  <img src="https://raw.githubusercontent.com/hyalusapp/hyalus/master/frontend/public/icon-128.png">
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

- Go 1.16.\*
- Node.js 14.\*
- MongoDB

## Hacking

* Please format/lint your code before making a PR.
* Setting up a basic development enviornment can be done like this.

1. Spin up a MongoDB container.

```sh
$ docker run -dp 27017:27017 --restart always mongo
```

2. Install some packages.

```sh
sudo apt install -y tmux entr
```

3. Start development server.

```sh
$ ./scripts/dev.sh
```
