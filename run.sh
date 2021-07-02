#!/bin/bash
JOIN_URL="${1}"

if [ -z "$JOIN_URL" ]; then
    echo "Usage: $0 JOIN_URL";
    exit 1;
fi;

#Create temp dir
mkdir -m 777 /tmp/bigbluebutton-docker-test-webcam/ &> /dev/null || true

docker run --rm -v/tmp/bigbluebutton-docker-test-webcam/:/debug/ bigbluebutton-docker-test-webcam "${JOIN_URL}" && echo 1 || echo 0
