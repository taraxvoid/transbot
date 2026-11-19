import type { APIRoute } from 'astro'
import { resolveAlias } from '../lib/aliases'

export const prerender = false

// Static routes (/practice, /profile, /api, /@name) win over this one, so an
// alias can't shadow them; test/lib/aliases.test.ts checks that too.
// 302, not 301: browsers cache 301s forever, and the alias may change.
export const GET: APIRoute = ({ params, redirect }) => {
    const target = resolveAlias(params.alias ?? '')
    if (!target) return new Response(null, { status: 404 })
    return redirect(target, 302)
}
