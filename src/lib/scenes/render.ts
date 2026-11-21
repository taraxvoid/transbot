import { modeledSet, nameForms } from '../pronouns/identity'
import type { Identity, PronounSet } from '../pronouns/types'
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
        // A :Kai set with no preferred name still has a name to use, in
        // every scene, whichever set the scene is about.
        const name =
            preferred ??
            identity.sets.find((s) => s.kind === 'name' && s.opinion === 'yes')
                ?.label ??
            null
        const person = personFor(set, name)
        // Every other yes set is a secondary one, in card order.
        const secondary = identity.sets
            .filter((s) => s !== set && s.opinion === 'yes')
            .map((s) => personFor(s, name))
        return secondary.length ? { ...person, secondary } : person
    }
    if (!preferred) return null
    return { name: preferred, forms: nameForms(preferred), plural: false }
}

function personFor(set: PronounSet, name: string | null): Person {
    return { name, forms: set.forms, plural: set.plural }
}

/**
 * Who a scene is about. Each secondary set has a one in three chance (less
 * when there are more than two, so they stay equal to the primary at worst);
 * the primary set gets whatever is left.
 */
export function pickPerson(
    person: Person,
    rng: () => number = Math.random,
): Person {
    const secondary = person.secondary ?? []
    if (!secondary.length) return person
    const each = Math.min(1 / 3, 1 / (secondary.length + 1))
    // The first slices of [0, 1) go to the secondaries, the rest to primary.
    const slot = Math.floor(rng() / each)
    return secondary[slot] ?? person
}

export function renderScene(
    scene: Scene,
    person: Person,
    friends: [string, string],
): RenderedScene {
    const senders = { a: friends[0], b: friends[1], me: 'You' }
    return {
        id: scene.id,
        group: fill(scene.group, person),
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
    return SCENES.map((scene) => {
        const who = pickPerson(person, rng)
        return renderScene(
            scene,
            who,
            // The subject form is the name for name sets like :Kai.
            pickFriends([who.name, who.forms.pronoun_subject], rng),
        )
    })
}
