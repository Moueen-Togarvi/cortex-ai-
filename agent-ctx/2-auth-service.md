---
Task ID: 2
Agent: auth-service
Task: Build Auth Service microservice with JWT auth, user management, API keys, admin endpoints

Work Log:
- Read shared library files (config, database, models, schemas, security, middleware, exceptions) to understand available utilities
- Created Dockerfile for Python 3.12-slim image with uvicorn on port 8001
- Created requirements.txt with FastAPI, SQLAlchemy, asyncpg, Redis, python-jose, passlib, pydantic-settings
- Created routes/__init__.py (empty)
- Created main.py with FastAPI app, sys.path manipulation for shared library, CORS middleware, RequestLoggingMiddleware, global exception handlers, lifespan context manager, init_models on startup, superuser seeding (admin@aiplatform.com / admin123 in default tenant)
- Created routes/auth.py with full auth routes:
  - POST /api/auth/register — validates tenant, checks email uniqueness, creates user, auto-generates API key
  - POST /api/auth/login — verifies credentials with bcrypt, issues access+refresh tokens, stores refresh token hash in Redis with TTL
  - POST /api/auth/refresh — verifies refresh token type, checks Redis for non-revocation, issues new token pair, revokes old refresh token
  - POST /api/auth/logout — requires auth, returns success message
  - GET /api/auth/me — returns current user with tenant info
  - PUT /api/auth/me — updates full_name/email with uniqueness check, prevents password/is_active changes
  - POST /api/auth/change-password — verifies current password, hashes new password
  - POST /api/auth/api-keys — generates API key (raw key shown once), stores hash, supports expires_days
  - GET /api/auth/api-keys — lists user's active API keys
  - DELETE /api/auth/api-keys/{key_id} — soft-deletes API key (is_active=False)
  - POST /api/auth/forgot-password — stub returning placeholder message
  - Local get_current_user with real OAuth2PasswordBearer injection and access-token-type validation
  - Local get_current_active_user dependency wrapping the local get_current_user
- Created routes/admin.py with superuser-only admin routes:
  - GET /api/auth/admin/users — paginated user listing with search (email/name filter)
  - GET /api/auth/admin/users/{user_id} — single user detail with tenant info
  - PUT /api/auth/admin/users/{user_id} — update any user field including is_active/is_superuser
  - DELETE /api/auth/admin/users/{user_id} — soft-delete, prevents self-deactivation
  - require_superuser dependency wrapping get_current_active_user

Stage Summary:
- 6 files created in services/auth/: Dockerfile, requirements.txt, main.py, routes/__init__.py, routes/auth.py, routes/admin.py
- 14 total endpoints: 11 auth + 3 admin routes
- Local OAuth2 dependency chain (oauth2_scheme → get_current_user → get_current_active_user → require_superuser)
- Redis-backed refresh token management with TTL and revocation support
- Auto-seeding of default superuser on startup
