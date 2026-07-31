#!/usr/bin/env bash
# Generate a local @openshift-migration-advisor/agent-sdk from a local OpenAPI
# spec (default: assisted-migration-agent api/v2). For local UI testing only.
#
# Prefer the published npm package when available. Note: the published v2 SDK
# keeps OpenAPI tags (AgentApi, VirtualMachinesApi, ...). This script strips
# tags so OpenAPI Generator emits a single DefaultApi, which agent-ui then
# no longer requires (see apps/agent-ui/src/common/agentApi.ts facade).
#
# Example (v2 OpenAPI from a specific agent commit):
#   git -C ~/assisted-migration-agent show 851b5bca22e4:api/v2/openapi.yaml \
#     > .tmp/openapi-v2.yaml
#   ./scripts/generate-agent-sdk-local.sh .tmp/openapi-v2.yaml
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENAPI_SRC="${1:-${HOME}/assisted-migration-agent/api/v2/openapi.yaml}"
OUT_DIR="${ROOT_DIR}/packages/agent-sdk"
GENERATOR_JAR="${OPENAPI_GENERATOR_JAR:-/tmp/openapi-generator-cli-7.18.0.jar}"
GENERATOR_URL="${OPENAPI_GENERATOR_URL:-https://repo1.maven.org/maven2/org/openapitools/openapi-generator-cli/7.18.0/openapi-generator-cli-7.18.0.jar}"
STRIPPED_SPEC="${ROOT_DIR}/.tmp/agent-sdk-openapi.yaml"

if [[ ! -f "${OPENAPI_SRC}" ]]; then
  echo "OpenAPI spec not found: ${OPENAPI_SRC}" >&2
  exit 1
fi

if [[ ! -f "${GENERATOR_JAR}" ]]; then
  echo "Downloading OpenAPI Generator JAR to ${GENERATOR_JAR}..."
  curl -fsSL -o "${GENERATOR_JAR}" "${GENERATOR_URL}"
fi

mkdir -p "${ROOT_DIR}/.tmp"
python3 - <<PY
import pathlib
import yaml

src = pathlib.Path("${OPENAPI_SRC}")
dst = pathlib.Path("${STRIPPED_SPEC}")
doc = yaml.safe_load(src.read_text())
doc.pop("tags", None)
for _path, methods in (doc.get("paths") or {}).items():
    if not isinstance(methods, dict):
        continue
    for _method, op in methods.items():
        if isinstance(op, dict):
            op.pop("tags", None)
dst.write_text(yaml.dump(doc, sort_keys=False, allow_unicode=True))
print(f"Wrote stripped spec to {dst}")
PY

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

java -jar "${GENERATOR_JAR}" generate \
  -i "${STRIPPED_SPEC}" \
  -g typescript-fetch \
  -o "${OUT_DIR}" \
  --additional-properties=npmName=@openshift-migration-advisor/agent-sdk,npmVersion=0.20.0-1a38780-local-v2,ensureUniqueParams=true,supportsES6=true,withInterfaces=true,importFileExtension=.js,modelPropertyNaming=original

python3 - <<'PY'
import json
from pathlib import Path

package_path = Path("packages/agent-sdk/package.json")
data = json.loads(package_path.read_text())
data["private"] = True
data["license"] = "Apache-2.0"
data["scripts"] = {
    "build": "tsc && tsc -p tsconfig.esm.json",
    "clean": "rm -rf dist node_modules",
    "check": "echo skip",
    "test": "echo skip",
}
package_path.write_text(json.dumps(data, indent=2) + "\n")
PY

(
  cd "${ROOT_DIR}"
  yarn install
  yarn workspace @openshift-migration-advisor/agent-sdk build
)

echo "Local agent-sdk generated at ${OUT_DIR}"
echo "Ensure apps/agent-ui depends on workspace:* for @openshift-migration-advisor/agent-sdk"
