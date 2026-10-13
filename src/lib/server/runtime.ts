import { env } from 'cloudflare:workers'
import { DEFAULT_API_BASE } from '../pronouns/client'
import type { CardDeps } from './card'

/** Worker wiring for getCard. Kept apart so card.ts stays unit-testable. */
export function cardDeps(): CardDeps {
    return {
        base: env.PRONOUNS_API_BASE || DEFAULT_API_BASE,
        cache:
            typeof caches === 'undefined'
                ? null
                : (caches as unknown as { default: Cache }).default,
    }
}
