"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const isomorphic_unfetch_1 = __importDefault(require("isomorphic-unfetch"));
const p_queue_1 = __importDefault(require("p-queue"));
// NHentai Rate limit
const queue = new p_queue_1.default({ concurrency: 6 });
// ? Get estimate latest nhentai id
const getLatest = () => __awaiter(void 0, void 0, void 0, function* () {
    return 100;
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
});
const getNhentai = (id) => __awaiter(void 0, void 0, void 0, function* () {
    const hentai = yield (0, isomorphic_unfetch_1.default)(`https://nhentai.net/api/gallery/${id}`).then((res) => res.text());
    if (!hentai.startsWith('{"id"'))
        return new Error('Not found');
    return hentai;
});
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const total = yield getLatest();
    if (total instanceof Error) {
        console.error(total.message);
        process.exit(1);
    }
    console.log('Total:', total);
    if (!(0, fs_1.existsSync)('data'))
        (0, fs_1.mkdirSync)('data');
    const since = performance.now();
    let current = 1;
    for (let i = 1; i <= total; i++) {
        queue.add(() => __awaiter(void 0, void 0, void 0, function* () {
            const hentai = yield getNhentai(i);
            current++;
            if (hentai instanceof Error) {
                console.log(`${i} not found`);
                return;
            }
            (0, fs_1.writeFileSync)(`data/${i}.json`, hentai);
        }));
        queue.add(() => new Promise((resolve) => setTimeout(resolve, 575)));
    }
    const progress = setInterval(() => {
        console.log(`(${((current / total) * 100).toFixed(4)}%) | ${current}/${total}`);
    }, 10000);
    yield queue.onIdle();
    clearInterval(progress);
    console.log('Done in', ((performance.now() - since) / 1000).toFixed(3), 'seconds');
});
main();
