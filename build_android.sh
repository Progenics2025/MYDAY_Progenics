#!/bin/bash
set -e

# Set environment variables
export JAVA_HOME="$(pwd)/mobile/android/java17_env"
export ANDROID_HOME="/home/progenics-bioinfo/MyDay/android_sdk"
export PATH=$PATH:$ANDROID_HOME/platform-tools

echo "Using Java from: $JAVA_HOME"
echo "Using Android SDK from: $ANDROID_HOME"

cd mobile/android

echo "Building APK..."
./gradlew assembleDebug

echo "Build complete!"
echo "APK is located at: mobile/android/app/build/outputs/apk/debug/app-debug.apk"
