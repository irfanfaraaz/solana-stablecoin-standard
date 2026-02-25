use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct RoleAccount {
    pub bump: u8,
    pub burner: Pubkey,
    pub pauser: Pubkey,
    pub blacklister: Pubkey,
    pub seizer: Pubkey,
}

impl RoleAccount {
    pub const SEED_PREFIX: &'static [u8] = b"roles";
}
