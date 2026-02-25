//! Trident-generated types for the stablecoin program.
//!
//! Generate/refresh with: `trident fuzz refresh fuzz_0` (from repo root after `anchor build`).
//! This stub allows simulation-only fuzz (invariant checks) to compile without running the CLI.

#![allow(dead_code)]
#![allow(unused_imports)]

use trident_fuzz::fuzzing::*;

pub mod stablecoin {
    use super::*;

    pub fn program_id() -> Pubkey {
        pubkey!("3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM")
    }
}
