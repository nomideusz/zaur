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

## License

This project is open source and available under the [MIT License](LICENSE).
