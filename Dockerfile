FROM alpine:latest as deps
RUN apk add nodejs yarn
WORKDIR /app
COPY package.json yarn.lock ./
COPY packages/common/package.json ./packages/common/package.json
COPY packages/server/package.json ./packages/server/package.json
COPY packages/client-web/package.json ./packages/client-web/package.json
COPY patches ./patches
RUN --mount=type=cache,target=/usr/local/share/.cache yarn --frozen-lockfile

FROM alpine:latest as package-server
RUN apk add nodejs yarn
WORKDIR /app
COPY --from=deps /app .
COPY packages/common ./packages/common
COPY packages/server ./packages/server
RUN yarn build:server

FROM alpine:latest as package-client-web
RUN apk add nodejs yarn
WORKDIR /app
COPY --from=deps /app .
COPY packages/common ./packages/common
COPY packages/client-web ./packages/client-web
RUN yarn build:client-web

FROM alpine:latest
RUN apk add nodejs yarn curl ffmpeg
WORKDIR /app
COPY package.json .
COPY packages/server/package.json ./packages/server/package.json
COPY packages/client-web/package.json ./packages/client-web/package.json
COPY --from=package-server /app/packages/server/dist ./packages/server/dist
COPY --from=package-client-web /app/packages/client-web/dist ./packages/client-web/dist
ENV NODE_ENV=production
HEALTHCHECK CMD curl localhost:3000
CMD [ "yarn", "start" ]