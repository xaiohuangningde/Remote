#!/bin/bash
# xiaohongshu-mcp Setup Script
# 运行此脚本下载并配置 xiaohongshu-mcp

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== xiaohongshu-mcp Setup ==="

# Detect OS and architecture
OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
ARCH="$(uname -m)"

case "$ARCH" in
  x86_64) ARCH_NAME="amd64" ;;
  aarch64|arm64) ARCH_NAME="arm64" ;;
  *) echo "Unsupported architecture: $ARCH"; exit 1 ;;
esac

case "$OS" in
  darwin) OS_NAME="darwin" ;;
  linux) OS_NAME="linux" ;;
  mingw*|msys*|cygwin*) OS_NAME="windows" ;;
  *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

echo "Detected: $OS_NAME-$ARCH_NAME"

# Download release
RELEASE_URL="https://api.github.com/repos/xpzouying/xiaohongshu-mcp/releases/latest"
ASSETS=$(curl -s "$RELEASE_URL" | grep "browser_download_url.*xiaohongshu-mcp-${OS_NAME}-${ARCH_NAME}" | cut -d '"' -f 4)

if [ -z "$ASSETS" ]; then
  echo "No release found for $OS_NAME-$ARCH_NAME"
  exit 1
fi

echo "Downloading from: $ASSETS"
FILENAME="xiaohongshu-mcp-${OS_NAME}-${ARCH_NAME}.tar.gz"
if [ "$OS_NAME" = "windows" ]; then
  FILENAME="xiaohongshu-mcp-${OS_NAME}-${ARCH_NAME}.zip"
fi

curl -L -o "$FILENAME" "$ASSETS"

# Extract
echo "Extracting..."
if [[ "$FILENAME" == *.tar.gz ]]; then
  tar xzf "$FILENAME"
elif [[ "$FILENAME" == *.zip ]]; then
  unzip -q "$FILENAME"
fi

# Make executable
chmod +x xiaohongshu-mcp-*
rm -f "$FILENAME"

echo "=== Setup Complete ==="
echo ""
echo "下一步："
echo "1. 登录: ./xiaohongshu-login-${OS_NAME}-${ARCH_NAME}"
echo "2. 启动 MCP: ./xiaohongshu-mcp-${OS_NAME}-${ARCH_NAME}"
