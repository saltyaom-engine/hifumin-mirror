import { search } from './services'

import type { FastifyPluginCallback } from 'fastify'
import type { Hentai, SearchHandler } from './types'

const base: FastifyPluginCallback = (app, _, done) => {
    app.get<SearchHandler>(
        '/:keyword/:batch',
        async ({ meilisearch, params: { keyword, batch } }) =>
            search(meilisearch, keyword, batch)
    )

    done()
}

export default base
