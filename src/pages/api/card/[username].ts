import type { APIRoute } from 'astro'
import { getCard } from '../../../lib/server/card'
import { cardDeps } from '../../../lib/server/runtime'

export const prerender = false

const headers = { 'cache-control': 'no-store' }

export const GET: APIRoute = async ({ params }) => {
    const result = await getCard(params.username ?? '', cardDeps())
    if (result.status === 'found') {
        return Response.json({ identity: result.identity }, { headers })
    }
    return Response.json(
        { error: result.status },
        { status: result.status === 'not-found' ? 404 : 502, headers },
    )
}
