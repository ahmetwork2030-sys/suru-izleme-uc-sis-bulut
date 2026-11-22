#!/bin/bash
# InfluxDB ilk kurulumunda "bulut" kovasını oluşturur.
# "sis" kovası (7 gün) sis düğümünün yerel ham verisini, "bulut" kovası (süresiz) buluta gidenleri temsil eder.
set -e
influx bucket create --name bulut --org "${DOCKER_INFLUXDB_INIT_ORG}" --retention 0 --token "${DOCKER_INFLUXDB_INIT_ADMIN_TOKEN}"
