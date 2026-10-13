// `wrangler types --include-runtime=false` leaves out workerd's runtime types:
// they declare a global Element (HTMLRewriter) that merges into the DOM one and
// breaks append/after/replaceChildren in browser scripts. Declare the little
// the Worker code uses instead.

interface Fetcher {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
}

declare module 'cloudflare:workers' {
    export const env: Env
}
