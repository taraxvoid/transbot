// voidflow settings for this repo; `kind` picks the defaults: https://github.com/taraxvoid/voidflow/blob/main/docs/config.md

import type { VoidflowConfig } from '@taraxvoid/voidflow/config'

export default {
    kind: 'site',
    // One custom domain, no bindings: the prod Worker and zone come from
    // wrangler.jsonc. Moved here from personal/infra's cf-tokens.ts. The preview
    // worker is pinned because voidflow reads wrangler.jsonc from main, which has
    // no env.preview until this PR merges; drop the pin after.
    cloudflare: {
        account: 'c6a445a43a801403a8e33968be40c19c',
        envs: [
            { env: 'prod' },
            { env: 'preview', worker: 'transbot-preview', zones: [] },
        ],
        retire: ['transbot-deploy-token'],
    },
    // The prod environment is protected by a ruleset on main.
    rulesets: { environments: { prod: ['main'] } },
} satisfies VoidflowConfig
