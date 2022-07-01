use reqwest;
use cached::{proc_macro::cached, TimedCache};
use std::{collections::HashMap};

use meilisearch_sdk::{
    client::Client,
    indexes::Index,
    search::{SearchResult, Query},
};

use crate::models::{ Hentai, Status };

pub async fn create_client() -> Index {
    let client = Client::new("http://localhost:7700", "masterKey");

    client.index("hentai")
}


pub async fn setup() {
    let client = reqwest::Client::new();

    // interval 1s
    let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(1));

    loop {
        interval.tick().await;

        match client.get("http://localhost:7700/health").send().await {
            Ok(response) => {
                match response.json::<Status>().await {
                    Ok(res) => {
                        if res.status == "available" {
                            break;
                        }        
                    },
                    Err(_) => {
                        continue;
                    }
                }
            }
            Err(_) => {
                continue;
            }
        }
    }
}

lazy_static! {
    static ref FILTERS: HashMap<String, &'static str> = HashMap::from([
        ("yuri".to_owned(), r#"(tags != "yaoi") AND (tags != "yuri or ice") AND (tags != "yuuri") AND (tags != "males only")"#)
    ]);
}

#[cached(
    type = "TimedCache<String, Vec<u32>>",
    create = "{ TimedCache::with_lifespan(6 * 3600) }",
    convert = r#"{ format!("{}{}",keyword, batch) }"#
)]
pub async fn search<'a>(engine: &Index, keyword: String, batch: usize) -> Vec<u32> {
    // Limitation of Meilisearch
    if batch > 40 || batch < 1 { 
        return vec![] 
    }

    let query = if let Some(filter) = FILTERS.get(&keyword) {
        Query::new(engine)
            .with_query(&keyword)
            .with_limit(25)
            .with_offset(batch * 25)
            .with_filter(filter)
            .build()
    } else {
        Query::new(engine)
            .with_query(&keyword)
            .with_limit(25)
            .with_offset(batch * 25)
            .build()
    };

    match engine.execute_query(&query).await {
        Ok(results) => results
            .hits
            .into_iter()
            .map(|hit: SearchResult<Hentai>| hit.result.id)
            .collect(),
        Err(_) => vec![]
    }
}
