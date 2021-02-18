/**
 * This is a pared down interface that has been copy/pasted from the `@types/web3-*` packages.
 * The native interfaces are vast, and include much, much more functionality that we need here,
 * so it is desirable to define only a subset of them, rather than introduce a new dependency on
 * the web3 system in general.
 */

export interface Web3Interface {
    eth: EthInterface;
}

export interface EthInterface {
    Contract: ContractConstructorInterface;
}

export interface ContractConstructorInterface {
    new(abi: Array<AbiItem>, address?: string): ContractInterface;
}
export interface ContractInterface {
    methods: { [methodName: string]: (...args: Array<any>) => ContractMethod };
}

export type AbiType = 'function' | 'constructor' | 'event' | 'fallback';
export type StateMutabilityType = 'pure' | 'view' | 'nonpayable' | 'payable';

export interface AbiItem {
    anonymous?: boolean;
    constant?: boolean;
    inputs?: AbiInput[];
    name?: string;
    outputs?: AbiOutput[];
    payable?: boolean;
    stateMutability?: StateMutabilityType;
    type: AbiType;
}

export interface AbiInput {
    name: string;
    type: string;
    indexed?: boolean;
	components?: AbiInput[];
}

export interface AbiOutput {
    name: string;
    type: string;
	components?: AbiOutput[];
    internalType?: string;
}

export interface ContractMethod {
    send(
        options: SendOptions,
        callback?: (err: Error, transactionHash: string) => void
    ): Promise<unknown>;

    call(): Promise<unknown>;

    estimateGas(
        options: EstimateGasOptions,
        callback?: (err: Error, gas: number) => void
    ): Promise<number>;

    estimateGas(callback: (err: Error, gas: number) => void): Promise<number>;

    estimateGas(
        options: EstimateGasOptions,
        callback: (err: Error, gas: number) => void
    ): Promise<number>;

    estimateGas(options: EstimateGasOptions): Promise<number>;

    estimateGas(): Promise<number>;

    encodeABI(): string;
}

export interface SendOptions {
    from: string;
    gasPrice?: string;
    gas?: number;
    value?: number | string;
}

export interface EstimateGasOptions {
    from?: string;
    gas?: number;
    value?: number | string;
}
