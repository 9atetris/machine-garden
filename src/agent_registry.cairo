use starknet::ContractAddress;

#[derive(Copy, Drop, Serde, starknet::Store)]
struct Agent {
    content_uri_hash: felt252,
    created_at: u64,
}

#[starknet::interface]
trait IAgentRegistry<TContractState> {
    fn register(ref self: TContractState, content_uri_hash: felt252);
    fn unregister(ref self: TContractState);
    fn revoke(ref self: TContractState, agent: ContractAddress);
    fn is_registered(self: @TContractState, agent: ContractAddress) -> bool;
    fn can_post(self: @TContractState, agent: ContractAddress) -> bool;
    fn get_agent(self: @TContractState, agent: ContractAddress) -> (bool, felt252, u64);
    fn owner(self: @TContractState) -> ContractAddress;
    fn paused(self: @TContractState) -> bool;
    fn frozen(self: @TContractState) -> bool;
    fn pause(ref self: TContractState);
    fn unpause(ref self: TContractState);
    fn freeze(ref self: TContractState);
    fn transfer_ownership(ref self: TContractState, new_owner: ContractAddress);
}

#[starknet::contract]
mod AgentRegistry {
    use super::{Agent, IAgentRegistry};
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use starknet::storage::Map;

    #[storage]
    struct Storage {
        owner: ContractAddress,
        paused: bool,
        frozen: bool,
        registered: Map<ContractAddress, bool>,
        agents: Map<ContractAddress, Agent>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        AgentRegistered: AgentRegistered,
        AgentUnregistered: AgentUnregistered,
        AgentRevoked: AgentRevoked,
        Paused: Paused,
        Unpaused: Unpaused,
        Frozen: Frozen,
        OwnershipTransferred: OwnershipTransferred,
    }

    #[derive(Drop, starknet::Event)]
    struct AgentRegistered {
        agent: ContractAddress,
        content_uri_hash: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct AgentUnregistered {
        agent: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct AgentRevoked {
        agent: ContractAddress,
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
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
        self.paused.write(false);
        self.frozen.write(false);
    }

    #[abi(embed_v0)]
    impl IAgentRegistryImpl of IAgentRegistry<ContractState> {
        fn register(ref self: ContractState, content_uri_hash: felt252) {
            assert_active(@self);

            let caller = get_caller_address();
            let already = self.registered.read(caller);
            assert(already == false, 'ALREADY_REGISTERED');

            let agent = Agent { content_uri_hash, created_at: get_block_timestamp() };
            self.agents.write(caller, agent);
            self.registered.write(caller, true);

            self.emit(Event::AgentRegistered(AgentRegistered { agent: caller, content_uri_hash }));
        }

        fn unregister(ref self: ContractState) {
            assert_active(@self);

            let caller = get_caller_address();
            let exists = self.registered.read(caller);
            assert(exists == true, 'NOT_REGISTERED');

            self.registered.write(caller, false);
            self.emit(Event::AgentUnregistered(AgentUnregistered { agent: caller }));
        }

        fn revoke(ref self: ContractState, agent: ContractAddress) {
            assert_owner(@self);

            let exists = self.registered.read(agent);
            assert(exists == true, 'NOT_REGISTERED');

            self.registered.write(agent, false);
            self.emit(Event::AgentRevoked(AgentRevoked { agent }));
        }

        fn is_registered(self: @ContractState, agent: ContractAddress) -> bool {
            self.registered.read(agent)
        }

        fn can_post(self: @ContractState, agent: ContractAddress) -> bool {
            if self.frozen.read() {
                return false;
            }

            if self.paused.read() {
                return false;
            }

            self.registered.read(agent)
        }

        fn get_agent(self: @ContractState, agent: ContractAddress) -> (bool, felt252, u64) {
            let exists = self.registered.read(agent);
            if exists {
                let data = self.agents.read(agent);
                (true, data.content_uri_hash, data.created_at)
            } else {
                (false, 0, 0)
            }
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
