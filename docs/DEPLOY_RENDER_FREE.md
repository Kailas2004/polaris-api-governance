# Deploy Polaris For Free (Render)

This guide deploys:
- Spring Boot API as a Render `Web Service` (free)
- PostgreSQL as Render `PostgreSQL` (free, expires after 30 days unless upgraded)
- Redis as Render `Key Value` (free)
- React frontend as Render `Static Site` (free)

Repository includes [`render.yaml`](../render.yaml) so you can deploy via Blueprint import.

## 1. Push code to GitHub

Render deploys from your Git repo, so ensure your latest Polaris code is pushed.

## 2. Deploy with Blueprint (fastest)

1. In Render, click `New` -> `Blueprint`.
1. Select this repository/branch.
1. Render will detect `render.yaml` and create:
- `polaris-postgres` (free)
- `polaris-redis` (free)
- `polaris-api` (free web service)
- `polaris-frontend` (free static site)
1. Set `VITE_API_BASE_URL` for `polaris-frontend` to your backend public URL once backend is created (for example `https://polaris-api.onrender.com`), then redeploy frontend.

## 3. Manual setup (if you do not use Blueprint)

1. Create a new `PostgreSQL` instance:
1. Plan: `Free`
1. DB name: `polaris`
1. Copy these values from Render after creation:
- `Host`
- `Port`
- `Database`
- `Username`
- `Password`

2. Create a new `Key Value` instance:
1. Plan: `Free`
1. Copy these values:
- `Host`
- `Port`
- `Password` (if shown)

## 4. Deploy backend (`Web Service`)

Create a Render `Web Service` from this repo with:

- Runtime: `Java`
- Build Command: `./mvnw clean package -DskipTests`
- Start Command: `java -Dserver.port=$PORT -jar target/polaris-0.0.1-SNAPSHOT.jar`

Set environment variables:

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://<POSTGRES_HOST>:<POSTGRES_PORT>/<POSTGRES_DB>
SPRING_DATASOURCE_USERNAME=<POSTGRES_USER>
SPRING_DATASOURCE_PASSWORD=<POSTGRES_PASSWORD>

SPRING_DATA_REDIS_HOST=<REDIS_HOST>
SPRING_DATA_REDIS_PORT=<REDIS_PORT>
SPRING_DATA_REDIS_PASSWORD=<REDIS_PASSWORD>

POLARIS_AUTH_ADMIN_USERNAME=admin
POLARIS_AUTH_ADMIN_PASSWORD=Admin@123
POLARIS_AUTH_USER_USERNAME=user
POLARIS_AUTH_USER_PASSWORD=User@123
```

After first successful deploy, copy your backend public URL, for example:
`https://polaris-api.onrender.com`

## 5. Deploy frontend (`Static Site`)

Create a Render `Static Site` from the same repo with:

- Root Directory: `frontend`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`

Set environment variable:

```bash
VITE_API_BASE_URL=https://<your-backend-service>.onrender.com
```

In Static Site settings, add a rewrite for React Router:
- Source: `/*`
- Destination: `/index.html`
- Action: `Rewrite`

## 6. Update CORS in backend

In backend service env vars, set:

```bash
POLARIS_CORS_ALLOWED_ORIGINS=https://<your-frontend-site>.onrender.com
MANAGEMENT_ENDPOINTS_WEB_CORS_ALLOWED_ORIGINS=https://<your-frontend-site>.onrender.com
```

Then redeploy backend once.

## 7. Validate

1. Open frontend URL and log in as `admin/Admin@123`
1. Go to `System Health` and verify DB + Redis are `UP`
1. Create an API key from `API Keys`
1. Log in as `user/User@123` and run simulator requests

## Notes on free tier behavior

- Free web services can spin down on inactivity (cold start delay on first request).
- Render free PostgreSQL currently expires after 30 days unless upgraded.
