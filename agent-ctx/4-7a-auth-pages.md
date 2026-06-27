Task ID: 4-7a
Agent: Main
Task: Wire LoginPage and RegisterPage to real auth system

Work Log:
- Read worklog.md for context, then read both LoginPage.tsx and RegisterPage.tsx
- LoginPage.tsx: Added `useAuthStore` import (alongside existing `useNavigationStore`), added `api` import, added `error` state, added `setAuth` destructure, replaced mock `handleSignIn` with real `api.login()` call + `setAuth()` + error handling, added error display UI before the Sign In button
- RegisterPage.tsx: Same pattern — added `useAuthStore` + `api` imports, added `error` state + `setAuth` destructure, replaced mock `handleCreateAccount` with real `api.register(email, password, fullName)` call (note: used `fullName` to match existing state variable), password length validation, error handling, added error display UI
- Preserved all existing state variables, UI elements, handler names, and styling
- Lint passes cleanly with zero errors