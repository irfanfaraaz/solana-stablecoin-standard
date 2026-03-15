use crate::{errors::*, state::*};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;

#[derive(Accounts)]
pub struct AddToAllowlist<'info> {
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
        init,
        payer = authority,
        space = 8 + AllowlistEntry::INIT_SPACE,
        seeds = [AllowlistEntry::SEED_PREFIX, config.mint.as_ref(), wallet.key().as_ref()],
        bump
    )]
    pub allowlist_entry: Account<'info, AllowlistEntry>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RemoveFromAllowlist<'info> {
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

    /// CHECK: The wallet being removed from allowlist.
    pub wallet: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [AllowlistEntry::SEED_PREFIX, config.mint.as_ref(), wallet.key().as_ref()],
        bump = allowlist_entry.bump
    )]
    pub allowlist_entry: Account<'info, AllowlistEntry>,
}

#[derive(Accounts)]
pub struct UpdateAllowlistEntry<'info> {
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

    /// CHECK: The wallet whose allowlist status is being updated.
    pub wallet: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [AllowlistEntry::SEED_PREFIX, config.mint.as_ref(), wallet.key().as_ref()],
        bump = allowlist_entry.bump
    )]
    pub allowlist_entry: Account<'info, AllowlistEntry>,
}

pub fn handle_add_to_allowlist(ctx: Context<AddToAllowlist>) -> Result<()> {
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

pub fn handle_remove_from_allowlist(ctx: Context<RemoveFromAllowlist>) -> Result<()> {
    require!(
        ctx.accounts.config.master_authority == ctx.accounts.authority.key(),
        StablecoinError::Unauthorized
    );

    let entry = &mut ctx.accounts.allowlist_entry;
    entry.wallet = ctx.accounts.wallet.key();
    entry.is_allowed = false;
    Ok(())
}

pub fn handle_update_allowlist_entry(ctx: Context<UpdateAllowlistEntry>, is_allowed: bool) -> Result<()> {
    require!(
        ctx.accounts.config.master_authority == ctx.accounts.authority.key(),
        StablecoinError::Unauthorized
    );

    let entry = &mut ctx.accounts.allowlist_entry;
    entry.wallet = ctx.accounts.wallet.key();
    entry.is_allowed = is_allowed;
    Ok(())
}
