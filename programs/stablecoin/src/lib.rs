#![allow(clippy::result_large_err)]
#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("3zFReCtrBsjMZNabaV4vJSaCHtTpFtApkWMjrr5gAeeM");

#[program]
pub mod stablecoin {
    use super::*;

    pub fn initialize(
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
        handle_initialize(
            ctx,
            name,
            symbol,
            uri,
            decimals,
            enable_permanent_delegate,
            enable_transfer_hook,
            default_account_frozen,
            enable_confidential_transfers,
            transfer_hook_program_id,
        )
    }

    pub fn mint(ctx: Context<MintTokens>, amount: u64) -> Result<()> {
        handle_mint(ctx, amount)
    }

    pub fn burn(ctx: Context<BurnTokens>, amount: u64) -> Result<()> {
        handle_burn(ctx, amount)
    }

    pub fn pause(ctx: Context<PauseUnpause>) -> Result<()> {
        handle_pause(ctx)
    }

    pub fn unpause(ctx: Context<PauseUnpause>) -> Result<()> {
        handle_unpause(ctx)
    }

    pub fn transfer_authority(ctx: Context<UpdateConfig>, new_authority: Pubkey) -> Result<()> {
        handle_transfer_authority(ctx, new_authority)
    }

    pub fn update_roles(
        ctx: Context<UpdateRoles>,
        burner: Option<Pubkey>,
        pauser: Option<Pubkey>,
        blacklister: Option<Pubkey>,
        seizer: Option<Pubkey>,
    ) -> Result<()> {
        handle_update_roles(ctx, burner, pauser, blacklister, seizer)
    }

    pub fn configure_minter(
        ctx: Context<ConfigureMinter>,
        is_active: bool,
        daily_mint_quota: u64,
    ) -> Result<()> {
        handle_configure_minter(ctx, is_active, daily_mint_quota)
    }

    pub fn freeze_account(ctx: Context<FreezeThaw>) -> Result<()> {
        handle_freeze_account(ctx)
    }

    pub fn thaw_account(ctx: Context<FreezeThaw>) -> Result<()> {
        handle_thaw_account(ctx)
    }

    pub fn add_to_blacklist(ctx: Context<ManageBlacklist>) -> Result<()> {
        handle_add_to_blacklist(ctx)
    }

    pub fn remove_from_blacklist(ctx: Context<ManageBlacklist>) -> Result<()> {
        handle_remove_from_blacklist(ctx)
    }

    pub fn seize(ctx: Context<Seize>, amount: u64) -> Result<()> {
        handle_seize(ctx, amount)
    }
}
