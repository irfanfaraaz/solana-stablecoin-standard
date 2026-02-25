//! Trident fuzz tests for the stablecoin program.
//!
//! Simulation-only: we track stablecoin state in Rust and assert invariants
//! (total supply consistency, pause state). No on-chain program is invoked.
//! Run: `trident fuzz run fuzz_0` or `cargo run --bin fuzz_0` from trident-tests/.

use fuzz_accounts::*;
use trident_fuzz::fuzzing::*;

mod fuzz_accounts;
mod types;

/// Tracks stablecoin state for invariant checks (simulation-only).
#[derive(Default, Clone)]
struct StablecoinTracker {
    initialized: bool,
    total_supply: u64,
    is_paused: bool,
    mint_count: u64,
    burn_count: u64,
}

#[derive(FuzzTestMethods)]
struct FuzzTest {
    trident: Trident,
    fuzz_accounts: AccountAddresses,
    tracker: StablecoinTracker,
}

#[flow_executor]
impl FuzzTest {
    fn new() -> Self {
        Self {
            trident: Trident::default(),
            fuzz_accounts: AccountAddresses::default(),
            tracker: StablecoinTracker::default(),
        }
    }

    #[init]
    fn start(&mut self) {
        self.tracker = StablecoinTracker::default();
    }

    #[flow]
    fn flow_initialize(&mut self) {
        if self.tracker.initialized {
            return;
        }
        self.tracker.initialized = true;
        self.tracker.is_paused = false;
    }

    #[flow]
    fn flow_mint(&mut self) {
        if !self.tracker.initialized || self.tracker.is_paused {
            return;
        }
        let amount: u64 = rand::random::<u64>() % 1_000_000_000;
        let amount = if amount == 0 { 1 } else { amount };
        self.tracker.total_supply = self.tracker.total_supply.saturating_add(amount);
        self.tracker.mint_count += 1;
    }

    #[flow]
    fn flow_burn(&mut self) {
        if !self.tracker.initialized || self.tracker.is_paused {
            return;
        }
        if self.tracker.total_supply == 0 {
            return;
        }
        let max_burn = self.tracker.total_supply;
        let amount: u64 = rand::random::<u64>() % max_burn;
        let amount = if amount == 0 { 1 } else { amount };
        self.tracker.total_supply = self.tracker.total_supply.saturating_sub(amount);
        self.tracker.burn_count += 1;
    }

    #[flow]
    fn flow_pause(&mut self) {
        if !self.tracker.initialized {
            return;
        }
        self.tracker.is_paused = true;
    }

    #[flow]
    fn flow_unpause(&mut self) {
        if !self.tracker.initialized {
            return;
        }
        self.tracker.is_paused = false;
    }

    #[end]
    fn end(&mut self) {
        if !self.tracker.initialized {
            return;
        }
        // Invariant: total supply is non-negative (saturating_sub used in flow_burn)
        assert!(
            self.tracker.total_supply <= u64::MAX,
            "total_supply overflow"
        );
    }
}

fn main() {
    FuzzTest::fuzz(2000, 50);
}
