Domoticz exporter for Prometheus.io, written in Node.js.

This exporter provides metrics for the devices defined in Domoticz, rather than for Domoticz itself.

# Origin and fork changes

This project is a fork of [wywywywy/domoticz_exporter](https://github.com/wywywywy/domoticz_exporter), originally written by wywywywy. The original author attribution and Apache License 2.0 are preserved.

The macjl fork adds `domoticz_light_last_update`, `domoticz_temp_last_update`, `domoticz_weather_last_update`, and `domoticz_utility_last_update`. These gauges expose Domoticz `LastUpdate` as milliseconds since the Unix epoch (the existing fork behavior). Dates without a timezone are interpreted in the exporter's local timezone.

This fork also uses Node.js 24 LTS and publishes its own multiarchitecture image to `ghcr.io/macjl/domoticz_exporter`. The upstream Docker Hub image is maintained separately and does not include these fork additions.

# Usage

## Arguments

    --port     9486         Exporter listens on this port (default = 9486)
    --interval 15           Polling interval in seconds (default = 15, minimum 2)
    --hostip   127.0.0.1    Domoticz IP (default = 127.0.0.1)
    --hostport 8080         Domoticz port (default = 8080, or 443 if using SSL)
    --hostssl               Use SSL to connect to Domoticz
    --collectdefault        Collect default Prometheus metrics as well (default = false)

## Environment Variables

The arguments can also be set as env variables instead. Useful if you're using it in a Docker container.

1. DOMOTICZ_PORT
2. DOMOTICZ_INTERVAL
3. DOMOTICZ_HOSTIP
4. DOMOTICZ_HOSTPORT
5. DOMOTICZ_HOSTSSL
6. DOMOTICZ_DEFAULTMETRICS

# Installation

## From Source

Node.js 24 LTS and its bundled npm are required for the supported runtime.

    git clone https://github.com/macjl/domoticz_exporter.git
    cd domoticz_exporter
    npm ci
    npm start

Run `npm test` to check startup, polling, and metrics against a simulated Domoticz server.

## With Docker

```sh
docker run -d --name domoticz-exporter --restart=always \
  -p 9486:9486 \
  -e DOMOTICZ_HOSTIP=192.168.1.10 \
  -e DOMOTICZ_HOSTPORT=8080 \
  ghcr.io/macjl/domoticz_exporter:latest
```

Replace `192.168.1.10` with the address of your Domoticz server reachable from the container. Container `127.0.0.1` refers to the exporter container itself. Metrics are available at `http://localhost:9486/`.

Images support `linux/amd64` and `linux/arm64`. After this change is merged, pushes to `master` publish `latest` and a UTC date tag (`YYYYMMDD`, replaced on another build the same day). Version tags such as `v1.0.3` publish `1.0.3` without changing `latest`. Pull requests build both architectures without publishing. Manual runs publish only from `master` or a version tag.

Publication uses the repository's `GITHUB_TOKEN` with `contents: read` and `packages: write`; Docker Hub secrets or a personal token are not required. Enable GitHub Actions in the fork. After the first publication, set the GHCR package visibility to **Public** in its package settings to allow anonymous pulls. If a package with this name already exists, ensure this repository has Actions write access to it.

The image will become available after a successful publishing workflow; opening the PR does not publish it.

## Prometheus Config

Add this to prometheus.yml and change the IP/port if needed.

    - job_name: 'domoticz_exporter'
        metrics_path: /
        static_configs:
        - targets:
            - '127.0.0.1:9486'

# Notes on Devices

There are 4 types of devices in Domoticz, and they are presented as separate metric groups.

1. light = Get all lights/switches
2. weather = Get all weather devices
3. temp = Get all temperature devices
4. utility = Get all utility devices

Unfortunately there is no standard in Domoticz how "levels" are presented. So for example on some devices battery level 100 means full, and others it will be 255.

The same goes for units - on some it may be Celsius others Fahrenheit, some it may be kWh others Ah, etc. It all depends on the device itself.

# TODO

1. Support for more edge-case devices
2. Metrics of Domoticz itself maybe?

# Contributing

Yes, contributions are always welcome.  
Fork it, clone it, submit a pull request, etc.

# License

This is licensed under the Apache License 2.0.
