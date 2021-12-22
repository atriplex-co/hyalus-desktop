FROM alpine:latest as deps
RUN apk add nodejs npm
RUN npm i -g pnpm
WORKDIR /app
COPY package.json pnpm-workspaces.yaml pnpm-lock.yaml ./
COPY packages/common/package.json packages/common/pnpm-lock.yaml ./packages/common/
COPY packages/server/package.json packages/server/pnpm-lock.yaml ./packages/server/
COPY packages/client-web/package.json packages/client-web/pnpm-lock.yaml ./packages/client-web/
RUN --mount=type=cache,target=/root/.pnpm-store pnpm i -r --frozen-lockfile

FROM alpine:latest as package-server
RUN apk add nodejs npm
RUN npm i -g pnpm
WORKDIR /app
COPY --from=deps /app .
COPY packages/common ./packages/common
COPY packages/server ./packages/server
RUN pnpm build:server

FROM alpine:latest as package-client-web
RUN apk add nodejs npm
RUN npm i -g pnpm
WORKDIR /app
COPY --from=deps /app .
COPY packages/common ./packages/common
COPY packages/client-web ./packages/client-web
RUN pnpm build:client-web

FROM alpine:latest
RUN apk add nodejs npm curl ffmpeg
RUN npm i -g pnpm
WORKDIR /app
COPY package.json pnpm-workspaces.yaml ./
COPY packages/server/package.json ./packages/server/package.json
COPY packages/client-web/package.json ./packages/client-web/package.json
COPY --from=package-server /app/packages/server/dist ./packages/server/dist
COPY --from=package-client-web /app/packages/client-web/dist ./packages/client-web/dist
ENV NODE_ENV=production
HEALTHCHECK CMD curl localhost:3000
CMD [ "pnpm", "start" ]