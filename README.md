# Hyalus [Beta]

Talk on an open platform.

## Beta

Hyalus is currently in beta, please report bugs & issues.

## Features

* Modern cryptography (x25519/salsa20/argon2id).
* DM/Group messaging & calls.
* File attachments in channels.
* Image/video/audio file previews.
* Configurable typing indicators.
* Noise cancelation for calls.
* Desktop & webapp client.
* 2FA/TOTP authentication support.
* Mostly finished UI design.

## Goals

These are features that will be implemented (soon) but are WIP.

* Federation between servers.
* Communities support (like Discord/Slack).
* Published specification for the protocol and client.
* Prebuilt Docker images for easy deployments.

## Requirements

* Node.js 14.x.
* MongoDB.
* Redis.

## Deployment

1. Install dependencies.

```sh
yarn
```

2. Build the web UI.

```sh
yarn build:web
```

3. Configure the server.

* Configure your desired HTTP port.
* Configure your MongoDB URL.
* Configure your Redis URL.
* Recommended to use a reverse proxy (eg. Nginx or Apache).

```sh
$ cp {example,}.env
$ nano .env
```

4. Start & manage the server.

* There are scripts included for running Hyalus with PM2.
* PM2 can do clustering/load balancing if you need that.

```sh
$ yarn start
$ yarn stop
$ yarn restart
$ yarn logs
```

## Hacking

Setting up a basic development enviornment can be done like this.

1. Set up containers.

```sh
$ docker run -dp 27017:27017 --restart always mongo
$ docker run -dp 6379:6379 --restart always redis
```

2. Install dependencies.

```sh
$ yarn
```

3. Configure the server.

```sh
$ cp {example,}.env
```

4. Start the web UI in development mode.

```sh
$ yarn dev:web
```

5. Start the desktop app in development mode. (Optional)

* This will also start the web UI.

```sh
yarn dev:desktop
```
