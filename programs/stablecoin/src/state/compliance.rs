use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct BlacklistEntry {
    pub bump: u8,
    pub account: Pubkey,
    pub is_blacklisted: bool,
}

impl BlacklistEntry {
    pub const SEED_PREFIX: &'static [u8] = b"blacklist";
}
