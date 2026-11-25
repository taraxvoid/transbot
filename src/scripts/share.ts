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

// Brand paths are from Simple Icons (simpleicons.org, CC0 1.0).
const WHATSAPP =
    'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z'
const TELEGRAM =
    'M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z'
const BLUESKY =
    'M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026'
const MAIL = 'M3 5h18v14H3zM3 6l9 7 9-7'
const MESSAGE = 'M4 4h16v12H8l-4 4z'

interface ShareTarget {
    name: string
    path: string
    stroke?: boolean
    href: (url: string, text: string) => string
}

/** Places to send the link, each a plain link: no scripts, no tracking. */
export const SHARE_TARGETS: ShareTarget[] = [
    {
        name: 'WhatsApp',
        path: WHATSAPP,
        href: (url, text) =>
            `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    },
    {
        name: 'Telegram',
        path: TELEGRAM,
        href: (url, text) =>
            `https://t.me/share/url?${new URLSearchParams({ url, text }).toString()}`,
    },
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
    const button = el('button', { type: 'button' }, 'Download QR code')
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
    const button = el('button', { type: 'button', class: 'secondary' }, 'Share')
    button.addEventListener('click', () => {
        // Cancelling the share sheet rejects; nothing to report.
        navigator.share(data).catch(() => {})
    })
    return button
}

/**
 * Copy link, Share where the browser has a share sheet, then one link per
 * app. The raw URL stays hidden unless Copy fails, when it shows up selected
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
    const share = shareButton(url, text)
    if (share) row.append(share)
    row.append(qrButton(url, status))
    // One group, so on a narrow screen the icons wrap together.
    row.append(
        el(
            'div',
            { class: 'share-targets' },
            ...SHARE_TARGETS.map((t) => targetLink(t, url, text)),
        ),
    )
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
