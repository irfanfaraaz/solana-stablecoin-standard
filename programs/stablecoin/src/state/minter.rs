use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MinterConfig {
    pub bump: u8,
    pub minter: Pubkey,
    pub is_active: bool,
    pub daily_minted: u64,
    pub total_minted: u64,
    pub daily_mint_quota: u64,
    pub last_mint_timestamp: i64,
}

impl MinterConfig {
    pub const SEED_PREFIX: &'static [u8] = b"minter";
}
