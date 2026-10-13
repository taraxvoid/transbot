import { fixtureResponse } from './resolve'

export const TEST_BASE = 'https://api.test/v3'

/** A fetch that answers from fixtures and records decoded request paths. */
export function fixtureFetch(log: string[] = []): typeof fetch {
    return (async (input: RequestInfo | URL) => {
        const href =
            typeof input === 'string'
                ? input
                : input instanceof URL
                  ? input.href
                  : input.url
        const url = new URL(href)
        log.push(decodeURIComponent(url.pathname))
        return fixtureResponse(url.pathname)
    }) as unknown as typeof fetch
}
