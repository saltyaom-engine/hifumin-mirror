import NodeCache from 'node-cache'

import type { Index } from 'meilisearch'
import type { Hentai } from './types'

const Cache = new NodeCache()
const limit = 25

const getBatch = (batch: number) => ({
    limit,
    offset: (batch - 1) * limit
})

type Resolver = (v: number[] | null) => void
type Pending = [Promise<number[] | null>, Resolver]

const pendings: Record<string, Pending> = {}

const createPending = (key: string) => {
    let resolver: Resolver = () => {}
    const pending = new Promise<number[] | null>((resolve) => {
        resolver = resolve
    })

    pendings[key] = [pending, resolver]

    return resolver
}

const FILTERS: Record<string, string | string[]> = {
    yuri: '(tags != "yaoi") AND (tags != "yuri or ice") AND (tags != "yuuri") AND (tags != "males only")'
}

export const search = async (
    client: Index<Hentai>,
    keyword: string,
    batch = 1
 ) => {
    const key = keyword + batch
    const cached = Cache.get<number[]>(key)
    if (cached) return cached

    const pending = pendings[key]
    if (pending) {
        const operation = await pending[0]

        if (operation) return await operation
    }

    const resolve = createPending(key)

    try {
        const response = await client.search<Hentai>(keyword, {
            ...getBatch(batch),
            sort: ['id:desc'],
            filter: FILTERS[keyword] ?? '',
            matches: true
        })

        const result = response.hits.map((hit) => hit.id)
        Cache.set(key, result)
        resolve(result)

        return result
    } catch (_) {
        return []
    }
}
