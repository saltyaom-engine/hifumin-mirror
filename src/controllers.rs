use actix_web::{
    get,
    web::{Data, Path},
    HttpResponse,
};
use meilisearch_sdk::indexes::Index;

use crate::services::search;

#[get("/")]
pub async fn hi() -> &'static str {
    "Sirin"
}

#[get("/search/{query}")]
pub async fn sirin(engine: Data<Index>, keyword: Path<String>) -> HttpResponse {
    HttpResponse::Ok().json(search(&engine, keyword.into_inner(), 1).await)
}

#[get("/search/{query}/{batch}")]
pub async fn sirin_batch(engine: Data<Index>, path: Path<(String, usize)>) -> HttpResponse {
    let (keyword, batch) = path.into_inner();

    HttpResponse::Ok().json(search(&engine, keyword, batch).await)
}
