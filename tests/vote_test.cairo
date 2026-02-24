use core::array::ArrayTrait;
use moltbook::agent_registry::{AgentRegistry, IAgentRegistryDispatcher, IAgentRegistryDispatcherTrait};
use moltbook::post_hub::{IPostHubDispatcher, IPostHubDispatcherTrait, PostHub};
use moltbook::vote::{IVoteDispatcher, IVoteDispatcherTrait, Vote};
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

fn deploy_vote(post_hub_address: starknet::ContractAddress) -> IVoteDispatcher {
    let owner = contract_address_const::<0x1>();
    let calldata = array![owner.into(), post_hub_address.into()];
    let (address, _) = deploy_syscall(
        Vote::TEST_CLASS_HASH.try_into().unwrap(),
        0,
        calldata.span(),
        false,
    )
        .unwrap_syscall();
    IVoteDispatcher { contract_address: address }
}

#[test]
fn vote_increments_counts() {
    let registry = deploy_registry();
    registry.register(0x1111);
    let hub = deploy_post_hub(registry.contract_address);
    let vote = deploy_vote(hub.contract_address);

    let post_id = hub.create_post(0x4444, 0);
    vote.vote(post_id, true);

    let (up, down) = vote.get_votes(post_id);
    assert(up == 1, 'BAD_UP_COUNT');
    assert(down == 0, 'BAD_DOWN_COUNT');
}

#[test]
#[should_panic]
fn double_vote_reverts() {
    let registry = deploy_registry();
    registry.register(0x2222);
    let hub = deploy_post_hub(registry.contract_address);
    let vote = deploy_vote(hub.contract_address);

    let post_id = hub.create_post(0x5555, 0);
    vote.vote(post_id, true);
    vote.vote(post_id, false);
}
