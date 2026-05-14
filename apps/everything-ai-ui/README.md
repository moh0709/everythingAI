# EverythingAI UI

This React/Vite app has separate user and admin entry points.

## User UI

The official user-facing MVP UI is safe and non-destructive.

```bash
cd apps/everything-ai-ui
npm run dev
```

URL:

```txt
http://localhost:5151
```

Entry flow:

```txt
index.html
  -> src/main.tsx
  -> src/UserApp.tsx
```

User UI must not expose:

- file move execution
- rename execution
- planning execution
- batch execution
- recovery purge
- provider governance
- source-path mutation
- admin controls
- audit administration

## Admin UI

The admin/operator UI is separated for planning, execution governance, audit, provider settings, and source management.

```bash
cd apps/everything-ai-ui
npm run dev:admin
```

URL:

```txt
http://localhost:5152/admin.html
```

Entry flow:

```txt
admin.html
  -> src/admin-main.tsx
  -> src/admin/AdminApp.tsx
```

By default, `AdminApp.tsx` renders the existing `AppComplete.tsx` operator UI.

To test the new modular admin runtime:

```txt
http://localhost:5152/admin.html?adminRuntime=modular
```

## Safety Rule

Do not import admin/operator components into `UserApp.tsx`.

The user UI and admin UI must remain separate.
