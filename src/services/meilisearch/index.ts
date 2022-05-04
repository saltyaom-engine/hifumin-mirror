import { MeiliSearch } from 'meilisearch'
import type { Index, EnqueuedTask } from 'meilisearch'

import fetch from 'isomorphic-unfetch'

import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { path as root } from 'app-root-path'

import type { Hentai } from '@modules/search/types'
import type { MeiliSearchStatus } from './types'

const ping = async () => {
    let resolve: () => void

    const ready = new Promise<void>((r) => {
        resolve = r
    })

    const ping = setInterval(async () => {
        try {
            const status: MeiliSearchStatus = await fetch(
                'http://localhost:7700/health'
            ).then((r) => r.json())

            if (status?.status === 'available') resolve()
        } catch (_) {}
    }, 100)

    await ready
    clearInterval(ping)
}

const createClient = async (): Promise<Index<Hentai>> => {
    await ping()

    const client = new MeiliSearch({ host: 'http://0.0.0.0:7700' })

    return await client.getIndex('hentai')
}

export default createClient
