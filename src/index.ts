import fastify from 'fastify'

import { base, search } from '@modules'
import { createClient, sleep } from '@services'

const app = fastify()

const main = async () => {
    const meilisearch = createClient()

    app
        // Using onRequest hook would block until client creation is complete
        .decorateRequest('meilisearch', meilisearch)
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
