import type { RouteShorthandMethod } from 'fastify'

export interface Hentai {
    id: number,
    title: String
    tags: string[]
    page: number
}

export interface SearchHandler extends RouteShorthandMethod {
    Params: {
        keyword: string
        batch: number
    }
}
