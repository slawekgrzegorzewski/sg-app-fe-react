# Wieloarchitekturowe buildy obrazów Docker

Workflow wdrożeniowy buduje frontend osobno dla `linux/amd64` i `linux/arm64`.

Build `arm64` korzysta z natywnego runnera GitHub Actions `ubuntu-24.04-arm`, ponieważ emulacja ARM przez QEMU znacząco wydłuża instalację zależności npm i kompilację. Obrazy architekturowe są publikowane pod tymczasowymi tagami, a po zakończeniu obu buildów łączone w manifest pod właściwym tagiem obrazu. Dzięki temu Docker może automatycznie pobrać wariant zgodny z architekturą noda klastra.
