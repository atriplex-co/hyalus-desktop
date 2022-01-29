#!/bin/sh
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

ctrl_c() {
    docker-compose -f docker-compose.dev.yml kill
    docker-compose -f docker-compose.dev.yml down --remove-orphans
}

trap ctrl_c ctrl_c

rm -rf ~/.docker
docker-compose -f docker-compose.dev.yml up -d --build --force-recreate --remove-orphans
docker-compose -f docker-compose.dev.yml logs -f --tail 100