"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSS_2_PRESET = exports.SSS_1_PRESET = void 0;
// SSS-1 (Standard Stablecoin Spec 1): Clean, vanilla operations
exports.SSS_1_PRESET = {
    enablePermanentDelegate: false,
    enableTransferHook: false,
    defaultAccountFrozen: false,
};
// SSS-2 (Standard Stablecoin Spec 2): Fully compliant with seize, freeze, and blacklists
exports.SSS_2_PRESET = {
    enablePermanentDelegate: true,
    enableTransferHook: true,
    defaultAccountFrozen: false,
};
