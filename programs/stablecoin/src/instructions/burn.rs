use crate::{errors::*, state::*};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{burn, Burn, Mint, Token2022, TokenAccount};

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut)]
    pub burner: Signer<'info>,

    #[account(
        seeds = [StablecoinConfig::SEED_PREFIX, mint.key().as_ref()],
        bump = config.bump,
        constraint = !config.is_paused @ StablecoinError::ProgramPaused
    )]
    pub config: Account<'info, StablecoinConfig>,

    #[account(
        seeds = [RoleAccount::SEED_PREFIX, mint.key().as_ref()],
        bump = roles.bump,
        constraint = roles.burner == burner.key() || config.master_authority == burner.key() @ StablecoinError::Unauthorized
    )]
    pub roles: Account<'info, RoleAccount>,

    #[account(
        mut,
        address = config.mint
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = from_account.mint == mint.key()
    )]
    pub from_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,
}

pub fn handle_burn(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_accounts = Burn {
        mint: ctx.accounts.mint.to_account_info(),
        from: ctx.accounts.from_account.to_account_info(),
        authority: ctx.accounts.burner.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    burn(cpi_ctx, amount)?;

    Ok(())
}
