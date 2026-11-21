import { ConvexReactClient } from 'convex/react';

const url = import.meta.env.VITE_CONVEX_URL;

if (!url) {
  throw new Error(
    'VITE_CONVEX_URL is not set. Copy .env.example to .env.local and point it at your Convex deployment.',
  );
}

export const convex = new ConvexReactClient(url);
