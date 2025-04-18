# Svelte library

Everything you need to build a Svelte library, powered by [`sv`](https://npmjs.com/package/sv).

Read more about creating a library [in the docs](https://svelte.dev/docs/kit/packaging).

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```bash
# create a new project in the current directory
npx sv create

# create a new project in my-app
npx sv create my-app
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

Everything inside `src/lib` is part of your library, everything inside `src/routes` can be used as a showcase or preview app.

## Building

To build your library:

```bash
npm run package
```

To create a production version of your showcase app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.

## Publishing

Go into the `package.json` and give your package the desired name through the `"name"` option. Also consider adding a `"license"` field and point it to a `LICENSE` file which you can create from a template (one popular option is the [MIT license](https://opensource.org/license/mit/)).

To publish your library to [npm](https://www.npmjs.com):

```bash
npm publish
```

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

## Design

The dashboard features a minimalist design with:

- Blue as the primary color (#0053b3)
- Red as the accent color (#e63946)
- A clean, card-based navigation system

## Deployment

This project is deployed on CapRover at [zaur.app](https://zaur.app).

## License

This project is open source and available under the [MIT License](LICENSE).
