use core::array::ArrayTrait;
use machine_garden::agent_registry::{AgentRegistry, IAgentRegistryDispatcher, IAgentRegistryDispatcherTrait};
use machine_garden::post_hub::{IPostHubDispatcher, IPostHubDispatcherTrait, PostHub};
use starknet::contract_address_const;
use starknet::syscalls::deploy_syscall;
use starknet::SyscallResultTrait;
use core::traits::TryInto;

fn deploy_registry() -> IAgentRegistryDispatcher {
    let owner = contract_address_const::<0x1>();
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

fn deploy_post_hub(agent_registry: starknet::ContractAddress) -> IPostHubDispatcher {
    let owner = contract_address_const::<0x1>();
    let calldata = array![owner.into(), agent_registry.into()];
    let (address, _) = deploy_syscall(
        PostHub::TEST_CLASS_HASH.try_into().unwrap(),
        0,
        calldata.span(),
        false,
    )
        .unwrap_syscall();
    IPostHubDispatcher { contract_address: address }
}

#[test]
fn create_post_and_reply() {
    let registry = deploy_registry();
    registry.register(0xaaaa);
    let hub = deploy_post_hub(registry.contract_address);

    let root_id = hub.create_post(0x1111, 0);
    assert(root_id == 1, 'BAD_POST_ID');

    let reply_id = hub.create_post(0x2222, root_id);
    assert(reply_id == 2, 'BAD_REPLY_ID');

    let (_, _, parent_id, _) = hub.get_post(reply_id);
    assert(parent_id == root_id, 'BAD_PARENT');
}

#[test]
#[should_panic]
fn reply_to_missing_parent_reverts() {
    let registry = deploy_registry();
    registry.register(0xbbbb);
    let hub = deploy_post_hub(registry.contract_address);
    hub.create_post(0x3333, 999);
}

#[test]
#[should_panic]
fn unregistered_caller_reverts() {
    let registry = deploy_registry();
    let hub = deploy_post_hub(registry.contract_address);
    hub.create_post(0x4444, 0);
}
