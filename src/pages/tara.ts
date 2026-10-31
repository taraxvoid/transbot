import type { APIRoute } from 'astro'

export const prerender = false

// 302, not 301: browsers cache 301s forever, and the alias may change.
export const GET: APIRoute = ({ redirect }) => redirect('/profile/taravie', 302)
