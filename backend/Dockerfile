FROM debian:13-slim AS build

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    ninja-build \
    git \
    meson \
    libssl-dev \
    libasio-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN cmake \
    -S . \
    -B build \
    -G Ninja \
    -DCMAKE_BUILD_TYPE=Release

RUN cmake --build build


FROM debian:13-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3t64 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build \
    /app/build/osrs-market-backend \
    /app/osrs-market-backend

RUN mkdir -p /app/data

EXPOSE 8080

CMD ["/app/osrs-market-backend"]