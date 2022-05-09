import fetch from 'isomorphic-unfetch'
import { path as root } from 'app-root-path'
import { resolve as resolvePath } from 'path'
import { writeFile } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'

const main = async () => {
    if (!existsSync(resolvePath(root, 'data'))) mkdirSync('data')

    const ops: Promise<void>[] = []

    for (let i = 1; i <= 20; i++)
        ops.push(
            new Promise(async (resolve) => {
                const data = await fetch(
                    `https://raw.githubusercontent.com/saltyaom-engine/hifumin-mirror/generated/searchable${i}.json`
                ).then((r) => r.text())

                await writeFile(
                    resolvePath(root, `./data/searchable${i}.json`),
                    data
                )

                resolve()
            })
        )

    await Promise.all(ops)

    process.exit(0)
}

main()
