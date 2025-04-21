# Zaur Dashboard

A minimalist dashboard for navigating between Zaur's open source projects.

## About

This is the main navigation hub for Zaur projects. It provides a clean, user-friendly interface to access various tools and applications within the Zaur ecosystem, including:

- PDF Tools (pdf.zaur.app)
- Cloud Storage (cloud.zaur.app)
- And other projects

## Development

This project is built with SvelteKit and uses Tailwind CSS for styling.

### Prerequisites

- Node.js (v18 or newer)
- pnpm

### Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Start the development server:
   ```bash
   pnpm dev
   ```
4. Open your browser and navigate to `http://localhost:5173`

### Build

To build the project for production:

```bash
pnpm build
```

## Deployment

This project is deployed on CapRover at [zaur.app](https://zaur.app).

The application uses automatic deployment - any push to the main branch will trigger a new build and deployment to the server.

### Database Migration

The application uses RethinkDB for data storage. By default, the migration scripts are **disabled** in production deployments to avoid running them on every container restart.

To run database migrations during deployment:

1. In your CapRover dashboard, go to the application settings
2. Add an environment variable: `RUN_MIGRATIONS=true`
3. Deploy the application
4. After successful migration, set `RUN_MIGRATIONS=false` to prevent migrations on subsequent deployments

For manual database operations, you can use these npm scripts:
- `pnpm run db:verify-migration` - Verify database sync status
- `pnpm run db:create-indexes` - Create database indexes
- `pnpm run migrate` - Run data migration from JSON to RethinkDB

### Database Configuration

The RethinkDB connection is configured using these environment variables:
- `RETHINKDB_HOST` - RethinkDB hostname or IP (default: 10.0.1.57)
- `RETHINKDB_PORT` - RethinkDB port (default: 28015)
- `RETHINKDB_DB` - RethinkDB database name (default: zaur_news)

## License

This project is open source and available under the [MIT License](LICENSE).
