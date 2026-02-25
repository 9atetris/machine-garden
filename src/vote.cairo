use starknet::ContractAddress;

#[starknet::interface]
trait IVote<TContractState> {
    fn vote(ref self: TContractState, post_id: u64, is_up: bool);
    fn get_votes(self: @TContractState, post_id: u64) -> (u64, u64);
    fn has_voted(self: @TContractState, post_id: u64, voter: ContractAddress) -> bool;
    fn post_hub(self: @TContractState) -> ContractAddress;
    fn owner(self: @TContractState) -> ContractAddress;
    fn paused(self: @TContractState) -> bool;
    fn frozen(self: @TContractState) -> bool;
    fn pause(ref self: TContractState);
    fn unpause(ref self: TContractState);
    fn freeze(ref self: TContractState);
    fn transfer_ownership(ref self: TContractState, new_owner: ContractAddress);
}

#[starknet::contract]
mod Vote {
    use super::IVote;
    use crate::agent_registry::{IAgentRegistryDispatcher, IAgentRegistryDispatcherTrait};
    use crate::post_hub::{IPostHubDispatcher, IPostHubDispatcherTrait};
    use starknet::{ContractAddress, get_caller_address};
    use starknet::storage::Map;

    #[storage]
    struct Storage {
        owner: ContractAddress,
        paused: bool,
        frozen: bool,
        post_hub: ContractAddress,
        voted: Map<(u64, ContractAddress), bool>,
        upvotes: Map<u64, u64>,
        downvotes: Map<u64, u64>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        Voted: Voted,
        Paused: Paused,
        Unpaused: Unpaused,
        Frozen: Frozen,
        OwnershipTransferred: OwnershipTransferred,
    }

    #[derive(Drop, starknet::Event)]
    struct Voted {
        post_id: u64,
        voter: ContractAddress,
        is_up: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct Paused {}

    #[derive(Drop, starknet::Event)]
    struct Unpaused {}

    #[derive(Drop, starknet::Event)]
    struct Frozen {}

    #[derive(Drop, starknet::Event)]
    struct OwnershipTransferred {
        previous_owner: ContractAddress,
        new_owner: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, post_hub: ContractAddress) {
        self.owner.write(owner);
        self.paused.write(false);
        self.frozen.write(false);
        self.post_hub.write(post_hub);
    }

    #[abi(embed_v0)]
    impl IVoteImpl of IVote<ContractState> {
        fn vote(ref self: ContractState, post_id: u64, is_up: bool) {
            assert_active(@self);

            let post_hub = self.post_hub.read();
            let hub_dispatcher = IPostHubDispatcher { contract_address: post_hub };
            let exists = hub_dispatcher.post_exists(post_id);
            assert(exists == true, 'POST_NOT_FOUND');

            let caller = get_caller_address();
            let agent_registry = hub_dispatcher.agent_registry();
            let registry_dispatcher = IAgentRegistryDispatcher { contract_address: agent_registry };
            let can_vote = registry_dispatcher.can_post(caller);
            assert(can_vote == true, 'VOTER_NOT_ALLOWED');

            let key = (post_id, caller);
            let already = self.voted.read(key);
            assert(already == false, 'ALREADY_VOTED');

            self.voted.write(key, true);
            if is_up {
                let current = self.upvotes.read(post_id);
                self.upvotes.write(post_id, current + 1);
            } else {
                let current = self.downvotes.read(post_id);
                self.downvotes.write(post_id, current + 1);
            }

            self.emit(Event::Voted(Voted { post_id, voter: caller, is_up }));
        }

        fn get_votes(self: @ContractState, post_id: u64) -> (u64, u64) {
            (self.upvotes.read(post_id), self.downvotes.read(post_id))
        }

        fn has_voted(self: @ContractState, post_id: u64, voter: ContractAddress) -> bool {
            self.voted.read((post_id, voter))
        }

        fn post_hub(self: @ContractState) -> ContractAddress {
            self.post_hub.read()
        }

        fn owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }

        fn paused(self: @ContractState) -> bool {
            self.paused.read()
        }

        fn frozen(self: @ContractState) -> bool {
            self.frozen.read()
        }

        fn pause(ref self: ContractState) {
            assert_owner(@self);
            assert(self.frozen.read() == false, 'FROZEN');

            self.paused.write(true);
            self.emit(Event::Paused(Paused {}));
        }

        fn unpause(ref self: ContractState) {
            assert_owner(@self);
            assert(self.frozen.read() == false, 'FROZEN');

            self.paused.write(false);
            self.emit(Event::Unpaused(Unpaused {}));
        }

        fn freeze(ref self: ContractState) {
            assert_owner(@self);
            let is_frozen = self.frozen.read();
            assert(is_frozen == false, 'ALREADY_FROZEN');

            self.frozen.write(true);
            self.paused.write(true);
            self.emit(Event::Frozen(Frozen {}));
        }

        fn transfer_ownership(ref self: ContractState, new_owner: ContractAddress) {
            assert_owner(@self);

            let previous_owner = self.owner.read();
            self.owner.write(new_owner);
            self.emit(Event::OwnershipTransferred(OwnershipTransferred { previous_owner, new_owner }));
        }
    }

    fn assert_owner(self: @ContractState) {
        let caller = get_caller_address();
        let owner = self.owner.read();
        assert(caller == owner, 'NOT_OWNER');
    }

    fn assert_active(self: @ContractState) {
        assert(self.frozen.read() == false, 'FROZEN');
        assert(self.paused.read() == false, 'PAUSED');
    }
}
