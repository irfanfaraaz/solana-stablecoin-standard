use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::system_program;
use anchor_spl::{
    token_2022::spl_token_2022::{
        extension::{
            transfer_hook::instruction::initialize as initialize_transfer_hook, ExtensionType,
        },
        instruction::{initialize_mint2, initialize_permanent_delegate},
        state::Mint as SplMint,
    },
    token_interface::Token2022,
};

use crate::{errors::*, state::*};

/// Truncate string to at most `max_bytes` bytes on UTF-8 boundary.
fn truncate_to_bytes(s: &str, max_bytes: usize) -> String {
    if s.len() <= max_bytes {
        return s.to_string();
    }
    let mut end = max_bytes;
    while end > 0 && !s.is_char_boundary(end) {
        end -= 1;
    }
    s[..end].to_string()
}

#[derive(Accounts)]
#[instruction(_name: String, _symbol: String)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + StablecoinConfig::INIT_SPACE,
        seeds = [StablecoinConfig::SEED_PREFIX, mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, StablecoinConfig>,

    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + RoleAccount::INIT_SPACE,
        seeds = [RoleAccount::SEED_PREFIX, mint.key().as_ref()],
        bump
    )]
    pub role_account: Account<'info, RoleAccount>,

    #[account(
        mut,
        seeds = [b"mint", _symbol.as_bytes()],
        bump
    )]
    /// CHECK: We initialize this manually via CPI
    pub mint: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

pub fn handle_initialize(
    ctx: Context<Initialize>,
    name: String,
    symbol: String,
    uri: String,
    decimals: u8,
    enable_permanent_delegate: bool,
    enable_transfer_hook: bool,
    default_account_frozen: bool,
    enable_confidential_transfers: bool,
    transfer_hook_program_id: Option<Pubkey>,
) -> Result<()> {
    let mut extension_types = vec![];
    if enable_permanent_delegate {
        extension_types.push(ExtensionType::PermanentDelegate);
    }
    if enable_transfer_hook {
        extension_types.push(ExtensionType::TransferHook);
    }

    let mint_size = ExtensionType::try_calculate_account_len::<SplMint>(&extension_types)
        .map_err(|_| StablecoinError::MathOverflow)?;
    let rent = Rent::get()?;
    let lamports = rent.minimum_balance(mint_size);

    let mint_bump = ctx.bumps.mint;
    let symbol_bytes = symbol.as_bytes();
    let signer_seeds: &[&[&[u8]]] = &[&[b"mint", symbol_bytes, &[mint_bump]]];

    if ctx.accounts.mint.data_is_empty() {
        system_program::create_account(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::CreateAccount {
                    from: ctx.accounts.admin.to_account_info(),
                    to: ctx.accounts.mint.to_account_info(),
                },
                signer_seeds,
            ),
            lamports,
            mint_size as u64,
            ctx.accounts.token_program.key,
        )?;

        if enable_permanent_delegate {
            invoke(
                &initialize_permanent_delegate(
                    ctx.accounts.token_program.key,
                    ctx.accounts.mint.key,
                    &ctx.accounts.config.key(),
                )?,
                &[
                    ctx.accounts.mint.to_account_info(),
                    ctx.accounts.config.to_account_info(),
                ],
            )?;
        }

        if enable_transfer_hook {
            let hook_program =
                transfer_hook_program_id.ok_or(StablecoinError::ComplianceNotEnabled)?;
            invoke(
                &initialize_transfer_hook(
                    ctx.accounts.token_program.key,
                    ctx.accounts.mint.key,
                    Some(ctx.accounts.config.key()),
                    Some(hook_program),
                )?,
                &[
                    ctx.accounts.mint.to_account_info(),
                    ctx.accounts.config.to_account_info(),
                ],
            )?;
        }

        invoke(
            &initialize_mint2(
                ctx.accounts.token_program.key,
                ctx.accounts.mint.key,
                &ctx.accounts.config.key(),
                Some(&ctx.accounts.config.key()),
                decimals,
            )?,
            &[
                ctx.accounts.mint.to_account_info(),
                ctx.accounts.config.to_account_info(),
            ],
        )?;
    }

    let config = &mut ctx.accounts.config;
    config.bump = ctx.bumps.config;
    config.master_authority = ctx.accounts.admin.key();
    config.mint = ctx.accounts.mint.key();
    config.name = truncate_to_bytes(&name, 64);
    config.symbol = truncate_to_bytes(&symbol, 16);
    config.uri = truncate_to_bytes(&uri, 256);
    config.decimals = decimals;
    config.is_paused = false;
    config.enable_permanent_delegate = enable_permanent_delegate;
    config.enable_transfer_hook = enable_transfer_hook;
    config.default_account_frozen = default_account_frozen;
    config.enable_confidential_transfers = enable_confidential_transfers;

    let roles = &mut ctx.accounts.role_account;
    roles.bump = ctx.bumps.role_account;
    roles.burner = ctx.accounts.admin.key();
    roles.pauser = ctx.accounts.admin.key();
    roles.blacklister = ctx.accounts.admin.key();
    roles.seizer = ctx.accounts.admin.key();

    Ok(())
}
