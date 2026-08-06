#!/usr/bin/env bash

if [ -z "$1" ]; then
    echo "Usage: ./manager.sh [command]"
    echo "Commands:"
    echo "  dev     - Run development server"
    echo "  build   - Build the application"
    echo "  clean   - Clean build artifacts"
    echo "  setup   - Run setup"
    exit 1
fi

CMD=$1
DIR="$(dirname "$0")"

case $CMD in
    dev)
        bash "$DIR/scripts/dev.sh"
        ;;
    build)
        bash "$DIR/scripts/build.sh"
        ;;
    clean)
        bash "$DIR/scripts/clean.sh"
        ;;
    setup)
        bash "$DIR/scripts/setup.sh"
        ;;
    *)
        echo "Unknown command: $CMD"
        exit 1
        ;;
esac
