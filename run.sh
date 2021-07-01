#!/bin/bash
JOIN_URL="${1}"

if [ -z "$JOIN_URL" ]; then
    echo "Usage: $0 JOIN_URL";
    exit 1;
fi;

docker run -it bbb-docker-test-webcam "${JOIN_URL}" && echo 1 || echo 0
