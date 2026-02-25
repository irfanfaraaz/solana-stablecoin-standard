use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AllowlistEntry {
    pub bump: u8,
    pub wallet: Pubkey,
    pub is_allowed: bool,
}

impl AllowlistEntry {
    pub const SEED_PREFIX: &'static [u8] = b"allowlist";
}
