use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct StablecoinConfig {
    pub bump: u8,
    pub master_authority: Pubkey,
    pub mint: Pubkey,
    pub decimals: u8,
    pub is_paused: bool,
    pub enable_permanent_delegate: bool,
    pub enable_transfer_hook: bool,
    pub enable_confidential_transfers: bool, // SSS-3 POC
}

impl StablecoinConfig {
    pub const SEED_PREFIX: &'static [u8] = b"config";
}
