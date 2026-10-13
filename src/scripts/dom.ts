type Child = Node | string

// worker-configuration.d.ts declares HTMLRewriter's Element.append, which
// shadows the DOM overload under the type checker. Go through this shape.
type Appendable = { append(...nodes: Child[]): void }

export function add(
    parent: HTMLElement | DocumentFragment,
    ...children: Child[]
): void {
    ;(parent as unknown as Appendable).append(...children)
}

export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs: Record<string, string> = {},
    ...children: Child[]
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag)
    for (const [key, value] of Object.entries(attrs)) {
        node.setAttribute(key, value)
    }
    // append() turns strings into text nodes, so names and card values never
    // parse as HTML.
    add(node as HTMLElement, ...children)
    return node
}
