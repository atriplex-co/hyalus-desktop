FROM alpine:latest
RUN apk add go
WORKDIR /app
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server ./
RUN go build -ldflags '-s -w'

FROM alpine:latest
RUN apk add nodejs yarn
WORKDIR /app
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn
COPY frontend ./
RUN yarn build

FROM alpine:latest
RUN apk add ffmpeg
WORKDIR /app
COPY --from=0 /app/server ./
COPY --from=1 /app/dist ./dist
ENV PORT=80
ENV GIN_MODE=release
CMD ["./server"]
