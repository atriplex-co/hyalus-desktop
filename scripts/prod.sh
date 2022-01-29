#!/bin/sh
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1
rm -rf ~/.docker
docker-compose up -d --build --force-recreate --remove-orphans
