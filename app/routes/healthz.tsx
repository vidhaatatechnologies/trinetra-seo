// Lightweight health check endpoint for Render / uptime monitors.
export const loader = () => new Response("ok", { status: 200 });
