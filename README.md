# Hifumin mirror
nHentai mirror, this repo generate mirror of nHentai API every 2 days, available at [generated](https://github.com/saltyaom-engine/hifumin-mirror/tree/generated) branch.

## Why
Hifumin usually exceed nHentai rate limit even with local cache, running both [hifumin.app](https://hifumin.app) and [Hifumin API](https://api.hifumin.app), so I create this mirror archive instead to fully evade from nHentai.

## Concept
Using Github Actions free plan, I can spin up 20 concurrent workers pool and seperate scarp task into a batch.

As NHentai has rate limiting, estimate time mirroring for 370,000 hentais is around 1 hour and a 20 minutes.
