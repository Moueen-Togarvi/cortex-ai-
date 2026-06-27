#!/bin/bash
cd "$(dirname "$0")"
while true; do
  bun run dev >> dev.log 2>&1
  sleep 2
done
