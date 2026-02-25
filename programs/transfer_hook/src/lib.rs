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
    ) -> Result<()> {
        let mint = ctx.accounts.mint.key();

        // Extra accounts required for transfer validation:
        // Final execute account layout expected by this hook:
        // 0 source, 1 mint, 2 destination, 3 authority, 4 extra_meta_list,
        // 5 stablecoin_program, 6 source_blacklist, 7 dest_blacklist
        let account_metas = vec![
            ExtraAccountMeta::new_with_pubkey(&stablecoin::ID, false, false)?,
            // Source Blacklist PDA in the stablecoin program:
            // ["blacklist", mint, owner(source_token_account)]
            ExtraAccountMeta::new_external_pda_with_seeds(
                5, // stablecoin program id index
                &[
                    Seed::Literal { bytes: b"blacklist".to_vec() },
                    Seed::AccountKey { index: 1 }, // Mint
                    Seed::AccountData { account_index: 0, data_index: 32, length: 32 }, // Owner of Source
                ],
                false, // is_signer
                false, // is_writable
            )?,
            // Destination Blacklist PDA in the stablecoin program:
            // ["blacklist", mint, owner(destination_token_account)]
            ExtraAccountMeta::new_external_pda_with_seeds(
                5, // stablecoin program id index
                &[
                    Seed::Literal { bytes: b"blacklist".to_vec() },
                    Seed::AccountKey { index: 1 }, // Mint
                    Seed::AccountData { account_index: 2, data_index: 32, length: 32 }, // Owner of Dest
                ],
                false,
                false,
            )?,
        ];

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

pub fn handle_execute(accounts: &[AccountInfo], _amount: u64) -> Result<()> {
    if accounts.len() < 8 {
        return Err(ProgramError::NotEnoughAccountKeys.into());
    }

    let mint_info = &accounts[1];
    let authority_info = &accounts[3];

    // Identify Admin bypass (Seize)
    let (config_pda, _bump) = Pubkey::find_program_address(
        &[b"config", mint_info.key().as_ref()],
        &stablecoin::ID,
    );

    if authority_info.key() == config_pda {
        msg!("Execute - Admin bypass (Seize)");
        return Ok(());
    }

    // Accounts[6]/[7] are blacklist PDAs resolved by ExtraAccountMetaList.
    for (label, acc) in [("source", &accounts[6]), ("destination", &accounts[7])] {
        if !acc.data_is_empty() {
            let data = acc.try_borrow_data()?;
            // Anchor account layout: [8-byte discriminator][bump:1][account:32][is_blacklisted:1]
            if data.len() >= 42 && data[41] != 0 {
                msg!("Execute - Blocked {} account: {}", label, acc.key());
                return Err(TransferHookError::Blacklisted.into());
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
}
