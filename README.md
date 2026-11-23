<!-- coderabbit-ai-generated:v1 -->

# Lammart

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:82a514244a3323e2b2f223878ca09ba018a2df1292a997b61886fd9af77da362 -->

## Local development

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:eddfa2a9ed76c778b847ac282be3214f1a3d6e294ca2b5ac4d83a91e9d47fca7 -->

<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:86feeda44b9960caa76d6adfd616808a65a2f66cb2a8b318b71db93096615da7 -->

Use Node.js 22.16 or later in the 22.x series, or Node.js 24 or later. Node's built-in SQLite needs FTS5 support for catalog search; the runtime may display an experimental SQLite warning. From the repository root, run `npm ci`, `npm run build:shared`, then `npm run dev`. The API uses Node's built-in SQLite support and applies migrations at startup. A fresh database starts empty. Fixtures live under the API tests and are loaded only by tests.

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

## Production deployment

1. Set `INTERNAL_API_URL` to the private API origin (defaults to `http://127.0.0.1:4000`). Set `SITE_URL` to the real public HTTPS origin when the storefront is ready to be indexed. Set these before `npm run build` and keep them consistent at runtime.
2. Run `npm ci` and `npm run build`. Deploy the built workspaces and their runtime dependencies, including `apps/api/src/db/migrations`.
3. Run `DB_PATH=/absolute/persistent/path/store.db NODE_ENV=production npm run start:api`, then `npm run start:web`. The API binds to loopback by default. If the API runs in a separate private network, set `HOST` and restrict access to the storefront or trusted ingress. Serve the storefront over HTTPS.
4. Use a fresh SQLite file if replacing the old demo database. Existing databases are never erased or reseeded. Back up any real data before switching files or running migrations. Use a durable local volume, a single API instance per database, and a tested backup schedule.
<!-- coderabbit-ai-generated:v1 -->

<!-- coderabbit-ai-generated-section:v1:ec97ada59f2b7cf3705c07ca4c12bd3fa19f0c5436b893998b1a43638c00577a -->

5. Load verified catalog, media and delivery coverage before advertising listings. Publish the business’s actual terms and privacy details before public launch. Order processing, payments, and outbound enquiry notifications are not implemented.

## Administration

Create the first admin locally using the same database as the API. Choose a unique password of 12–128 characters. The app never creates a default administrator.

PowerShell, from the repository root:

```powershell
$env:ADMIN_EMAIL = Read-Host 'Admin email'
$secret = Read-Host 'Admin password' -AsSecureString
$env:ADMIN_PASSWORD = [System.Net.NetworkCredential]::new('', $secret).Password
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
```

Set `DB_PATH` first if the API uses a custom database path. For a compiled production deployment, set `DB_PATH`, `NODE_ENV=production`, and the same admin environment variables, then run `node apps/api/dist/modules/auth/create-admin.js`. To reset an existing admin password locally, run `npm run admin:create -- --reset-password`. The reset revokes previous sessions. The published demo password cannot be used to sign in as an admin on an older database; reset it before use.

With the app running, visit `/admin`. Add a category and optional brand, create a product, then add a priced variant. Its thickness and finish become storefront filter values. Products can be hidden without deleting their database records. The panel also shows incoming enquiries and lets administrators manage other accounts.

Visitors can register as customers at `/account`. Only admins can open the panel, read admin data, or change account roles. Dealers and customers can sign in to their own accounts; dealer-specific pricing and workflows are not part of this update. Changing an account’s role or active status signs that account out. Admins cannot change their own access.

The storefront and API should be served through the same origin. Use HTTPS in production; the session cookie is marked Secure there.

<!-- /coderabbit-ai-generated:v1 -->

<!-- /coderabbit-ai-generated:v1 -->

## Enquiries and cart quotes

The storefront sends contact, samples, and quote requests to `POST /api/v1/contact`. The API saves them in the SQLite `contact_enquiries` table and returns a reference. Requests are stored for staff follow-up; the application does not send notifications or collect payment.

An operator with access to the application database can review the queue with `SELECT reference, created_at, subject FROM contact_enquiries ORDER BY created_at DESC;` and look up the request by reference to see contact details, notes, and requested SKUs and quantities. Keep database access restricted to authorized staff.
