/*
export interface KYCInfoInput {
    firstName: string
    lastName: string
    address: {
        streetAddress: string
        city: string
        state: string
        zip: string
        country: string
    }
}

export interface PersonInvestor {
    type: "person";
    name: string;
    email: string;
    walletAddress: string;
    country: string;
}
export interface EntityInvestor {
    type: "entity";
    name: string;
    email: string;
    walletAddress: string;
    country: string;
    authorizedPerson: PersonInvestor;
}
export type Investor = PersonInvestor | EntityInvestor;

export enum ErrorCodes {
    DUP_ADDR = "Address In Use",
    DUP_EMAIL = "Email In Use",
    COUNTRY = "Country Mismatch",
}

export interface Obstruction<Params extends { [k: string]: unknown } = { [k: string]: unknown }> {
    code: string;
    text: string;
    params?: Params;
}

export type DuplicateObstruction = Obstruction<{
    type: "duplicate";
    incoming: string;
    existing: string;
}>;


/**
 * Webhook types
 *
 * These types are not used in this library directly, but represent the data type returned in
 * webhooks originating from the `whitelistAccount` call.
 * /
export type WebhookPayload = {
    tokenContractId: string;
    accountId: string;
    transactionHash: string;
}

export type WebhookSuccessResponse = {
    status: "success";
    payload: WebhookPayload;
}

export type WebhookNotSuccessResponse = {
    status: "failure" | "delayed";
    payload: WebhookPayload & {
        reason: string
    };
}

export type WebhookResponse = WebhookSuccessResponse | WebhookNotSuccessResponse;

*/

/**
 *
 *
 *
 *
 *
 * Main Tokensoft SDK Interface
 *
 * Since Typescript includes all protected/private variables and functions in it's definition of
 * public class interfaces, we want to define a separate interface describing only the actual
 * public functionality.
 *
 * Note that many methods have a `p` parameter. This parameter is a "projection" of the given
 * return type and mirrors a GraphQL projection.
 *
 *
 *
 *
 *
 */
export interface TokensoftInterface {
    /**
     * Get the user corresponding to the current credentials
     */
    currentUser(): Promise<{ currentUser: { id: string; email: string } }>;

    /**
     * Get a user by user id
     */
    getUserById<P extends Projection<User>>(
        id: string,
        p: P
    ): Promise<Result<User, P> | null>;

    /**
     * Get a user by email
     */
    getUserByEmail<P extends Projection<User>>(
        email: string,
        p: P
    ): Promise<Result<User, P> | null>;

    /**
     * Create a user record without whitelisting. This gives the user a user ID in the Tokensoft
     * system, but does not whitelist the user for trading.
     */
    createUnregisteredUser<P extends Projection<User>>(
        email: string,
        p: P
    ): Promise<Result<User, P>>;

    /**
     * Update KYC data for the given user
     */
    updateUserDetails<P extends Projection<User>>(
        userId: string,
        data: Address,
        p: P
    ): Promise<Result<User, P>>;

    /**
     * Get all sale rounds for the given token (implied by the API being used)
     */
    getRounds<P extends Projection<Round>>(
        p: P
    ): Promise<Array<Result<Round, P>>>;

    /**
     * Get the sale status object of the given user for the given token (implied by the API being
     * used)
     */
    findSaleStatusFromUserEmail<P extends Projection<Round>>(
        email: string,
        roundId: string,
        p: P
    ): Promise<Result<SaleStatus, P> | null>;

    /**
     * Get a user object by the user's ETH address
     */
    findUserByEthAddress<P extends Projection<User>>(
        addr: string,
        p: P
    ): Promise<Result<User, P> | null>;

    /**
     * Get all of a user's accounts. This can include Ethereum wallets, among other things, and
     * is not limited to the accounts used for the given token.
     */
    getAccounts<P extends Projection<Account>>(
        saleStatusId: string,
        tokenContractId: string,
        p: P
    ): Promise<Array<Result<Account, P>>>;

    /**
     * Get all of the given user's accounts (this is redundant with `getAccounts`, but doesn't
     * require the `tokenContractId` field, so may save a round-trip).
     */
    getUserAccounts<P extends Projection<Account>>(
        userId: string,
        p: P
    ): Promise<Array<Result<Account, P>>>;

    /**
     * Add an account for a given user. This will usually be an ETH wallet, but could be any valid
     * entity that holds tokens.
     */
    addAccount<P extends Projection<Account>>(
        account: AccountInputType,
        p: P
    ): Promise<Result<Account, P>>;

    /**
     * Whitelist the given account
     *
     * @param accountId: string The id of the account being whitelisted. Note that each wallet
     * an investor owns and wishes to transact with must be whitelisted separately.
     * @param tokenContractId: string The Tokensoft id of the token. This will be provided by
     * Tokensoft for each token and may be stored in configuration or database.
     * @param webhookUrl?: string An optional webhook URL. A webhook will be sent on status change
     * with a payload of type `WebhookResponse` (defined above).
     * @return string The hash of the initial blockchain transaction created to whitelist the
     * account. Note that there is no guarantee that this transaction will be the one to actually
     * whitelist the account. The transaction may be mined and dropped, or it may be replaced by
     * another with a higher gas price. The only way to know that the whitelisting worked is to
     * receive a webhook via the webhookUrl parameter above.
     */
    whitelistAccount(
        accountId: string,
        tokenContractId: string,
        webhookUrl?: string
    ): Promise<string>;


    /**
     * Idempotently submit investor data and whitelist the given account
     *
     * @param accountId: string The id of the account being whitelisted. Note that each wallet
     * an investor owns and wishes to transact with must be whitelisted separately.
     * @param tokenContractId: string The Tokensoft id of the token. This will be provided by
     * Tokensoft for each token and may be stored in configuration or database.
     * @param webhookUrl?: string An optional webhook URL. A webhook will be sent on status change
     * with a payload of type `WebhookResponse` (defined above).
     * @return string The hash of the initial blockchain transaction created to whitelist the
     * account. Note that there is no guarantee that this transaction will be the one to actually
     * whitelist the account. The transaction may be mined and dropped, or it may be replaced by
     * another with a higher gas price. The only way to know that the whitelisting worked is to
     * receive a webhook via the webhookUrl parameter above.
     */
    externalWhitelistUser<P extends Projection<ExternalUserLookupResponse>>(
        input: ExternalWhitelistUserInput,
        p: P
    ): Promise<Result<ExternalUserLookupResponse, P>>;

    /**
     * See if there are problems that will arise when trying to clear the given transaction
     */
    detectTransferRestriction(
        tx: Transaction
    ): Promise<Array<{ code: string; text: string; }>>;
}

export type FetchFunction = (
    url: string,
    opts: {
        headers?: { [header: string]: string };
        method?: string;
        body?: string;
    }
) => Promise<{ json(): Promise<any> }>;

export interface ClientOptions {
    // The maximum age for the server time cache
    maxTimecacheAgeMs: number;
    // An optional web3 dependency. If not provided, client will throw errors when attempting to
    // use web3.
    web3?: Web3Interface;
    // An optional fetch dependency. If not provided, the default `node-fetch` will be used.
    fetch: FetchFunction;
}

/**
 *
 *
 *
 *
 *
 * General GraphQL structures
 *
 * These types define GraphQL projections and results.
 *
 * The `Projection` type is a type describing a _projection_ of a full type for the purposes of
 * GraphQL. Note that GraphQL projections ignore arrays, so this type strips out arrays. The goal
 * is to be able to pass in a Projection object that can be used to programmatically generate a
 * GraphQL type string and then subsequently to generate a matching return type definition.
 *
 * The `Result` type describes a concrete result based on the given projection object.
 *
 * For example:
 *
 * // Define a base type
 * type User = {
 *   id: string;
 *   email: string;
 *   approved: string;
 *   address: {
 *     street1: string;
 *     city: string;
 *     state: string;
 *     country: {
 *       code: string;
 *       allowed: boolean;
 *     }
 *   };
 *   docs: Array<{
 *     id: string;
 *     url: string;
 *     approved: boolean;
 *   }>
 * }
 * 
 * // Define a function that accepts a projection of a specific type and returns a result based
 * // on that projection
 * const testUser = <T extends Projection<User>>(p: T): Result<User, T> => {
 *   const result: any = {
 *       email: "me@us.com",
 *       address: {
 *           country: {
 *               code: "US"
 *           }
 *       },
 *       docs: [
 *           {
 *               id: "1",
 *               url: "https://abcde.com/docs/1"
 *           },
 *           {
 *               id: "2",
 *               url: "https://abcde.com/docs/2"
 *           }
 *       ]
 *   }
 *   return result;
 * }
 * 
 * // Use the function with a given projection to get a result
 * const res = testUser({
 *   id: false,
 *   email: true,
 *   address: {
 *     country: {
 *       code: true
 *     }
 *   },
 *   docs: {
 *     id: true,
 *     url: true
 *   }
 * });
* 
* // Use the result
* console.log(res.id);                   // << Type: never
* console.log(res.email);                // << Type: string
* console.log(res.docs.length);          // << Value: 2
* console.log(res.docs[0]!.id);          // << Type: string
* console.log(res.address.country.code); // << Type: string
*
*
*
*
*
*
*/

export type Projection<T> = {
    [K in keyof T]?:
    T[K] extends Array<infer U>
    ? Projection<U>
    : T[K] extends null | string | number | boolean | undefined
    ? boolean
    : Projection<T[K]>;
}

export type Result<T, P> = P extends Projection<T>
    ? {
        [K in (keyof P & keyof T)]:
        P[K] extends undefined | false
        ? undefined
        : P[K] extends true
        ? T[K]
        : T[K] extends Array<infer U>
        ? Array<Result<U, P[K]>>
        : Result<T[K], P[K]>
    }
    : never;

/**
 * GraphQL responses consist of a possible array of errors and/or a data element with keys
 * representing the functions called and values representing the return value of the given function.
 */
export type Response<Data extends { [func: string]: unknown }, ErrorTypes = unknown> = {
    errors?: Array<ApiError<ErrorTypes>>;
    data: { [K in keyof Data]: Data[K] | null };
}
export type ApiError<T = unknown> = {
    message: string;
    name: string;
    time_thrown: string;
    data: T;
}


/**
 *
 *
 *
 *
 * Tokensoft Data Model
 *
 *
 *
 *
 */

export interface Transaction {
    tokenAddress: string;
    fromWallet: string;
    toWallet: string;
    qtyBaseUnits: { toString(): string };
}

export enum UserAccreditationStatus {
    NONE,
        PENDING,
        EXPIRED,
        DOCUMENTATION_EXPIRED,
        FINISHED,
        FAILED,
}
export enum UserAccreditationMode {
    SELF,
        TOKENSOFT,
        VI,
        BYPASS,
}
export type User = {
    id: string;
    email: string;
    emailVerified: boolean;
    hasTia: boolean;
    registered: boolean;
    role: string;
    acceptedTSTerms: boolean;
    accreditationStatus: UserAccreditationStatus;
    accreditationMode: UserAccreditationMode;
    accreditationExpiration: Datetime;
    kycStatus: string;
    kycOnly: boolean;
    kycUploadFiles: Array<KycFile>;
    address: Address
    twoFactor: { enabled: boolean };
    token: string;
    tokenExpiry: Datetime;
    oktaIdToken: string;
    tokenRefresh: string;
    permissions: Array<string>;
    rounds: Array<SaleRound>;
    requiresPwUpgrade: boolean;
    lastLogin: Datetime;
}

export type KycFile = {
    uploadId: string;
    title: string;
    link: string;
    value: string;
    createdAt: Datetime;
}

type Datetime = string;

export type Address = {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    dob?: string;
    flatNumber?: string;
    buildingNumber?: string;
    buildingName?: string;
    streetLineOne?: string;
    streetLineTwo?: string;
    country?: string;
    state?: string;
    city?: string;
    zipCode?: string;
    phoneNumber?: string;
    investorType?: string;
    entityTitle?: string;
    entityName?: string;
    entityCountry?: string;
    entityFlatNumber?: string;
    entityBuildingNumber?: string;
    entityBuildingName?: string;
    entityStreetLineOne?: string;
    entityStreetLineTwo?: string;
    entityCity?: string;
    entityState?: string;
    entityZipCode?: string;
    entityDba?: string;
    entityPhoneNumber?: string;
    additionalKycFields?: Array<{ key: string; value: string; description: string; }>;
}

export type AddressInput = {
    firstName: string;
    lastName: string;
    dob?: string | null;
    flatNumber?: string | null;
    buildingNumber: string;
    buildingName?: string | null;
    streetLineOne: string;
    streetLineTwo?: string | null;
    country: string;
    state: string;
    city: string;
    zipCode: string;
    phoneNumber?: string | null;
    entityName?: string | null;
    entityBuildingNumber?: string | null;
    entityStreetLineOne?: string | null;
    entityCity?: string | null;
    entityZipCode?: string | null;
    entityState?: string | null;
    entityCountry?: string | null;
    entityPhoneNumber?: string | null;
    investorType: InvestorEnum;
}

export type SaleRound = {
    name: string;
    acceptedTerms: boolean;
    paymentAmount: string;
    tokens: string;
    committedAmount: string;
    documents: SaleRoundDocument;
}

export type SaleRoundDocument = {
    title: string;
    createdAt: string;
    link: string;
}

export type AdminParticipantUserWithSaleStatus = {
    id: string;
    acceptedTerms: boolean;
    paymentCompleted: boolean;
    selectedPaymentMethod: string;
    kycStatus: string;
    kycExpirationDate: Datetime;
    paymentAmount: number;
    paymentExpiration: string;
    usdTrackingNumber: string;
    ethPaymentCode: string;
    ethPaymentPayload: string;
    paymentDetailsConfirmed: boolean;
    updatedAt: Datetime;
    userId: AdminParticipantUser;
    participatingRoundIds: Array<string>;
}

export type AdminParticipantUser = User;

export type Round = {
    extraKycCountriesForEntityInvestor: Array<string>;
    id: string;
    name: string;
    roundDescription: string;
    clearedUsers: Array<string>;
    clearanceRequired: boolean;
    saleCap: number;
    saleCapHit: boolean;
    saleTermsUri: string;
    startDate: string;
    endDate: string;
    createdAt: string;
    tenant: string;
    tokenContract: string;
    // And other properties....
}

export type SaleStatus = {
    id: string;
    userId: string;
    userObj: User
    tenantId: string;
    acceptedTerms: boolean;
    entityRoles: Array<EntityRoles>;
    minPurchaseAmount: number;
    maxPurchaseAmount: number;
    paymentCompleted: boolean;
    kycStatus: string;
    kycExpirationDate: Datetime;
    kycOnly: boolean;
    externalIdentifier: string;
    title: string;
    // And other properties....
}

export type EntityRoles = {
    entitySaleStatusId: string;
    name: string;
    percentOwnership: string;
    accepted: string;
    roles: Array<string>;
    entityName: string;
    entityEmail: string;
    inviteDate: Datetime;
}

export type AccountInputType = {
    address: string;
    name: string;
    chain: CHAINS;
    type: RECEIVE_ADDRESS_TYPE;
    whitelist: string;
    primary?: boolean | null;
}

export type Account = AccountInputType & {
    id: string;
    createdAt: Datetime;
    primary: boolean;
    enabled: boolean;
    balance: string | null;
    whitelistRequest: string | null;
    //revokeRequest: RevokeRequestType
}

export enum InvestorEnum {
    MYSELF = "MYSELF",
    ENTITY = "ENTITY",
}

export enum CHAINS {
    BITCOIN = "BITCOIN",
    ETHEREUM = "ETHEREUM",
}

export enum RECEIVE_ADDRESS_TYPE {
    UNKNOWN = "UNKNOWN",
    CUSTODIAN = "CUSTODIAN",
}

export type ExternalWhitelistUserInput = {
    tokenContractAddress: string;
    email: string;
    address: AddressInput;
    account: AccountInputType;
}

export type ExternalUserLookupResponse = {
    status: "ERROR"|"SUCCESS";
    message?: string | null;
    data?: ExternalUserLookupData | null;
}

export type ExternalUserLookupData = {
    id: string;
    email: string;
    address: Address;
    accounts: Array<Account>;
}

/**
 *
 *
 *
 *
 *
 * WEB3
 *
 * This is a pared down interface that has been copy/pasted from the `@types/web3-*` packages.
 * The native interfaces are vast, and include much, much more functionality that we need here,
 * so it is desirable to define only a subset of them, rather than introduce a new dependency on
 * the web3 system in general.
 *
 *
 *
 *
 *
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
