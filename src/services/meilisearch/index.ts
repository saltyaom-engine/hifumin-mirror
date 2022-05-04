import { MeiliSearch } from 'meilisearch'
import type { Index } from 'meilisearch'

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
            const status: MeiliSearchStatus = await fetch('http://localhost:7700/health').then((r) => r.json())

            if(status?.status === "available")
                resolve()
        } catch (_) {}
    }, 100)

    await ready
    clearInterval(ping)
}

const createClient = async () => {
    await ping()

    const client = new MeiliSearch({ host: 'http://0.0.0.0:7700' })

    let index: Index<Hentai>
    try {
        index = await client.getIndex('hentai')
    } catch (_) {
        await client.createIndex('hentai', {
            primaryKey: 'id'
        })

        index = client.index('hentai')

        await index.updateSettings({
            sortableAttributes: ['id'],
            searchableAttributes: ['title', 'tags']
        })
    }

    const importing: Promise<void>[] = []

    for (let i = 1; i <= 20; i++)
        importing.push(
            new Promise<void>(async (done) => {
                const file = await readFile(
                    resolve(root, `./data/searchable${i}.json`),
                    {
                        encoding: 'utf-8'
                    }
                )

                await index.addDocuments(JSON.parse(file))

                done()
            })
        )

    await Promise.all(importing)

    return index
}

export default createClient
