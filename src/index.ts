import fastify from 'fastify'

import { base, search } from '@modules'
import { createClient, sleep } from '@services'

const app = fastify()

const main = async () => {
    const meilisearch = await createClient()

    app.addHook('onRequest', async (req) => (req.meilisearch = meilisearch))
        .register(base)
        .register(search, {
            prefix: '/search'
        })
        .listen(8080, '0.0.0.0', (error, address) => {
            if (error) return console.error(error)

            console.log(`Sirin running at ${address}`)
        })
}

main()
