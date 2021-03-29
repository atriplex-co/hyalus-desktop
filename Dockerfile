FROM --platform=amd64 node:lts AS build
ENV DEBIAN_FRONTEND=noninteractive
RUN dpkg --add-architecture i386
RUN apt update
RUN apt install -yq --no-install-recommends wine wine32
WORKDIR /app
COPY . ./
RUN yarn
RUN yarn build
RUN rm -rf packages/client-desktop/dist/linux-unpacked
RUN rm -rf packages/client-desktop/dist/mac
RUN rm -rf packages/client-desktop/dist/win-unpacked

FROM --platform=amd64 node:lts
WORKDIR /app
COPY . ./
COPY --from=build /app/packages/client-web/dist packages/client-web/dist
COPY --from=build /app/packages/client-desktop/dist packages/client-desktop/dist
RUN yarn --prod
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE ${PORT}
CMD ["yarn", "start"]