## ChurchTools API Endpoints
- **Add to Group**: `PUT /api/groups/{groupId}/members/{personId}` (Body: `{"groupTypeRoleId": 22}`)
- **Remove from Group**: `DELETE /api/groups/{groupId}/members/{personId}`
- **Get Group Members**: `GET /api/groups/{groupId}/members`

## Development Environment
- **Dev Server**: `http://localhost:5173`
- **Proxy**: All `/api` requests are proxied via Vite to the ChurchTools instance.
- **Rules**: Always use the `/api` prefix when calling `churchtoolsClient.ax` or raw axios methods.
