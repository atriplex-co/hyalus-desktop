FROM --platform=amd64 node:lts AS build
WORKDIR /app
COPY package.json yarn.lock ./
COPY packages/client-web ./
RUN yarn
RUN yarn build:web

FROM --platform=amd64 node:lts
WORKDIR /app
COPY . ./
COPY --from=build /app/packages/client-web/dist packages/client-web/dist
RUN yarn --prod
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE ${PORT}
CMD ["yarn", "start"]
