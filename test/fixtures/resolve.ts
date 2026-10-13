import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { RawPronoun } from '../../src/lib/pronouns/client'

const API_DIR = fileURLToPath(new URL('./api/', import.meta.url))

/** `ae/aer/...` can't be a file name, so slashes become `__`. */
export function fixtureName(value: string): string {
    return `${value.replaceAll('/', '__')}.json`
}

function decode(segment: string): string {
    try {
        return decodeURIComponent(segment)
    } catch {
        return segment
    }
}

function notFound(pathname: string): Response {
    return Response.json(
        {
            error: true,
            statusCode: 404,
            statusMessage: 'Not found',
            url: pathname,
        },
        { status: 404 },
    )
}

/** Answers a pronouns.page API path from test/fixtures/api. */
export function fixtureResponse(pathname: string): Response {
    const pronoun = pathname.match(/\/pronouns\/(.+)$/)
    const profile = pathname.match(/\/profile\/get\/([^/]+)$/)
    let file: string | null = null
    if (pronoun) {
        file = join(API_DIR, 'pronouns', fixtureName(decode(pronoun[1])))
    } else if (profile) {
        file = join(
            API_DIR,
            'profiles',
            fixtureName(decode(profile[1]).toLowerCase()),
        )
    }
    if (!file || !existsSync(file)) return notFound(pathname)
    return new Response(readFileSync(file), {
        headers: { 'content-type': 'application/json' },
    })
}

export function loadPronounFixture(value: string): RawPronoun {
    const file = join(API_DIR, 'pronouns', fixtureName(value))
    return JSON.parse(readFileSync(file, 'utf8')) as RawPronoun
}
