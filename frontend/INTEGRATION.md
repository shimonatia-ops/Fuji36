# Backend Integration

This document describes how the frontend integrates with the backend services.

## API Configuration

The frontend connects to the API Gateway at `http://localhost:5000` by default.

To change the API base URL, create a `.env` file in the `frontend` directory:

```env
VITE_API_BASE_URL=http://localhost:5000
```

## Authentication

### Login Flow

1. User enters email and password on the login page
2. Frontend calls `POST /api/auth/login` with credentials
3. Backend returns JWT token
4. Token is stored in `localStorage` as `auth_token`
5. Frontend fetches user info via `GET /api/auth/me`
6. User state is updated in AuthContext

### Token Management

- JWT tokens are stored in `localStorage`
- Tokens are automatically included in API requests via `Authorization: Bearer <token>` header
- On app load, if a token exists, the user info is automatically fetched

### Demo Accounts

For development, the following test accounts are available (seeded by the Identity service):

- **Admin**: `admin@example.com` / `Admin123!`
- **Reviewer**: `reviewer@example.com` / `Reviewer123!`
- **User**: `user@example.com` / `User123!`
- **Patient**: `patient@example.com` / `Patient123!`
- **Therapist**: `therapist@example.com` / `Therapist123!`

## API Endpoints

### Authentication

- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/me` - Get current user info (requires authentication)

### Sessions (Future)

- `POST /api/sessions` - Create a new session
- `GET /api/sessions/{sessionId}` - Get session details
- `POST /api/sessions/{sessionId}/landmarks/batch` - Add landmarks to session
- `POST /api/sessions/{sessionId}/finalize` - Finalize a session

## Architecture

### API Client (`src/services/api.ts`)

Centralized API client that handles:
- Base URL configuration
- Token management
- Request/response handling
- Error handling

### Auth Context (`src/context/AuthContext.tsx`)

Manages authentication state:
- Login/logout functionality
- User information
- Token persistence
- Auto-refresh on page load

## Running the Integration

1. Start the backend services:
   ```bash
   cd services/fuji36-services
   dotnet run --project fuji36-api-gateway
   ```

2. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Navigate to `http://localhost:5173` (or the port Vite assigns)

4. Use one of the demo accounts to log in

## Troubleshooting

### CORS Issues

If you encounter CORS errors, ensure the API Gateway is configured to allow requests from the frontend origin.

### Token Expiration

JWT tokens may expire. The frontend will need to handle token refresh or redirect to login when a 401 response is received.

### API Connection

Verify the API Gateway is running and accessible at the configured URL. Check the browser console for connection errors.
