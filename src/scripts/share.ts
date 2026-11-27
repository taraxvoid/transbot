import { qrImage } from '../lib/qr'
import { el } from './dom'

/** What the share sheet suggests: the sharer may not be the person named. */
export const VISITOR_SHARE_TEXT =
    'Here is a quick way to practice a name and pronouns:'

const SVG_NS = 'http://www.w3.org/2000/svg'

/** Decorative 24x24 icon; the link around it carries the accessible name. */
function icon(path: string, stroke = false): SVGSVGElement {
    const svg = document.createElementNS(SVG_NS, 'svg')
    svg.setAttribute('viewBox', '0 0 24 24')
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    const shape = document.createElementNS(SVG_NS, 'path')
    shape.setAttribute('d', path)
    if (stroke) {
        shape.setAttribute('fill', 'none')
        shape.setAttribute('stroke', 'currentColor')
        shape.setAttribute('stroke-width', '2')
        shape.setAttribute('stroke-linecap', 'round')
        shape.setAttribute('stroke-linejoin', 'round')
    }
    svg.append(shape)
    return svg
}

// Brand path is from Simple Icons (simpleicons.org, CC0 1.0).
const BLUESKY =
    'M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026'
const MAIL = 'M3 5h18v14H3zM3 6l9 7 9-7'
const MESSAGE = 'M4 4h16v12H8l-4 4z'
const QR =
    'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h3v3h-3zM20 14v1M14 20h3M20 18v3'
const SHARE_ARROW = 'M12 16V3M7 8l5-5 5 5M5 12v8h14v-8'

interface ShareTarget {
    name: string
    path: string
    stroke?: boolean
    href: (url: string, text: string) => string
}

/** Places to send the link, each a plain link: no scripts, no tracking. */
export const SHARE_TARGETS: ShareTarget[] = [
    {
        name: 'Bluesky',
        path: BLUESKY,
        href: (url, text) =>
            `https://bsky.app/intent/compose?text=${encodeURIComponent(`${text} ${url}`)}`,
    },
    {
        name: 'Email',
        path: MAIL,
        stroke: true,
        href: (url, text) =>
            `mailto:?subject=${encodeURIComponent('Practice a name and pronouns')}&body=${encodeURIComponent(`${text} ${url}`)}`,
    },
    {
        name: 'Text message',
        path: MESSAGE,
        stroke: true,
        // `?&body=` is the form both iOS and Android read.
        href: (url, text) =>
            `sms:?&body=${encodeURIComponent(`${text} ${url}`)}`,
    },
]

function targetLink(target: ShareTarget, url: string, text: string): Node {
    const external = !/^(mailto|sms):/.test(target.href(url, text))
    const attrs: Record<string, string> = {
        href: target.href(url, text),
        class: 'share-target',
        'aria-label': `Share on ${target.name}`,
        title: target.name,
    }
    if (external) {
        attrs.target = '_blank'
        attrs.rel = 'noopener noreferrer'
    }
    return el('a', attrs, icon(target.path, target.stroke))
}

/** Round icon button matching the app links; the label is its accessible name. */
function iconButton(label: string, path: string): HTMLButtonElement {
    return el(
        'button',
        {
            type: 'button',
            class: 'share-target',
            'aria-label': label,
            title: label,
        },
        icon(path, true),
    )
}

function copyButton(
    url: string,
    status: HTMLElement,
    onFail: () => void,
): HTMLButtonElement {
    const button = el('button', { type: 'button' }, 'Copy link')
    const failed = (): void => {
        button.textContent = 'Copy failed'
        status.textContent = 'Copy failed, the link is shown to copy by hand'
        onFail()
    }
    button.addEventListener('click', () => {
        // clipboard is missing outside secure contexts; that is a failure too.
        Promise.resolve()
            .then(() => navigator.clipboard.writeText(url))
            .then(() => {
                button.textContent = 'Copied'
                status.textContent = 'Link copied'
            })
            .catch(failed)
    })
    return button
}

/** Renders the SVG to a PNG blob: badge printers and chat apps take PNG. */
function svgToPng(svg: string, width: number, height: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const objectUrl = URL.createObjectURL(
            new Blob([svg], { type: 'image/svg+xml' }),
        )
        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = width * 20
            canvas.height = height * 20
            const ctx = canvas.getContext('2d')
            URL.revokeObjectURL(objectUrl)
            if (!ctx) {
                reject(new Error('no canvas'))
                return
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            canvas.toBlob((blob) => {
                if (blob) resolve(blob)
                else reject(new Error('no png'))
            }, 'image/png')
        }
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl)
            reject(new Error('svg failed to load'))
        }
        img.src = objectUrl
    })
}

function qrButton(url: string, status: HTMLElement): HTMLButtonElement {
    const button = iconButton('Download QR code', QR)
    button.addEventListener('click', () => {
        const { svg, width, height } = qrImage(url, 'transbot.net')
        svgToPng(svg, width, height)
            .then((blob) => {
                const href = URL.createObjectURL(blob)
                el('a', { href, download: 'transbot-qr.png' }).click()
                URL.revokeObjectURL(href)
                status.textContent = 'QR code downloaded'
            })
            .catch(() => {
                status.textContent = 'Could not make the QR code'
            })
    })
    return button
}

function shareButton(url: string, text: string): HTMLButtonElement | null {
    const data = { url, text }
    if (typeof navigator.share !== 'function') return null
    // Older browsers have share() without canShare(); only a "no" counts.
    if ('canShare' in navigator && !navigator.canShare(data)) return null
    const button = iconButton('Share', SHARE_ARROW)
    button.addEventListener('click', () => {
        // Cancelling the share sheet rejects; nothing to report.
        navigator.share(data).catch(() => {})
    })
    return button
}

/**
 * Copy link, then an icon row: one link per app, the QR download, and Share
 * where the browser has a share sheet. The raw URL stays hidden unless Copy fails, when it shows up selected
 * so it can be copied by hand. Extra nodes (like "Make your own") go last.
 */
export function shareActions(
    url: string,
    text: string,
    ...extra: Node[]
): HTMLElement {
    // The button's own text changes too, but screen readers don't announce
    // that, so the result also goes to a status region.
    const status = el('span', { class: 'visually-hidden', role: 'status' })
    const wrap = el('div', { class: 'share-actions' })
    const showLink = (): void => {
        let field = wrap.querySelector<HTMLInputElement>('.share-url')
        if (!field) {
            field = el('input', {
                class: 'share-url',
                type: 'text',
                readonly: '',
                value: url,
                'aria-label': 'Link to copy',
            })
            wrap.append(field)
        }
        field.focus()
        field.select()
    }
    const row = el(
        'div',
        { class: 'link-out' },
        copyButton(url, status, showLink),
    )
    // One group, so on a narrow screen the icons wrap together. The native
    // share sheet, where there is one, goes last.
    const targets = el(
        'div',
        { class: 'share-targets' },
        ...SHARE_TARGETS.map((t) => targetLink(t, url, text)),
        qrButton(url, status),
    )
    const share = shareButton(url, text)
    if (share) targets.append(share)
    row.append(targets)
    row.append(...extra, status)
    wrap.append(row)
    return wrap
}

/** Compact share row near the top of every practice page. */
export function shareBar(url: string): HTMLElement {
    return el(
        'section',
        {
            class: 'share share-bar',
            'aria-labelledby': 'share-heading',
        },
        el('h2', { id: 'share-heading' }, 'Share this page'),
        shareActions(url, VISITOR_SHARE_TEXT),
    )
}

/**
 * End-of-chat box: pass on the link they already have (never a new one) or
 * go make their own. Nothing is tracked.
 */
export function endShare(url: string): HTMLElement {
    return el(
        'section',
        { class: 'share end-share', 'aria-labelledby': 'end-share-heading' },
        el('h2', { id: 'end-share-heading' }, 'Pass it on'),
        shareActions(
            url,
            VISITOR_SHARE_TEXT,
            el('a', { href: '/', class: 'make-own' }, 'Make your own'),
        ),
    )
}
