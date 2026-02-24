use core::array::ArrayTrait;
use moltbook::agent_registry::{AgentRegistry, IAgentRegistryDispatcher, IAgentRegistryDispatcherTrait};
use starknet::contract_address_const;
use starknet::syscalls::deploy_syscall;
use starknet::SyscallResultTrait;
use core::traits::TryInto;

fn deploy_registry() -> IAgentRegistryDispatcher {
    let owner = contract_address_const::<0x0>();
    let calldata = array![owner.into()];
    let (address, _) = deploy_syscall(
        AgentRegistry::TEST_CLASS_HASH.try_into().unwrap(),
        0,
        calldata.span(),
        false,
    )
        .unwrap_syscall();
    IAgentRegistryDispatcher { contract_address: address }
}

#[test]
#[should_panic]
fn register_twice_reverts() {
    let registry = deploy_registry();
    registry.register(0x1234);
    registry.register(0x5678);
}

#[test]
fn unregister_clears_registration() {
    let registry = deploy_registry();
    registry.register(0x1111);

    let active_before = registry.is_registered(contract_address_const::<0x0>());
    assert(active_before == true, 'EXPECTED_REGISTERED');

    registry.unregister();

    let active_after = registry.is_registered(contract_address_const::<0x0>());
    assert(active_after == false, 'EXPECTED_UNREGISTERED');
}

#[test]
fn can_post_reflects_registration_and_pause() {
    let registry = deploy_registry();
    let caller = contract_address_const::<0x0>();

    let before_register = registry.can_post(caller);
    assert(before_register == false, 'EXPECTED_FALSE_BEFORE_REGISTER');

    registry.register(0x2222);
    let after_register = registry.can_post(caller);
    assert(after_register == true, 'EXPECTED_TRUE_AFTER_REGISTER');

    registry.pause();
    let while_paused = registry.can_post(caller);
    assert(while_paused == false, 'EXPECTED_FALSE_WHILE_PAUSED');
}

#[test]
fn owner_can_revoke() {
    let registry = deploy_registry();
    let caller = contract_address_const::<0x0>();

    registry.register(0x3333);
    let active = registry.is_registered(caller);
    assert(active == true, 'EXPECTED_REGISTERED');

    registry.revoke(caller);
    let revoked = registry.is_registered(caller);
    assert(revoked == false, 'EXPECTED_REVOKED');
}
