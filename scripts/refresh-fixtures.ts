/// <reference types="bun" />
// Re-downloads the pronoun sets the tests use from the live pronouns.page API.
// Run by hand (`bun run fixtures:refresh`); CI never calls the live API.
// Profiles in test/fixtures/api/profiles are hand-written and synthetic. Never
// copy a real profile there: real profiles can hold private custom-opinion
// entries.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { DEFAULT_API_BASE, pronounPath } from '../src/lib/pronouns/client'
import { fixtureName } from '../test/fixtures/resolve'

const VALUES = [
    'xe',
    'she',
    'they',
    'xe&she',
    'ae',
    'ae/aer/aer/aers/aerself',
    'ne/nem/nir/nirs/nemself',
]
const dir = join(import.meta.dir, '../test/fixtures/api/pronouns')

mkdirSync(dir, { recursive: true })
for (const value of VALUES) {
    const res = await fetch(
        `${DEFAULT_API_BASE}/pronouns/${pronounPath(value)}`,
    )
    if (!res.ok) throw new Error(`${value}: HTTP ${res.status}`)
    const body = JSON.stringify(await res.json(), null, 4)
    writeFileSync(join(dir, fixtureName(value)), `${body}\n`)
    console.log(`saved ${value}`)
}
