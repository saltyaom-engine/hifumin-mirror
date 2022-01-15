import { mkdirSync, existsSync, writeFileSync } from 'fs'

import PQueue from 'p-queue'
import fetch from 'isomorphic-unfetch'
import parse from 'node-html-parser'

// NHentai Rate limit
const queue = new PQueue({ concurrency: 6 })

// ? Get estimate latest nhentai id
const getLatest = async (): Promise<number | Error> => {
    return 4000

    // const html = await fetch('https://nhentai.net')
    //     .then((res) => res.text())
    //     .then((res) => parse(res))

    // const firstCover = html.querySelector(
    //     '#content > .index-container:nth-child(2) > .gallery > .cover'
    // )

    // if (!firstCover) throw new Error("Couldn't find first cover")

    // const url = firstCover.getAttribute('href')!

    // const id = url
    //     .split('/')
    //     .reverse()
    //     .find((x) => x)

    // return id ? parseInt(id) : new Error("Couldn't find id")
}

const getNhentai = async (
    id: number,
    iteration = 0
): Promise<string | Error> => {
    try {
        const hentai: string = await fetch(
            `https://nhentai.net/api/gallery/${id}`
        ).then((res) => res.text())

        if (!hentai.startsWith('{"id"')) return new Error('Not found')

        return hentai
    } catch (err) {
        if (iteration <= 5) {
            await new Promise((resolve) => setTimeout(resolve, 8000))

            return getNhentai(id, iteration + 1)
        }

        return new Error("Couldn't fetch hentai")
    }
}

const estimateTime = ({
    since,
    current,
    total
}: {
    since: number
    current: number
    total: number
}) => (((performance.now() - since) / current) * (total - current)) / 1000

const formatDisplayTime = (time: number) => {
    let seconds = ~~time
    let minutes = 0
    let hours = 0

    while (seconds >= 3600) {
        seconds -= 3600
        hours += 1
    }

    while (seconds >= 60) {
        seconds -= 60
        minutes += 1
    }

    if (hours) return `${hours}h ${minutes}m ${seconds}s`

    if (minutes) return `${minutes}m ${seconds}s`

    return `${seconds}s`
}

const batch = (
    total: number,
    batch: number = +(process.env?.WORKER_INDEX ?? 1)
) => {
    const totalWorker = +(process.env?.WORKER_COUNT ?? 1)

    const start = Math.floor(((batch - 1) * total) / totalWorker + 1)
    const end = Math.floor((batch * total) / totalWorker)

    return { start, end }
}

const main = async () => {
    const total = await getLatest()

    if (total instanceof Error) {
        console.error(total.message)
        process.exit(1)
    }

    const { start, end } = batch(total)
    console.log(`${total} total, worker: ${start} - ${end}`)

    if (!existsSync('data')) mkdirSync('data')

    const since = performance.now()

    let current = start
    let iteration = 1

    for (let i = start; i <= end; i++) {
        queue.add(async () => {
            const hentai = await getNhentai(i)

            current++
            iteration++

            if (hentai instanceof Error) {
                console.log(`${i} not found`)
                return
            }

            writeFileSync(`data/${i}.json`, hentai)
        })

        // For GH Action use 1.25s, local use 0.625s
        queue.add(() => new Promise((resolve) => setTimeout(resolve, 1250)))
    }

    const progress = setInterval(() => {
        console.log(
            `(${((iteration / (end - start)) * 100).toFixed(
                4
            )}%) | ${current}/${end} | Estimate time left: ${formatDisplayTime(
                estimateTime({
                    current: iteration,
                    total: end - start,
                    since
                })
            )}`
        )
    }, 10000)

    await queue.onIdle()

    clearInterval(progress)

    console.log(
        'Done in',
        ((performance.now() - since) / 1000).toFixed(3),
        'seconds'
    )
}

main()
