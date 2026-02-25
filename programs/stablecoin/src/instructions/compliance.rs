use crate::{errors::*, state::*};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    freeze_account, thaw_account, FreezeAccount, Mint, ThawAccount, Token2022, TokenAccount,
};

#[derive(Accounts)]
pub struct ManageBlacklist<'info> {
    #[account(mut)]
    pub blacklister: Signer<'info>,

    #[account(
        seeds = [StablecoinConfig::SEED_PREFIX, mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,

    #[account(
        seeds = [RoleAccount::SEED_PREFIX, mint.key().as_ref()],
        bump = roles.bump,
        constraint = roles.blacklister == blacklister.key() || config.master_authority == blacklister.key() @ StablecoinError::Unauthorized
    )]
    pub roles: Account<'info, RoleAccount>,

    /// CHECK: The account being blacklisted. We only care about its pubkey.
    pub target_account: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = blacklister,
        space = 8 + BlacklistEntry::INIT_SPACE,
        seeds = [BlacklistEntry::SEED_PREFIX, mint.key().as_ref(), target_account.key().as_ref()],
        bump
    )]
    pub blacklist_entry: Account<'info, BlacklistEntry>,

    pub system_program: Program<'info, System>,
    pub mint: InterfaceAccount<'info, Mint>,
}

#[derive(Accounts)]
pub struct FreezeThaw<'info> {
    pub blacklister: Signer<'info>,

    #[account(
        seeds = [StablecoinConfig::SEED_PREFIX, mint.key().as_ref()],
        bump = config.bump
    )]
    pub config: Account<'info, StablecoinConfig>,

    #[account(
        seeds = [RoleAccount::SEED_PREFIX, mint.key().as_ref()],
        bump = roles.bump,
        constraint = roles.blacklister == blacklister.key() || config.master_authority == blacklister.key() @ StablecoinError::Unauthorized
    )]
    pub roles: Account<'info, RoleAccount>,

    #[account(
        mut,
        address = config.mint
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    #[account(
        mut,
        constraint = token_account.mint == mint.key()
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,
}

#[derive(Accounts)]
pub struct Seize<'info> {
    pub seizer: Signer<'info>,

    #[account(
        seeds = [StablecoinConfig::SEED_PREFIX, mint.key().as_ref()],
        bump = config.bump,
        constraint = config.enable_permanent_delegate @ StablecoinError::ComplianceNotEnabled
    )]
    pub config: Account<'info, StablecoinConfig>,

    #[account(
        seeds = [RoleAccount::SEED_PREFIX, mint.key().as_ref()],
        bump = roles.bump,
        constraint = roles.seizer == seizer.key() || config.master_authority == seizer.key() @ StablecoinError::Unauthorized
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

    #[account(
        mut,
        constraint = to_account.mint == mint.key()
    )]
    pub to_account: InterfaceAccount<'info, TokenAccount>,

    pub token_program: Program<'info, Token2022>,

    /// CHECK: Transfer hook program
    pub transfer_hook_program: UncheckedAccount<'info>,
    /// CHECK: Extra account meta list for the transfer hook
    pub extra_meta_list: UncheckedAccount<'info>,
    /// CHECK: Stablecoin program ID (Index 5 in hook)
    pub stablecoin_program: UncheckedAccount<'info>,
    /// CHECK: Source blacklist entry (Index 6 in hook)
    pub source_blacklist: UncheckedAccount<'info>,
    /// CHECK: Destination blacklist entry (Index 7 in hook)
    pub dest_blacklist: UncheckedAccount<'info>,
    /// CHECK: Config PDA (Index 8, SSS-3 only). Required when config.enable_allowlist.
    pub config_allowlist: UncheckedAccount<'info>,
    /// CHECK: Source allowlist entry (Index 9, SSS-3 only)
    pub source_allowlist: UncheckedAccount<'info>,
    /// CHECK: Dest allowlist entry (Index 10, SSS-3 only)
    pub dest_allowlist: UncheckedAccount<'info>,
}

pub fn handle_add_to_blacklist(ctx: Context<ManageBlacklist>) -> Result<()> {
    require!(
        ctx.accounts.config.enable_transfer_hook,
        StablecoinError::ComplianceNotEnabled
    );

    let entry = &mut ctx.accounts.blacklist_entry;
    entry.bump = ctx.bumps.blacklist_entry;
    entry.account = ctx.accounts.target_account.key();
    entry.is_blacklisted = true;
    Ok(())
}

pub fn handle_remove_from_blacklist(ctx: Context<ManageBlacklist>) -> Result<()> {
    require!(
        ctx.accounts.config.enable_transfer_hook,
        StablecoinError::ComplianceNotEnabled
    );

    let entry = &mut ctx.accounts.blacklist_entry;
    entry.bump = ctx.bumps.blacklist_entry;
    entry.account = ctx.accounts.target_account.key();
    entry.is_blacklisted = false;
    Ok(())
}

pub fn handle_freeze_account(ctx: Context<FreezeThaw>) -> Result<()> {
    let bump = ctx.accounts.config.bump;
    let mint_key = ctx.accounts.mint.key().clone();
    let mint_key = mint_key.as_ref();
    let seeds = &[StablecoinConfig::SEED_PREFIX, mint_key, &[bump]];
    let signer = &[&seeds[..]];

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_accounts = FreezeAccount {
        account: ctx.accounts.token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        authority: ctx.accounts.config.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    freeze_account(cpi_ctx)?;

    Ok(())
}

pub fn handle_thaw_account(ctx: Context<FreezeThaw>) -> Result<()> {
    let bump = ctx.accounts.config.bump;
    let mint_key = ctx.accounts.mint.key().clone();
    let mint_key = mint_key.as_ref();
    let seeds = &[StablecoinConfig::SEED_PREFIX, mint_key, &[bump]];
    let signer = &[&seeds[..]];

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_accounts = ThawAccount {
        account: ctx.accounts.token_account.to_account_info(),
        mint: ctx.accounts.mint.to_account_info(),
        authority: ctx.accounts.config.to_account_info(),
    };

    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
    thaw_account(cpi_ctx)?;

    Ok(())
}

pub fn handle_seize(ctx: Context<Seize>, amount: u64) -> Result<()> {
    let bump = ctx.accounts.config.bump;
    let mint_key = ctx.accounts.mint.key().clone();
    let mint_key = mint_key.as_ref();
    let seeds = &[StablecoinConfig::SEED_PREFIX, mint_key, &[bump]];
    let signer = &[&seeds[..]];

    let mut account_metas = vec![
        AccountMeta::new(ctx.accounts.from_account.key(), false),
        AccountMeta::new_readonly(ctx.accounts.mint.key(), false),
        AccountMeta::new(ctx.accounts.to_account.key(), false),
        AccountMeta::new_readonly(ctx.accounts.config.key(), true), // Authority is signer
        AccountMeta::new_readonly(ctx.accounts.extra_meta_list.key(), false),
        AccountMeta::new_readonly(ctx.accounts.stablecoin_program.key(), false),
        AccountMeta::new_readonly(ctx.accounts.source_blacklist.key(), false),
        AccountMeta::new_readonly(ctx.accounts.dest_blacklist.key(), false),
    ];
    if ctx.accounts.config.enable_allowlist {
        account_metas.push(AccountMeta::new_readonly(ctx.accounts.config_allowlist.key(), false));
        account_metas.push(AccountMeta::new_readonly(ctx.accounts.source_allowlist.key(), false));
        account_metas.push(AccountMeta::new_readonly(ctx.accounts.dest_allowlist.key(), false));
    }
    account_metas.push(AccountMeta::new_readonly(ctx.accounts.transfer_hook_program.key(), false));

    let ix = spl_token_2022::instruction::transfer_checked(
        &ctx.accounts.token_program.key(),
        &ctx.accounts.from_account.key(),
        &ctx.accounts.mint.key(),
        &ctx.accounts.to_account.key(),
        &ctx.accounts.config.key(),
        &[], // Signers - handled by invoke_signed
        amount,
        ctx.accounts.config.decimals,
    )?;

    let mut manual_ix = ix;
    manual_ix.accounts = account_metas;

    msg!(
        "Seize - Manual CPI Account List Size: {}",
        manual_ix.accounts.len()
    );

    let mut hook_accounts: Vec<_> = vec![
        ctx.accounts.from_account.to_account_info(),
        ctx.accounts.mint.to_account_info(),
        ctx.accounts.to_account.to_account_info(),
        ctx.accounts.config.to_account_info(),
        ctx.accounts.extra_meta_list.to_account_info(),
        ctx.accounts.stablecoin_program.to_account_info(),
        ctx.accounts.source_blacklist.to_account_info(),
        ctx.accounts.dest_blacklist.to_account_info(),
    ];
    if ctx.accounts.config.enable_allowlist {
        hook_accounts.push(ctx.accounts.config_allowlist.to_account_info());
        hook_accounts.push(ctx.accounts.source_allowlist.to_account_info());
        hook_accounts.push(ctx.accounts.dest_allowlist.to_account_info());
    }
    hook_accounts.push(ctx.accounts.transfer_hook_program.to_account_info());

    anchor_lang::solana_program::program::invoke_signed(&manual_ix, &hook_accounts, signer)?;

    Ok(())
}
