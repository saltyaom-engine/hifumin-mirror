import { search } from './services'

import type { FastifyPluginCallback } from 'fastify'
import type { Hentai, SearchHandler } from './types'

const base: FastifyPluginCallback = (app, _, done) => {
    app.get<SearchHandler>(
        '/:keyword/:batch',
        async ({ meilisearch, params: { keyword, batch } }, res) => {
            if (isNaN(+batch) || batch < 1)
                return res.code(400).send([])

            if (batch > 1_000_000)
                return res.code(400).send([])

            return search(meilisearch, keyword, batch)
        }
    )

    done()
}

export default base
