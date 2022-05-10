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

const command = resolve(
    './',
    root,
    `meilisearch --http-addr '0.0.0.0:7700' --max-indexing-memory '1.2 Gb'`
)

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
                'http://localhost:7700/health'
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

    const client = new MeiliSearch({ host: 'http://localhost:7700' })

    let index: Index<Hentai>
    try {
        index = await client.getIndex('hentai')
    } catch (_) {
        await client.createIndex('hentai', {
            primaryKey: 'id'
        })

        index = client.index('hentai')

        await index.updateSettings({
            displayedAttributes: ['id'],
            sortableAttributes: ['id'],
            searchableAttributes: ['tags', 'title'],
            filterableAttributes: ['tags'],
            rankingRules: [
                'words',
                'id:desc',
                'attribute',
                'proximity',
                'exactness',
                'typo'
            ],
            synonyms: {
                yaoi: ['males only'],
                yuri: ['females only']
            }
        })
    }

    const searchables: Promise<Hentai[]>[] = []

    // Index from newest to oldest
    for (let i = 20; i > 1; i--)
        searchables.push(
            new Promise<Hentai[]>(async (done) => {
                try {
                    const file = await readFile(
                        resolve(root, `./data/searchable${i}.json`),
                        {
                            encoding: 'utf-8'
                        }
                    )

                    done(JSON.parse(file))
                } catch (err) {
                    console.log(`Unable to parse JSON at searchable${i}.json`)
                    console.log(err)
                    console.log('Exiting...')

                    process.exit(1)
                }
            })
        )

    const searchable = (await Promise.all(searchables)).reduce((a, b) =>
        a.concat(b)
    )

    const task = await index.addDocuments(searchable, {
        primaryKey: 'id'
    })

    const signal = setInterval(() => {
        console.log('Indexing...')
    }, 60000)

    console.log('Start Importing...')
    await client.waitForTask(task.uid, {
        intervalMs: 10 * 1000,
        timeOutMs: 5 * 60 * 1000
    })

    console.log('Done Importing...')
    console.log('Start Indexing...')
    await client.waitForTasks(
        (await client.getTasks()).results.map((x) => x.uid)
    )

    clearTimeout(signal)
    console.log('Done Indexing')

    process.exit(0)
}

createClient()

// const updateIndex = async () => {
//     const client = new MeiliSearch({ host: 'http://0.0.0.0:7700' })
//     const index = client.index('hentai')

//     const resetter = await index.resetRankingRules()
//     await client.waitForTasks([resetter.uid])

//     const task = await index.updateRankingRules([
//         'words',
//         'id:desc',
//         'attribute',
//         'proximity',
//         'exactness',
//         'typo'
//     ])

//     await client.waitForTasks([task.uid])

//     console.log('Update Index')
// }

// updateIndex()
