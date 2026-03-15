//! SSS Oracle Integration Module
//!
//! Separate program that reads Switchboard price feeds and computes token amounts
//! for peg-based mint/redeem (EUR, BRL, CPI-indexed). Stablecoin remains SSS-1/SSS-2.

#![allow(unexpected_cfgs)]
#![allow(deprecated)]

use anchor_lang::prelude::*;
use switchboard_on_demand::prelude::rust_decimal::prelude::{Decimal, ToPrimitive};
use switchboard_on_demand::QuoteVerifier;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod oracle {
    use super::*;

    /// Read verified price from Switchboard (Ed25519 instruction at index 1 in same tx).
    pub fn read_feed(ctx: Context<ReadQuote>) -> Result<()> {
        let clock_slot = Clock::get()?.slot;
        let quote = QuoteVerifier::new()
            .queue(ctx.accounts.queue.to_account_info())
            .slothash_sysvar(ctx.accounts.slot_hashes.to_account_info())
            .ix_sysvar(ctx.accounts.instructions.to_account_info())
            .clock_slot(clock_slot)
            .max_age(MAX_STALENESS_SLOTS)
            .verify_instruction_at(1)
            .map_err(|_| error!(OracleError::InvalidFeed))?;

        for feed in quote.feeds() {
            msg!("Feed {}: value = {}", feed.hex_id(), feed.value());
        }
        Ok(())
    }

    /// Compute token amount to mint for a given peg amount (e.g. 100 EUR).
    /// Returns amount via set_return_data (u64 little-endian).
    pub fn compute_mint_amount(
        ctx: Context<ReadQuote>,
        peg_amount: u64,
        token_decimals: u8,
    ) -> Result<()> {
        compute_amount_impl(ctx, peg_amount, token_decimals)
    }

    /// Compute token amount to redeem (burn) for a given peg amount.
    /// Returns amount via set_return_data (u64 little-endian).
    pub fn compute_redeem_amount(
        ctx: Context<ReadQuote>,
        peg_amount: u64,
        token_decimals: u8,
    ) -> Result<()> {
        compute_amount_impl(ctx, peg_amount, token_decimals)
    }
}

const MAX_STALENESS_SLOTS: u64 = 150;

#[derive(Accounts)]
pub struct ReadQuote<'info> {
    /// Switchboard queue (required for verification)
    /// CHECK: Validated by QuoteVerifier
    pub queue: UncheckedAccount<'info>,

    /// SlotHashes sysvar (client passes sysvar account)
    /// CHECK: Sysvar account
    pub slot_hashes: UncheckedAccount<'info>,

    /// Instructions sysvar (client passes sysvar account; Ed25519 instruction at index 1)
    /// CHECK: Sysvar account
    pub instructions: UncheckedAccount<'info>,
}

/// Client must send tx with instructions: [Switchboard update ix at 0, Ed25519 verify ix at 1, this program ix at 2].
/// Uses fixed-point Decimal math only (no f64) for financial safety.
fn compute_amount_impl(ctx: Context<ReadQuote>, peg_amount: u64, token_decimals: u8) -> Result<()> {
    require!(peg_amount > 0, OracleError::ZeroPrice);
    require!(token_decimals <= 18, OracleError::Overflow);

    let clock_slot = Clock::get()?.slot;
    let quote = QuoteVerifier::new()
        .queue(ctx.accounts.queue.to_account_info())
        .slothash_sysvar(ctx.accounts.slot_hashes.to_account_info())
        .ix_sysvar(ctx.accounts.instructions.to_account_info())
        .clock_slot(clock_slot)
        .max_age(MAX_STALENESS_SLOTS)
        .verify_instruction_at(1)
        .map_err(|_| error!(OracleError::InvalidFeed))?;

    let feeds = quote.feeds();
    let feed = feeds.first().ok_or(OracleError::InvalidFeed)?;
    let price_decimal = feed.value();
    if price_decimal.is_zero() {
        return err!(OracleError::ZeroPrice);
    }

    // token_amount = peg_amount * 10^token_decimals / price (all in Decimal, no f64)
    let peg = Decimal::from(peg_amount);
    let ten = Decimal::from(10u32);
    let mut scale = Decimal::from(1u32);
    for _ in 0..token_decimals {
        scale = scale.checked_mul(ten).ok_or(OracleError::Overflow)?;
    }
    let numerator = peg.checked_mul(scale).ok_or(OracleError::Overflow)?;
    let token_amount_decimal = numerator
        .checked_div(price_decimal)
        .ok_or(OracleError::Overflow)?;
    let token_amount: u64 = token_amount_decimal.to_u64().ok_or(OracleError::Overflow)?;

    anchor_lang::solana_program::program::set_return_data(&token_amount.to_le_bytes());
    msg!(
        "compute_amount: peg_amount={} price={} token_amount={}",
        peg_amount,
        price_decimal,
        token_amount
    );
    Ok(())
}

#[error_code]
pub enum OracleError {
    #[msg("No feed or invalid quote")]
    InvalidFeed,
    #[msg("Price must be greater than zero")]
    ZeroPrice,
    #[msg("Numeric overflow")]
    Overflow,
}
