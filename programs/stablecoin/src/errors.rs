use anchor_lang::prelude::*;

#[error_code]
pub enum StablecoinError {
    #[msg("Unauthorized access")]
    Unauthorized,
    #[msg("Stablecoin operations are globally paused")]
    ProgramPaused,
    #[msg("Minter has exceeded their allowed quota")]
    QuotaExceeded,
    #[msg("Minter is currently inactive")]
    MinterInactive,
    #[msg("Compliance transfer hook is not enabled for this stablecoin")]
    ComplianceNotEnabled,
    #[msg("Permanent delegate is not enabled for this stablecoin")]
    PermanentDelegateNotEnabled,
    #[msg("Confidential transfers are not enabled for this stablecoin")]
    ConfidentialTransfersNotEnabled,
    #[msg("Math Overflow")]
    MathOverflow,
}
