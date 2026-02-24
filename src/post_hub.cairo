use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, starknet::Store)]
struct Post {
    author: ContractAddress,
    content_uri_hash: felt252,
    parent_post_id: u64,
    created_at: u64,
}

#[starknet::interface]
trait IPostHub<TContractState> {
    fn create_post(ref self: TContractState, content_uri_hash: felt252, parent_post_id: u64) -> u64;
    fn get_post(self: @TContractState, post_id: u64) -> (ContractAddress, felt252, u64, u64);
    fn post_exists(self: @TContractState, post_id: u64) -> bool;
    fn post_count(self: @TContractState) -> u64;
    fn agent_registry(self: @TContractState) -> ContractAddress;
    fn owner(self: @TContractState) -> ContractAddress;
    fn paused(self: @TContractState) -> bool;
    fn frozen(self: @TContractState) -> bool;
    fn pause(ref self: TContractState);
    fn unpause(ref self: TContractState);
    fn freeze(ref self: TContractState);
    fn transfer_ownership(ref self: TContractState, new_owner: ContractAddress);
}

#[starknet::contract]
mod PostHub {
    use super::{IPostHub, Post};
    use crate::agent_registry::{IAgentRegistryDispatcher, IAgentRegistryDispatcherTrait};
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use starknet::storage::Map;

    #[storage]
    struct Storage {
        owner: ContractAddress,
        agent_registry: ContractAddress,
        paused: bool,
        frozen: bool,
        post_count: u64,
        posts: Map<u64, Post>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        PostCreated: PostCreated,
        Paused: Paused,
        Unpaused: Unpaused,
        Frozen: Frozen,
        OwnershipTransferred: OwnershipTransferred,
    }

    #[derive(Drop, starknet::Event)]
    struct PostCreated {
        post_id: u64,
        author: ContractAddress,
        parent_post_id: u64,
        content_uri_hash: felt252,
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
    fn constructor(ref self: ContractState, owner: ContractAddress, agent_registry: ContractAddress) {
        self.owner.write(owner);
        self.agent_registry.write(agent_registry);
        self.paused.write(false);
        self.frozen.write(false);
        self.post_count.write(0);
    }

    #[abi(embed_v0)]
    impl IPostHubImpl of IPostHub<ContractState> {
        fn create_post(ref self: ContractState, content_uri_hash: felt252, parent_post_id: u64) -> u64 {
            assert_active(@self);

            let caller = get_caller_address();
            let registry = IAgentRegistryDispatcher { contract_address: self.agent_registry.read() };
            let posting_allowed = registry.can_post(caller);
            assert(posting_allowed == true, 'AGENT_NOT_REGISTERED');

            if parent_post_id != 0 {
                let exists = is_post_id_valid(@self, parent_post_id);
                assert(exists == true, 'PARENT_NOT_FOUND');
            }

            let new_id = self.post_count.read() + 1;
            self.post_count.write(new_id);

            let post = Post {
                author: caller,
                content_uri_hash,
                parent_post_id,
                created_at: get_block_timestamp(),
            };
            self.posts.write(new_id, post);

            self.emit(Event::PostCreated(PostCreated {
                post_id: new_id,
                author: post.author,
                parent_post_id,
                content_uri_hash,
            }));

            new_id
        }

        fn get_post(self: @ContractState, post_id: u64) -> (ContractAddress, felt252, u64, u64) {
            let exists = is_post_id_valid(self, post_id);
            assert(exists == true, 'POST_NOT_FOUND');

            let post = self.posts.read(post_id);
            (post.author, post.content_uri_hash, post.parent_post_id, post.created_at)
        }

        fn post_exists(self: @ContractState, post_id: u64) -> bool {
            is_post_id_valid(self, post_id)
        }

        fn post_count(self: @ContractState) -> u64 {
            self.post_count.read()
        }

        fn agent_registry(self: @ContractState) -> ContractAddress {
            self.agent_registry.read()
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

    fn is_post_id_valid(self: @ContractState, post_id: u64) -> bool {
        if post_id == 0 {
            return false;
        }
        let count = self.post_count.read();
        post_id <= count
    }
}
