import { mkdirSync, existsSync, writeFileSync } from 'fs'

import fetch from 'isomorphic-unfetch'

import PQueue from 'p-queue'

// NHentai Rate limit
const queue = new PQueue({ concurrency: 6 })

// ? Get estimate latest nhentai id
const getLatest = async (): Promise<number | Error> => {
    return 500

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

const getNhentai = async (id: number): Promise<string | Error> => {
    const hentai: string = await fetch(
        `https://nhentai.net/api/gallery/${id}`
    ).then((res) => res.text())

    if (!hentai.startsWith('{"id"')) return new Error('Not found')

    return hentai
}

const main = async () => {
    const total = await getLatest()

    if (total instanceof Error) {
        console.error(total.message)
        process.exit(1)
    }

    console.log("Total:", total)

    if (!existsSync('data')) mkdirSync('data')

    const since = performance.now()
    let current = 1

    for (let i = 1; i <= total; i++) {
        queue.add(async () => {
            const hentai = await getNhentai(i)

            current++

            if (hentai instanceof Error) {
                console.log(`${i} not found`)
                return
            }

            writeFileSync(`data/${i}.json`, hentai)
        })
        queue.add(() => new Promise((resolve) => setTimeout(resolve, 575)))
    }

    const progress = setInterval(() => {
        console.log(`(${((current / total) * 100).toFixed(4)}%) | ${current}/${total}`)
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
