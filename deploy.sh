#!/usr/bin/env bash

# ==============================================================================
# Google Apps Script Direct Deployment Runner
# Runs deployment of the apps-script/ folder at once using .env secrets
# ==============================================================================

set -e

# Resolve repository root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

# ANSI color codes
RESET='\033[0m'
BOLD='\033[1m'
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
CYAN='\033[36m'
MAGENTA='\033[35m'

echo -e "${BOLD}${MAGENTA}================================================================${RESET}"
echo -e "${BOLD}${MAGENTA}   Song Collection & Lyrics Library — Deployment Script         ${RESET}"
echo -e "${BOLD}${MAGENTA}================================================================${RESET}\n"

# 1. Verify Node.js is installed
if ! command -v node >/dev/null 2>&1; then
  echo -e "${RED}${BOLD}✖ Error:${RESET} Node.js is required but not installed or not in PATH."
  exit 1
fi

# 2. Check for .env file
if [ ! -f "${SCRIPT_DIR}/.env" ]; then
  if [ -f "${SCRIPT_DIR}/.env.example" ]; then
    cp "${SCRIPT_DIR}/.env.example" "${SCRIPT_DIR}/.env"
    echo -e "${YELLOW}⚠ Created .env from .env.example.${RESET}"
  else
    touch "${SCRIPT_DIR}/.env"
    echo -e "${YELLOW}⚠ Created blank .env file.${RESET}"
  fi
fi

# 3. Read SCRIPT_ID from .env
SCRIPT_ID=$(grep -E "^SCRIPT_ID=" "${SCRIPT_DIR}/.env" | cut -d'=' -f2- | tr -d ' "' | tr -d "'")

if [ -z "${SCRIPT_ID}" ] || [ "${SCRIPT_ID}" = "your_script_id_here" ]; then
  echo -e "${RED}${BOLD}✖ Error:${RESET} SCRIPT_ID is missing or not configured in your .env file.\n"
  echo -e "${BOLD}Please configure your SCRIPT_ID:${RESET}"
  echo -e "1. Open your Google Sheet -> ${BOLD}Extensions${RESET} -> ${BOLD}Apps Script${RESET}"
  echo -e "2. Click ⚙️  ${BOLD}Project Settings${RESET} in the left sidebar"
  echo -e "3. Copy the ${BOLD}Script ID${RESET}"
  echo -e "4. Open ${CYAN}.env${RESET} and paste it: ${BOLD}SCRIPT_ID=your_id_here${RESET}\n"
  exit 1
fi

# 4. Execute deploy.js with passed arguments (default: deploy)
ACTION="${1:-deploy}"
echo -e "${CYAN}ℹ Executing deployment action:${RESET} ${BOLD}${ACTION}${RESET}\n"

node "${SCRIPT_DIR}/deploy.js" "${ACTION}"
