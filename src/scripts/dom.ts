export function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs: Record<string, string> = {},
    ...children: Array<Node | string>
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag)
    for (const [key, value] of Object.entries(attrs)) {
        node.setAttribute(key, value)
    }
    // append() turns strings into text nodes, so names and card values never
    // parse as HTML.
    node.append(...children)
    return node
}
