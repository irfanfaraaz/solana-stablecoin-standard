use crate::{errors::*, state::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct UpdateConfig<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [StablecoinConfig::SEED_PREFIX, mint.key().as_ref()],
        bump = config.bump,
        constraint = config.master_authority == admin.key() @ StablecoinError::Unauthorized
    )]
    pub config: Account<'info, StablecoinConfig>,
    pub mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
}

#[derive(Accounts)]
pub struct UpdateRoles<'info> {
    pub admin: Signer<'info>,

    #[account(
        seeds = [StablecoinConfig::SEED_PREFIX, mint.key().as_ref()],
        bump = config.bump,
        constraint = config.master_authority == admin.key() @ StablecoinError::Unauthorized
    )]
    pub config: Account<'info, StablecoinConfig>,

    #[account(
        mut,
        seeds = [RoleAccount::SEED_PREFIX, mint.key().as_ref()],
        bump = roles.bump
    )]
    pub roles: Account<'info, RoleAccount>,
    pub mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
}

#[derive(Accounts)]
#[instruction(is_active: bool, daily_mint_quota: u64)]
pub struct ConfigureMinter<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [StablecoinConfig::SEED_PREFIX, mint.key().as_ref()],
        bump = config.bump,
        constraint = config.master_authority == admin.key() @ StablecoinError::Unauthorized
    )]
    pub config: Account<'info, StablecoinConfig>,

    /// CHECK: Target minter to configure
    pub minter: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + MinterConfig::INIT_SPACE,
        seeds = [MinterConfig::SEED_PREFIX, mint.key().as_ref(), minter.key().as_ref()],
        bump
    )]
    pub minter_config: Account<'info, MinterConfig>,

    pub system_program: Program<'info, System>,
    pub mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
}

#[derive(Accounts)]
pub struct PauseUnpause<'info> {
    pub pauser: Signer<'info>,

    #[account(
        mut,
        seeds = [StablecoinConfig::SEED_PREFIX, mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,

    #[account(
        seeds = [RoleAccount::SEED_PREFIX, mint.key().as_ref()],
        bump = roles.bump,
        constraint = roles.pauser == pauser.key() || config.master_authority == pauser.key() @ StablecoinError::Unauthorized
    )]
    pub roles: Account<'info, RoleAccount>,
    pub mint: InterfaceAccount<'info, anchor_spl::token_interface::Mint>,
}

pub fn handle_pause(ctx: Context<PauseUnpause>) -> Result<()> {
    ctx.accounts.config.is_paused = true;
    Ok(())
}

pub fn handle_unpause(ctx: Context<PauseUnpause>) -> Result<()> {
    ctx.accounts.config.is_paused = false;
    Ok(())
}

pub fn handle_transfer_authority(ctx: Context<UpdateConfig>, new_authority: Pubkey) -> Result<()> {
    ctx.accounts.config.master_authority = new_authority;
    Ok(())
}

pub fn handle_update_roles(
    ctx: Context<UpdateRoles>,
    burner: Option<Pubkey>,
    pauser: Option<Pubkey>,
    blacklister: Option<Pubkey>,
    seizer: Option<Pubkey>,
) -> Result<()> {
    let roles = &mut ctx.accounts.roles;
    if let Some(b) = burner {
        roles.burner = b;
    }
    if let Some(p) = pauser {
        roles.pauser = p;
    }
    if let Some(bl) = blacklister {
        roles.blacklister = bl;
    }
    if let Some(s) = seizer {
        roles.seizer = s;
    }
    Ok(())
}

pub fn handle_configure_minter(
    ctx: Context<ConfigureMinter>,
    is_active: bool,
    daily_mint_quota: u64,
) -> Result<()> {
    let minter_config = &mut ctx.accounts.minter_config;
    minter_config.bump = ctx.bumps.minter_config;
    minter_config.minter = ctx.accounts.minter.key();
    minter_config.is_active = is_active;
    minter_config.daily_mint_quota = daily_mint_quota;
    Ok(())
}
