# Update API Client Guide

This guide explains how to update the API client when you have changes to the OpenAPI specification that are only available locally (not yet pushed to the server).

## Overview

The project uses OpenAPI Generator CLI to automatically generate TypeScript client code from an OpenAPI specification. By default, the configuration in `openapitools.json` points to a remote OpenAPI specification file hosted on GitHub.

## Default Configuration

The default configuration in `openapitools.json`:

```json
{
  "generator-cli": {
    "generators": {
      "api-client": {
        "inputSpec": "https://raw.githubusercontent.com/kubev2v/migration-planner/main/api/v1alpha1/openapi.yaml",
        "output": "packages/api-client",
        "generatorName": "typescript-fetch"
      }
    }
  }
}
```

## Working with Local Changes

When you have local changes to the OpenAPI specification that haven't been pushed to the server yet, you have several options:

### Option 1: Temporary Local Configuration (Recommended)

1. **Backup the current configuration** (optional but recommended):
   ```bash
   cp openapitools.json openapitools.json.backup
   ```

2. **Place your local OpenAPI file** in the project root or create the appropriate directory structure:
   ```bash
   # Option A: Place in project root
   cp /path/to/your/local/openapi.yaml ./openapi.yaml
   
   # Option B: Create the expected directory structure
   mkdir -p api/v1alpha1
   cp /path/to/your/local/openapi.yaml ./api/v1alpha1/openapi.yaml
   ```

3. **Modify the `inputSpec` in `openapitools.json`** to point to your local file:
   
   For option A (file in project root):
   ```json
   "inputSpec": "./openapi.yaml"
   ```
   
   For option B (preserving directory structure):
   ```json
   "inputSpec": "./api/v1alpha1/openapi.yaml"
   ```

4. **Generate the API client**:
   ```bash
   yarn api-client:update
   ```

5. **Restore the original configuration** (important for version control):
   ```bash
   # If you made a backup
   mv openapitools.json.backup openapitools.json
   
   # Or manually revert the inputSpec back to the remote URL
   ```

6. **Clean up temporary files**:
   ```bash
   # Remove the local OpenAPI file if you don't want to commit it
   rm openapi.yaml  # or rm -rf api/ if you created the directory structure
   ```

### Option 2: Using Command Line Override

You can also override the input specification directly via command line without modifying the configuration file:

```bash
yarn run -T openapi-generator-cli generate \
  -i ./path/to/your/local/openapi.yaml \
  -g typescript-fetch \
  -o packages/api-client \
  --additional-properties=npmName=@migration-planner-ui/api-client,npmVersion=1.0.0-alpha,ensureUniqueParams=true,supportsES6=true,withInterfaces=true
```

### Option 3: Temporary Git Branch for Local Testing

1. **Create a temporary branch**:
   ```bash
   git checkout -b temp/local-api-update
   ```

2. **Add your local OpenAPI file and modify configuration**:
   ```bash
   cp /path/to/your/local/openapi.yaml ./openapi.yaml
   # Modify openapitools.json as described in Option 1
   ```

3. **Generate and test**:
   ```bash
   yarn api-client:update
   # Test your changes...
   ```

4. **Clean up when done**:
   ```bash
   git checkout main  # or your original branch
   git branch -D temp/local-api-update
   ```

## Important Notes

- **Always revert configuration changes**: Don't commit changes to `openapitools.json` that point to local files
- **Test thoroughly**: Make sure the generated client works with your local API changes
- **Version control**: Consider the impact on other developers if you commit generated code with local changes
- **Documentation**: Update API documentation if your changes introduce breaking changes

### Runtime base URL (BASE_PATH)

- The generated client includes a `BASE_PATH` which must point to your API server, not to the location of the OpenAPI spec (e.g., not `raw.githubusercontent.com`).
- You can override the base URL in two ways:
  - Per instance: pass `basePath` via the `Configuration` constructor.
  - Environment: set one of `MIGRATION_PLANNER_API_BASE_URL`, `MP_API_BASE_PATH`, or `API_BASE_PATH` at runtime. If none are set, the client defaults to a relative base URL (`''`), which is suitable when the UI is served behind a proxy that forwards to the API.
- Examples:
  - Local dev: `MIGRATION_PLANNER_API_BASE_URL=http://localhost:3000`
  - Production: `MIGRATION_PLANNER_API_BASE_URL=https://api.example.com`

## Troubleshooting

### Common Issues

1. **File not found error**: Make sure the path in `inputSpec` is correct and the file exists
2. **Permission errors**: Ensure you have read permissions on the OpenAPI file
3. **Generation errors**: Validate your OpenAPI specification using tools like Swagger Editor

### Validation

To validate your OpenAPI specification before generating:

```bash
# Using swagger-codegen-cli (if available)
swagger-codegen-cli validate -i ./path/to/your/openapi.yaml

# Or use online validators like https://editor.swagger.io/
```

## Script Automation

You can create a helper script to automate this process:

```bash
#!/bin/bash
# scripts/update-api-client-local.sh

LOCAL_OPENAPI_FILE="$1"

if [ -z "$LOCAL_OPENAPI_FILE" ]; then
    echo "Usage: $0 <path-to-local-openapi.yaml>"
    exit 1
fi

# Backup current config
cp openapitools.json openapitools.json.backup

# Copy local file
cp "$LOCAL_OPENAPI_FILE" ./openapi.yaml

# Update config temporarily
sed -i 's|"inputSpec": "https://raw.githubusercontent.com/kubev2v/migration-planner/main/api/v1alpha1/openapi.yaml"|"inputSpec": "./openapi.yaml"|' openapitools.json

# Generate
yarn api-client:update

# Restore config
mv openapitools.json.backup openapitools.json

# Clean up
rm ./openapi.yaml

echo "API client updated successfully!"
```

Make it executable and use it:
```bash
chmod +x scripts/update-api-client-local.sh
./scripts/update-api-client-local.sh /path/to/your/local/openapi.yaml
```

## Release Process and Library Version Update

After you have successfully modified the API code and tested it locally, you need to follow these steps to make the changes available for the migration-planner-ui-app project:

### Step 1: Create a Release

Once your API changes are ready and merged into the main branch:

1. **Tag the release** in the API repository:
   ```bash
   git tag -a v1.2.3 -m "Release version 1.2.3 with new endpoints"
   git push origin v1.2.3
   ```

2. **Create a GitHub release**:
   - Go to the API repository's GitHub page
   - Navigate to "Releases" → "Create a new release"
   - Select the tag you just created
   - Add release notes describing the changes
   - Publish the release

### Step 2: Update migration-planner-ui-app Project

Update the api-client and ioc projects inside migration-planner-ui-app project:

1. **Update the dependency version** in the consuming project's `package.json`:
   ```json
   {
     "dependencies": {
       "@migration-planner-ui/api-client": "^1.2.3",
       "@migration-planner-ui/ioc": "^1.2.3"      
     }
   }
   ```

2. **Install the updated dependency**:
   ```bash
   yarn install   
   ```

3. **Test the application** with the new API client version

**Note:** The Agent API client (`@openshift-migration-advisor/agent-sdk`) is now consumed as a published npm package and is updated independently by changing its version in `package.json`.
