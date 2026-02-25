use crate::{errors::*, state::*};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{mint_to, Mint, MintTo, Token2022, TokenAccount};

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut)]
    pub minter: Signer<'info>,

    #[account(
        seeds = [StablecoinConfig::SEED_PREFIX, mint.key().as_ref()],
        bump = config.bump,
        constraint = !config.is_paused @ StablecoinError::ProgramPaused
    )]
    pub config: Account<'info, StablecoinConfig>,

    #[account(
        mut,
        seeds = [MinterConfig::SEED_PREFIX, mint.key().as_ref(), minter.key().as_ref()],
        bump = minter_config.bump,
        constraint = minter_config.is_active @ StablecoinError::MinterInactive
    )]
    pub minter_config: Account<'info, MinterConfig>,

    #[account(
        mut,
        address = config.mint
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = to_account.mint == mint.key()
    )]
    pub to_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,
}

pub fn handle_mint(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
    let config = &mut ctx.accounts.minter_config;
    let current_time = Clock::get()?.unix_timestamp;

    // Reset quota if 24 hours have passed
    if current_time >= config.last_mint_timestamp + 86400 {
        config.daily_minted = 0;
        config.last_mint_timestamp = current_time;
    }

    if config.daily_minted.checked_add(amount).unwrap() > config.daily_mint_quota {
        return err!(StablecoinError::QuotaExceeded);
    }

    config.daily_minted = config.daily_minted.checked_add(amount).unwrap();
    config.total_minted = config.total_minted.checked_add(amount).unwrap();

    let mint_key = ctx.accounts.mint.key().clone();
    let mint_key = mint_key.as_ref();
    let bump = ctx.accounts.config.bump;
    let seeds = &[StablecoinConfig::SEED_PREFIX, mint_key, &[bump]];
    let signer = &[&seeds[..]];

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_accounts = MintTo {
        mint: ctx.accounts.mint.to_account_info(),
        to: ctx.accounts.to_account.to_account_info(),
        authority: ctx.accounts.config.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    mint_to(cpi_ctx, amount)?;

    Ok(())
}
