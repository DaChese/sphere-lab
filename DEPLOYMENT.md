# Deploy on Railway from GitHub

1. In Railway, create a project using **Deploy from GitHub repo** and select `DaChese/sphere-lab`, branch `main`.
2. Leave the root directory at the repository root. Railway reads `railway.json`, builds with Railpack, and starts `npm start`. No build command, secrets, database, or manually configured PORT are needed.
3. After the deployment is healthy, open the service's **Settings > Networking** and select **Generate Domain**.
4. Open the generated HTTPS address. Check the sphere, scroll transition, readings, and mobile gestures. `/health` should return `ok`.

Runtime: Node 24. The server binds to `0.0.0.0` on Railway's `PORT` (locally: 3000), serves only the three public files in `dist`, and shuts down on SIGTERM. Railway uses `/health` to check readiness. Existing `.openai/hosting.json` is unrelated to Railway and can remain in the repository.

Local commands:

```sh
npm ci
npm run check
npm test
npm start
```

Then open http://localhost:3000. No external npm dependencies are required. If adding public files later, add their routes and content types to `server.js`.

References: [Railway config as code](https://docs.railway.com/config-as-code/reference), [public networking](https://docs.railway.com/networking/public-networking).
