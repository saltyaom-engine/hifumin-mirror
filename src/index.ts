import { mkdirSync, existsSync, writeFileSync, appendFileSync } from 'fs'
import { writeFile, appendFile } from 'fs/promises'

import type { Browser, Page } from 'puppeteer'
import puppeteer from 'puppeteer-extra'
import Stealth from 'puppeteer-extra-plugin-stealth'

import PQueue from 'p-queue'
import parse from 'node-html-parser'

puppeteer.use(Stealth())
const queue = new PQueue({ concurrency: 6 })

const currentWorker = +(process.env?.WORKER_INDEX ?? 1)
const searchable = `data/searchable${currentWorker}.json`

const searchIndex = [] as Record<string, unknown>[]

const getLatest = async (
    browser: Browser,
    iteration = 0
): Promise<number | Error> => {
    const page = await browser.newPage()
    await page.goto('https://nhentai.net', {
        waitUntil: 'networkidle2'
    })

    try {
        const firstCover = (
            await page.waitForSelector(
                '#content > .index-container:nth-child(3) > .gallery > .cover',
                {
                    timeout: 10000
                }
            )
        )?.asElement()
        if (!firstCover) throw new Error("Couldn't find first cover")

        const url = await firstCover.getProperty('href')

        const id = url
            .toString()
            .split('/')
            .reverse()
            .find((x) => x)

        await new Promise((resolve) => setTimeout(resolve, 3000))

        await page.close()
        return id ? parseInt(id) : new Error("Couldn't find id")
    } catch (err) {
        if (iteration < 3) {
            await new Promise((resolve) => setTimeout(resolve, 3000))

            return getLatest(browser, iteration + 1)
        }

        console.log(await page.content())
        return new Error('Unable to bypass Cloudflare')
    }
}

const getNhentai = async (
    browser: Browser,
    id: number,
    iteration = 0
): Promise<string | Error> => {
    const page = await browser.newPage()
    if (iteration > 1) await page.setJavaScriptEnabled(true)

    try {
        await page.goto(`https://nhentai.net/api/gallery/${id}`, {
            waitUntil: 'networkidle2'
        })

        await page.waitForSelector('body > pre', {
            timeout: iteration === 0 ? 2500 : 7500
        })

        const hentai = await page.$eval('body > pre', (el) => el.innerHTML)
        if (!hentai.startsWith('{"id"')) return new Error('Not found')

        return hentai
    } catch (err) {
        if (iteration < 3) {
            await new Promise((resolve) => setTimeout(resolve, 5000))

            return getNhentai(browser, id, iteration + 1)
        }

        return new Error("Couldn't fetch hentai")
    } finally {
        await page.close()
    }
}

const addToSearchIndex = async (data: string) => {
    const hentai = JSON.parse(data)

    searchIndex.push({
        id: +hentai.id,
        title: hentai.title.pretty,
        tags: hentai.tags.map((x: Record<string, unknown>) => x.name),
        page: hentai.num_pages
    })
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

const batch = (total: number, batch: number = currentWorker) => {
    const totalWorker = +(process.env?.WORKER_COUNT ?? 1)

    const start = Math.floor(((batch - 1) * total) / totalWorker + 1)
    const end = Math.floor((batch * total) / totalWorker)

    return { start, end }
}

const main = async () => {
    const browser = (await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox'],
        executablePath: process.env.PUPPETEER_EXEC_PATH
    })) as unknown as Browser

    let total = await getLatest(browser)

    if (total instanceof Error) {
        console.error(total.message)
        process.exit(1)
    }

    const { start, end } = batch(total)
    console.log(`${total} total, worker: ${start} - ${end}`)

    if (!existsSync('data')) mkdirSync('data')

    const since = performance.now()

    const latestHentai = await getNhentai(browser, total)
    if (latestHentai instanceof Error) {
        console.error("Can't get latest hentai")
        process.exit(1)
    }

    await Promise.all([
        writeFile(`data/latest_id.txt`, total.toString()),
        writeFile(`data/latest.json`, latestHentai)
    ])

    let current = start
    let iteration = 1

    for (let i = start; i <= end; i++)
        queue.add(async () => {
            const hentai = await getNhentai(browser, i)

            current++
            iteration++

            if (hentai instanceof Error) return console.log(`${i} not found`)

            await Promise.all([
                writeFile(`data/${i}.json`, hentai),
                addToSearchIndex(hentai),
                new Promise((resolve) => setTimeout(resolve, 500))
            ])
        })

    let latestProgress = 0

    const progress = setInterval(async () => {
        if (latestProgress === iteration) {
            appendFileSync(searchable, ']')

            await browser.close()
            return process.exit(0)
        }

        latestProgress = iteration

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
    await writeFile(searchable, JSON.stringify(searchIndex))

    console.log(
        'Done in',
        ((performance.now() - since) / 1000).toFixed(3),
        'seconds'
    )

    await browser.close()
}

main()
