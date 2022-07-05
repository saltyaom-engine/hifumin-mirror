use super::{
    model::*,
    super::nhentai::model::*
};

use cached::{ cached_key, TimedCache };

fn to_cover(media_id: u32, extension: String) -> String {
    format!("https://t.nhentai.net/galleries/{}/cover.{}", media_id, map_extension(extension))
}

pub fn map_extension(extension_type: String) -> &'static str {
    match extension_type.as_ref() {
        "j" => "jpg",
        "p" => "png",
        "g" => "gif",
        _ => "jpg"
    }
}

fn map_images(media_id: u32, pages: &NHentaiPages) -> NhqlPages {
    pages.into_iter().enumerate().map(|(index, page)| {
        let extension = map_extension(page.t.as_ref().unwrap().to_owned());

        NhqlPage {
            link: format!("https://i.nhentai.net/galleries/{}/{}.{}", media_id, index + 1, extension),
            info: NhqlPageInfo {
                r#type: extension,
                width: page.w.unwrap(),
                height: page.h.unwrap()
            }
        }
    }).collect()
}

pub fn map_tag(tag: &str) -> String {
    format!("https://nhentai.net{}", tag)
}

fn map_metadata(nhentai_tags: NHentaiTags) -> NhqlMetadata {
    let mut parodies = vec![];
    let mut characters = vec![];
    let mut groups = vec![];
    let mut categories = vec![];
    let mut artists = vec![];

    let mut language: String = "translated".to_owned();

    let mut tags: NhqlTags = vec![];

    for tag in nhentai_tags.into_iter() {
        match &tag.r#type[..] {
            "tag" => {
                tags.push(NhqlTag {
                    name: tag.name.to_owned(),
                    count: tag.count,
                    url: map_tag(&tag.url)
                })
            },
            "parody" => {
                parodies.push(NhqlTag {
                    name: tag.name.to_owned(),
                    count: tag.count,
                    url: map_tag(&tag.url)
                })
            },
            "character" => {
                characters.push(NhqlTag {
                    name: tag.name.to_owned(),
                    count: tag.count,
                    url: map_tag(&tag.url)
                })
            },
            "group" => {
                groups.push(NhqlTag {
                    name: tag.name.to_owned(),
                    count: tag.count,
                    url: map_tag(&tag.url)
                })
            },
            "category" => {
                categories.push(NhqlTag {
                    name: tag.name.to_owned(),
                    count: tag.count,
                    url: map_tag(&tag.url)
                })
            },
            "artist" => {
                artists.push(NhqlTag {
                    name: tag.name.to_owned(),
                    count: tag.count,
                    url: map_tag(&tag.url)
                })
            },
            "language" => {
                if tag.name != "translated" {
                    language = tag.name.to_owned()
                }
            },
            _ => {
                tags.push(NhqlTag {
                    name: tag.name.to_owned(),
                    count: tag.count,
                    url: map_tag(&tag.url)
                })
            }
        };
    }

    NhqlMetadata {
        parodies,
        characters,
        groups,
        categories,    
        artists,
        language,
        tags
    }
}

cached_key! {
    LENGTH: TimedCache<u32, Nhql> = TimedCache::with_lifespan(20);
    Key = { nhentai.id.unwrap_or(0) };
    fn map_nhql(nhentai: NHentai) -> Nhql = {
        let media_id = nhentai.media_id.unwrap();
        let extension = nhentai.images.cover.t.unwrap();

        Nhql {
            id: nhentai.id.unwrap(),
            title: NhqlTitle {
                english: nhentai.title.english,
                japanese: nhentai.title.japanese,
                display: nhentai.title.pretty
            },
            images: NhqlImages {
                cover: NhqlPage {
                    link: to_cover(media_id, extension.to_owned()),
                    info: NhqlPageInfo {
                        width: nhentai.images.cover.w.unwrap(),
                        height: nhentai.images.cover.h.unwrap(),
                        r#type: map_extension(extension),
                    },
                },
                pages: map_images(media_id, &nhentai.images.pages)
            },
            info: NhqlInfo {
                amount: nhentai.images.pages.len() as u32,
                favorite: nhentai.num_favorites.unwrap(),
                upload: nhentai.upload_date.unwrap(),
                media_id: nhentai.media_id.unwrap()
            },
            metadata: map_metadata(nhentai.tags)
        }
    }
}
