# Agent Knowledge Base

## ChurchTools API
- **Swagger Documentation**: [https://academy-assets.church.tools/system/runtime/swagger/openapi.json](https://academy-assets.church.tools/system/runtime/swagger/openapi.json)
- **DB Fields API (`/dbfields`)**:
    - **GET /api/dbfields**: List available database fields.
    - **POST /api/dbfields**: Create a new database field.
    - **PUT /api/dbfields/{fieldId}**: Update an existing database field (e.g., to rename a key or change properties).
- **Field Updates**: Use `PUT /dbfields/{fieldId}` to update existing field definitions instead of creating new ones when migrating or fixing keys.

## Project Context
- **Typo Fix**: The field `taufmanager_onboarding` was originally created as `taufmanager_onboaring`. We migrated data to the correct key and updated the codebase.
