import { modeledSet, nameForms } from '../pronouns/identity'
import type { Identity } from '../pronouns/types'
import { pickFriends } from './friends'
import { SCENES, type Scene } from './scenes'
import { fill, type Person } from './template'

export type RenderedLine = {
    from: 'a' | 'b' | 'me'
    sender: string
    text: string
}
export type RenderedScene = { id: string; group: string; lines: RenderedLine[] }

/**
 * Who the chat is about, or null when there is nothing to practice (ask-me
 * first, or no name and no yes set). A name with no yes set means "use the
 * name".
 */
export function chatPerson(identity: Identity): Person | null {
    if (identity.askMe === 'only') return null
    const preferred = identity.names.preferred
    const set = modeledSet(identity)
    if (set) {
        // A :Kai set with no preferred name still has a name to use.
        const name = preferred ?? (set.kind === 'name' ? set.label : null)
        return { name, forms: set.forms, plural: set.plural }
    }
    if (!preferred) return null
    return { name: preferred, forms: nameForms(preferred), plural: false }
}

export function renderScene(
    scene: Scene,
    person: Person,
    friends: [string, string],
): RenderedScene {
    const senders = { a: friends[0], b: friends[1], me: 'You' }
    return {
        id: scene.id,
        group: scene.group,
        lines: scene.lines.map((line) => ({
            from: line.from,
            sender: senders[line.from],
            text: fill(line.text, person),
        })),
    }
}

/** Every scene in order, each with its own pair of friends. */
export function renderSession(
    person: Person,
    rng: () => number = Math.random,
): RenderedScene[] {
    return SCENES.map((scene) =>
        renderScene(scene, person, pickFriends(person.name, rng)),
    )
}
