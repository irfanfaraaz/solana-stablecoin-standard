use crate::{errors::*, state::*};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

#[derive(Accounts)]
pub struct ManageAllowlist<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [StablecoinConfig::SEED_PREFIX, mint.key().as_ref()],
        bump = config.bump,
        constraint = config.enable_allowlist @ crate::errors::StablecoinError::ComplianceNotEnabled
    )]
    pub config: Account<'info, StablecoinConfig>,

    #[account(address = config.mint)]
    pub mint: InterfaceAccount<'info, Mint>,

    /// CHECK: The wallet being allowlisted (we only need its pubkey for the PDA).
    pub wallet: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + AllowlistEntry::INIT_SPACE,
        seeds = [AllowlistEntry::SEED_PREFIX, config.mint.as_ref(), wallet.key().as_ref()],
        bump
    )]
    pub allowlist_entry: Account<'info, AllowlistEntry>,

    pub system_program: Program<'info, System>,
}

pub fn handle_add_to_allowlist(ctx: Context<ManageAllowlist>) -> Result<()> {
    require!(
        ctx.accounts.config.master_authority == ctx.accounts.authority.key(),
        StablecoinError::Unauthorized
    );

    let entry = &mut ctx.accounts.allowlist_entry;
    entry.bump = ctx.bumps.allowlist_entry;
    entry.wallet = ctx.accounts.wallet.key();
    entry.is_allowed = true;
    Ok(())
}

pub fn handle_remove_from_allowlist(ctx: Context<ManageAllowlist>) -> Result<()> {
    require!(
        ctx.accounts.config.master_authority == ctx.accounts.authority.key(),
        StablecoinError::Unauthorized
    );

    let entry = &mut ctx.accounts.allowlist_entry;
    entry.bump = ctx.bumps.allowlist_entry;
    entry.wallet = ctx.accounts.wallet.key();
    entry.is_allowed = false;
    Ok(())
}
