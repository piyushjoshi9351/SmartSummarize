Run the app with Docker

Prerequisites:
- Docker Desktop (or Docker Engine + Compose) installed

From the project root run:

```bash
# build and start the app (maps port 9002)
docker compose up --build
```

Then open http://localhost:9002

Stop the container with Ctrl+C, or in another shell:

```bash
docker compose down
```

Alternative: run locally if you have Node/npm installed:

```bash
npm install
npm run dev
# open http://localhost:9002
```
