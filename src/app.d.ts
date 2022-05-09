/* eslint-disable @typescript-eslint/no-unused-vars */
import type fastify, { FastifyRequest } from 'fastify'
import type { Index } from 'meilisearch'
import type { Hentai } from '@modules/search/types'

declare module 'fastify' {
    interface FastifyRequest {
        // meilisearch: Promise<Index<Hentai>>
    }
}