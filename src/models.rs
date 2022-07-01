use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Debug)]
pub struct Hentai {
    pub id: u32
}

#[derive(Deserialize, Debug)]
pub struct Status {
    pub status: String
}
