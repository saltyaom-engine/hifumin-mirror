import NodeCache from 'node-cache'

import type { Index } from 'meilisearch'
import type { Hentai } from './types'

const Cache = new NodeCache()
const limit = 25

const getBatch = (batch: number) => ({
    limit,
    offset: (batch - 1) * limit
})

type Resolver = (v: Object | null) => void
type Pending = [Promise<Object | null>, Resolver]

const pendings: Record<string, Pending> = {}

const createPending = (key: string) => {
	let resolver: Resolver = () => {}
	const pending = new Promise<Object | null>((resolve) => {
		resolver = resolve
	})

	pendings[key] = [pending, resolver]

    return resolver
}

export const search = async (
    client: Index<Hentai>,
    keyword: string,
    batch = 1
) => {
    const key = keyword + batch
    const cached = Cache.get(key)
    if (cached) return cached

    const pending = pendings[key]
    if(pending) return await pending

    const resolve = createPending(key)
    const response = await client.search<Hentai>(keyword, {
        ...getBatch(batch),
        sort: ['id:desc']
    })

    const result = response.hits.map((hit) => hit.id)
    Cache.set(key, result)
    resolve(result)

    return result
}
