#![allow(clippy::result_large_err)]
#![allow(unexpected_cfgs)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::system_instruction;
use anchor_spl::token_interface::Mint;
use spl_tlv_account_resolution::account::ExtraAccountMeta;
use spl_tlv_account_resolution::state::ExtraAccountMetaList;
use spl_tlv_account_resolution::seeds::Seed;
use spl_transfer_hook_interface::instruction::ExecuteInstruction;
use spl_transfer_hook_interface::instruction::TransferHookInstruction;

declare_id!("4VKhzS8cyVXJPD9VpAopu4g16wzKA6YDm8Wr2TadR7qi");

#[program]
pub mod transfer_hook {
    use super::*;

    pub fn initialize_extra_account_meta_list(
        ctx: Context<InitializeExtraAccountMetaList>,
        enable_allowlist: bool,
    ) -> Result<()> {
        let mint = ctx.accounts.mint.key();

        // Extra accounts required for transfer validation.
        // Base (SSS-2): 5 stablecoin_program, 6 source_blacklist, 7 dest_blacklist.
        // With allowlist (SSS-3): + 6 config, 7 source_blacklist, 8 dest_blacklist, 9 source_allowlist, 10 dest_allowlist.
        let mut account_metas = vec![
            ExtraAccountMeta::new_with_pubkey(&stablecoin::ID, false, false)?,
            // Source Blacklist PDA: ["blacklist", mint, owner(source)]
            ExtraAccountMeta::new_external_pda_with_seeds(
                5,
                &[
                    Seed::Literal { bytes: b"blacklist".to_vec() },
                    Seed::AccountKey { index: 1 },
                    Seed::AccountData { account_index: 0, data_index: 32, length: 32 },
                ],
                false,
                false,
            )?,
            // Destination Blacklist PDA: ["blacklist", mint, owner(dest)]
            ExtraAccountMeta::new_external_pda_with_seeds(
                5,
                &[
                    Seed::Literal { bytes: b"blacklist".to_vec() },
                    Seed::AccountKey { index: 1 },
                    Seed::AccountData { account_index: 2, data_index: 32, length: 32 },
                ],
                false,
                false,
            )?,
        ];

        if enable_allowlist {
            // Config PDA: ["config", mint] — read enable_allowlist in execute (index 6)
            account_metas.push(ExtraAccountMeta::new_external_pda_with_seeds(
                5,
                &[
                    Seed::Literal { bytes: b"config".to_vec() },
                    Seed::AccountKey { index: 1 },
                ],
                false,
                false,
            )?);
            // Source allowlist PDA (index 7), dest allowlist PDA (index 8)
            account_metas.push(ExtraAccountMeta::new_external_pda_with_seeds(
                5,
                &[
                    Seed::Literal { bytes: b"allowlist".to_vec() },
                    Seed::AccountKey { index: 1 },
                    Seed::AccountData { account_index: 0, data_index: 32, length: 32 },
                ],
                false,
                false,
            )?);
            account_metas.push(ExtraAccountMeta::new_external_pda_with_seeds(
                5,
                &[
                    Seed::Literal { bytes: b"allowlist".to_vec() },
                    Seed::AccountKey { index: 1 },
                    Seed::AccountData { account_index: 2, data_index: 32, length: 32 },
                ],
                false,
                false,
            )?);
        }

        let rent = Rent::get()?;
        let space = ExtraAccountMetaList::size_of(account_metas.len())?;
        let lamports = rent.minimum_balance(space);

        if ctx.accounts.extra_account_meta_list.data_is_empty() {
             anchor_lang::solana_program::program::invoke_signed(
                &system_instruction::create_account(
                    ctx.accounts.payer.key,
                    ctx.accounts.extra_account_meta_list.key,
                    lamports,
                    space as u64,
                    ctx.program_id,
                ),
                &[
                    ctx.accounts.payer.to_account_info(),
                    ctx.accounts.extra_account_meta_list.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                ],
                &[&[b"extra-account-metas", mint.as_ref(), &[ctx.bumps.extra_account_meta_list]]],
            )?;
        }

        let mut data = ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?;
        for i in 0..data.len() {
            data[i] = 0;
        }

        ExtraAccountMetaList::init::<ExecuteInstruction>(
            &mut data,
            &account_metas,
        )?;

        msg!("InitializeExtraAccountMetaList Complete");
        Ok(())
    }

    pub fn fallback<'info>(
        _program_id: &Pubkey,
        accounts: &'info [AccountInfo<'info>],
        ix_data: &[u8],
    ) -> Result<()> {
        let mut ix_data_ptr: &[u8] = ix_data;
        if let Ok(instruction) = TransferHookInstruction::unpack(&mut ix_data_ptr) {
            return match instruction {
                TransferHookInstruction::Execute { amount } => {
                    msg!("Transfer Hook - Execute called with amount: {}", amount);
                    handle_execute(accounts, amount)
                }
                _ => Err(ProgramError::InvalidInstructionData.into()),
            };
        }
        Err(ProgramError::InvalidInstructionData.into())
    }
}

/// AllowlistEntry.is_allowed offset (8 discriminator + bump + wallet).
const ALLOWLIST_IS_ALLOWED_OFFSET: usize = 8 + 1 + 32; // 41

pub fn handle_execute(accounts: &[AccountInfo], _amount: u64) -> Result<()> {
    if accounts.len() < 8 {
        return Err(ProgramError::NotEnoughAccountKeys.into());
    }

    let mint_info = &accounts[1];
    let authority_info = &accounts[3];

    // Admin bypass (Seize)
    let (config_pda, _bump) = Pubkey::find_program_address(
        &[b"config", mint_info.key().as_ref()],
        &stablecoin::ID,
    );

    if authority_info.key() == config_pda {
        msg!("Execute - Admin bypass (Seize)");
        return Ok(());
    }

    // Blacklist: indices 6 and 7 (SSS-2). With allowlist (SSS-3): still 6 and 7, then 8=config, 9=source_allowlist, 10=dest_allowlist.
    let (source_blacklist_ix, dest_blacklist_ix) = (6, 7);
    for (label, acc) in [
        ("source", &accounts[source_blacklist_ix]),
        ("destination", &accounts[dest_blacklist_ix]),
    ] {
        if !acc.data_is_empty() {
            let data = acc.try_borrow_data()?;
            if data.len() >= 42 && data[41] != 0 {
                msg!("Execute - Blocked {} account: {}", label, acc.key());
                return Err(TransferHookError::Blacklisted.into());
            }
        }
    }

    // SSS-3: when allowlist is enabled, require source and dest to be on allowlist.
    // Token-2022 CPI account layouts observed:
    // - len 11: [source, mint, dest, authority, extra_meta_list, stablecoin, s_bl, d_bl, config, s_al, d_al]
    // - len 10: [source, mint, dest, authority, stablecoin, s_bl, d_bl, config, s_al, d_al]
    if accounts.len() >= 10 {
        let (config_ix, source_al_ix, dest_al_ix) = if accounts.len() >= 11 {
            (8, 9, 10)
        } else {
            (7, 8, 9)
        };
        let config_acc = &accounts[config_ix];
        let source_allowlist_acc = &accounts[source_al_ix];
        let dest_allowlist_acc = &accounts[dest_al_ix];
        if !config_acc.data_is_empty() {
            let config_data = config_acc.try_borrow_data()?;
            let mut config_data_slice: &[u8] = config_data.as_ref();
            let config = stablecoin::state::StablecoinConfig::try_deserialize(&mut config_data_slice)
                .map_err(|_| ProgramError::InvalidAccountData)?;
            if config.enable_allowlist {
                // If enable_allowlist is true: require both source and destination entries to be allowed.
                for (label, acc) in [("source", source_allowlist_acc), ("destination", dest_allowlist_acc)] {
                    if acc.data_is_empty() {
                        msg!("Execute - Allowlist required but {} not on allowlist", label);
                        return Err(TransferHookError::NotOnAllowlist.into());
                    }
                    let data = acc.try_borrow_data()?;
                    if data.len() <= ALLOWLIST_IS_ALLOWED_OFFSET || data[ALLOWLIST_IS_ALLOWED_OFFSET] == 0 {
                        msg!("Execute - {} wallet not allowed", label);
                        return Err(TransferHookError::NotOnAllowlist.into());
                    }
                }
            }
        }
    }

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: PDA checked via seeds
    #[account(
        mut, 
        seeds = [b"extra-account-metas", mint.key().as_ref()], 
        bump
    )]
    pub extra_account_meta_list: AccountInfo<'info>,
    pub mint: InterfaceAccount<'info, Mint>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum TransferHookError {
    #[msg("Account is blacklisted")]
    Blacklisted,
    #[msg("Account is not on the allowlist")]
    NotOnAllowlist,
}
