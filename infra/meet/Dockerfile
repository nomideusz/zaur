# syntax=docker/dockerfile:1
# Galene (https://galene.org) — single binary + static web client.
FROM golang:1.24-alpine AS build
RUN apk add --no-cache git
WORKDIR /src
ARG GALENE_REF=master
RUN git clone --depth 1 --branch "${GALENE_REF}" https://github.com/jech/galene.git .
RUN CGO_ENABLED=0 go build -ldflags='-s -w' -o /galene .

FROM alpine:3.21
RUN adduser -D -u 1000 galene \
	&& mkdir -p /opt/galene/data /opt/galene/groups /opt/galene/recordings \
	&& chown -R galene:galene /opt/galene
COPY --from=build /galene /usr/local/bin/galene
COPY --from=build /src/static /opt/galene/static
WORKDIR /opt/galene
USER galene
EXPOSE 8000 1194/tcp 1194/udp 10000/udp
CMD ["galene", "-insecure", "-http", ":8000", "-turn", ":1194", "-udp-range", "10000"]
