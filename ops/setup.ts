import { MeiliSearch } from 'meilisearch'
import type { Index, EnqueuedTask } from 'meilisearch'

import fetch from 'isomorphic-unfetch'

import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { path as root } from 'app-root-path'

import { exec } from 'child_process'

export interface Hentai {
    id: number
    title: String
    tags: string[]
    page: number
}

export interface MeiliSearchStatus {
    status: 'available' | string
}

const command = resolve('./', root, `meilisearch --http-addr '0.0.0.0:7700'`)

const meili = exec(command, (error, stdout, stderr) => {
    console.log(stdout, stderr)

    if (!error && !stderr) {
        console.log(stdout)
    } else {
        console.error(error || stderr)

        process.exit(1)
    }
})

process.on('exit', () => {
    if (meili) meili.kill()
})

const ping = async () => {
    let resolve: () => void

    const ready = new Promise<void>((r) => {
        resolve = r
    })

    const ping = setInterval(async () => {
        try {
            const status: MeiliSearchStatus = await fetch(
                'http://0.0.0.0:7700/health'
            ).then((r) => r.json())

            if (status?.status === 'available') resolve()
        } catch (err) {
            // @ts-ignore
            console.log(err?.code ?? 'Unable to connect to Meilisearch')
        }
    }, 1000)

    await ready

    console.log('Connected to Meiliserach')
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
            searchableAttributes: ['tags', 'title']
        })

        await index.updateRankingRules([
            'words',
            'sort',
            'attribute',
            'proximity',
            'exactness',
            'typo'
        ])

        await index.updateFilterableAttributes(['tags'])
    }

    const importing: Promise<EnqueuedTask>[] = []

    // Index from newest to oldest
    for (let i = 20; i > 1; i--)
        importing.push(
            new Promise<EnqueuedTask>(async (done) => {
                try {
                    const file = await readFile(
                        resolve(root, `./data/searchable${i}.json`),
                        {
                            encoding: 'utf-8'
                        }
                    )

                    done(await index.addDocuments(JSON.parse(file)))
                } catch (err) {
                    console.log(`Unable to parse JSON at searchable${i}.json`)
                    console.log(err)
                    console.log('Exiting...')

                    process.exit(1)
                }
            })
        )

    const tasks = await Promise.all(importing)

    const signal = setInterval(() => {
        console.log('Indexing...')
    }, 60000)

    console.log('Start Indexing...')
    await client.waitForTasks(
        tasks.map(({ uid }) => uid),
        {
            intervalMs: 10 * 1000,
            timeOutMs: 5 * 60 * 1000
        }
    )

    clearTimeout(signal)
    console.log('Done Indexing')

    // For any possible size increase after search
    console.log('Perform search warm up')

    await index.search('yuri', {
        limit: 25
    })

    await index.search('yuri', {
        offset: 2,
        limit: 25,
        filter: '(tags != "yaoi") AND (tags != "yuri or ice") AND (tags != "yuuri") AND (tags != "males only")'
    })

    await index.search('blue archive', {
        offset: 2,
        limit: 25
    })

    await index.search('azur lane', {
        limit: 25
    })

    await index.search('arknights', {
        offset: 3,
        limit: 25
    })

    await index.search('touhou', {
        limit: 25
    })

    console.log('Done warming up')

    process.exit(0)
}

createClient()

const updateIndex = async () => {
    const client = new MeiliSearch({ host: 'http://0.0.0.0:7700' })
    const index = client.index('hentai')

    const resetter = await index.resetRankingRules()
    await client.waitForTasks([resetter.uid])

    const task = await index.updateRankingRules([
        'words',
        'sort',
        'attribute',
        'proximity',
        'exactness',
        'typo'
    ])

    await client.waitForTasks([task.uid])

    console.log('Update Index')
}

// updateIndex()
