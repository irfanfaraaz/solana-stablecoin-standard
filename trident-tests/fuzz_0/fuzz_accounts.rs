use trident_fuzz::fuzzing::*;

/// Account addresses used across fuzz flows for the stablecoin program.
/// See: https://ackee.xyz/trident/docs/latest/trident-api-macro/trident-types/fuzz-accounts/
#[derive(Default)]
#[allow(dead_code)]
pub struct AccountAddresses {
    pub admin: AddressStorage,
    pub config: AddressStorage,
    pub role_account: AddressStorage,
    pub mint: AddressStorage,
    pub token_program: AddressStorage,
    pub system_program: AddressStorage,
    pub minter: AddressStorage,
    pub minter_config: AddressStorage,
    pub to_account: AddressStorage,
    pub burner: AddressStorage,
    pub from_account: AddressStorage,
}
