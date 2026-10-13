/**
 * JSON for an inline <script type="application/json">. Escaping `<` means a
 * value like `</script>` can't close the tag.
 */
export function jsonForScript(value: unknown): string {
    return JSON.stringify(value)
        .replaceAll('<', '\\u003c')
        .replaceAll('\u2028', '\\u2028')
        .replaceAll('\u2029', '\\u2029')
}
