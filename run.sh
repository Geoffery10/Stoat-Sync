#!/bin/bash

while true; do
    echo "Starting bot.js at $(date '+%Y-%m-%d %H:%M:%S')"
    node ./bot.js
    echo "App crashed or exited. Restarting in 5 seconds..."
    sleep 5
done