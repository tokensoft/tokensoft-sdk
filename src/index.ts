import fetch from 'node-fetch'
import * as crypto from 'crypto'
import * as Eth from "./Eth";
import { ERC1404 } from "./ERC1404";
import * as GraphQL from "./GraphQL";

export { ERC1404, Eth, GraphQL };

/**
 *
 *
 *
 *
 * Interface types and definitions
 *
 *
 *
 *
 */

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

export interface Transaction {
    tokenAddress: string;
    fromWallet: string;
    toWallet: string;
    qtyBaseUnits: number;
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
 */
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

/**
 * Since Typescript includes all protected/private variables and functions in it's definition of
 * public class interfaces, we want to define a separate interface describing only the actual
 * public functionality.
 *
 * Note that many methods have a `p` parameter. This parameter is a "projection" of the given
 * return type and mirrors a GraphQL projection.
 */
export interface TokensoftInterface {
    /**
     * Get the user corresponding to the current credentials
     */
    currentUser(): Promise<{ currentUser: { id: string; email: string } }>;

    /**
     * Get a user by user id
     */
    getUserById<P extends GraphQL.Projection<GraphQL.User>>(
        id: string,
        p: P
    ): Promise<GraphQL.Result<GraphQL.User, P> | null>;

    /**
     * Get a user by email
     */
    getUserByEmail<P extends GraphQL.Projection<GraphQL.User>>(
        email: string,
        p: P
    ): Promise<GraphQL.Result<GraphQL.User, P> | null>;

    /**
     * Create a user record without whitelisting. This gives the user a user ID in the Tokensoft
     * system, but does not whitelist the user for trading.
     */
    createUnregisteredUser<P extends GraphQL.Projection<GraphQL.User>>(
        email: string,
        p: P
    ): Promise<GraphQL.Result<GraphQL.User, P>>;

    /**
     * Update KYC data for the given user
     */
    updateUserDetails<P extends GraphQL.Projection<GraphQL.User>>(
        userId: string,
        data: GraphQL.Address,
        p: P
    ): Promise<GraphQL.Result<GraphQL.User, P>>;

    /**
     * Get all sale rounds for the given token (implied by the API being used)
     */
    getRounds<P extends GraphQL.Projection<GraphQL.Round>>(
        p: P
    ): Promise<Array<GraphQL.Result<GraphQL.Round, P>>>;

    /**
     * Get the sale status object of the given user for the given token (implied by the API being
     * used)
     */
    findSaleStatusFromUserEmail<P extends GraphQL.Projection<GraphQL.Round>>(
        email: string,
        roundId: string,
        p: P
    ): Promise<GraphQL.Result<GraphQL.SaleStatus, P> | null>;

    /**
     * Get a user object by the user's ETH address
     */
    findUserByEthAddress<P extends GraphQL.Projection<GraphQL.User>>(
        addr: string,
        p: P
    ): Promise<GraphQL.Result<GraphQL.User, P> | null>;

    /**
     * Get all of a user's accounts. This can include Ethereum wallets, among other things, and
     * is not limited to the accounts used for the given token.
     */
    getAccounts<P extends GraphQL.Projection<GraphQL.Account>>(
        saleStatusId: string,
        tokenContractId: string,
        p: P
    ): Promise<Array<GraphQL.Result<GraphQL.Account, P>>>;

    /**
     * Get all of the given user's accounts (this is redundant with `getAccounts`, but doesn't
     * require the `tokenContractId` field, so may save a round-trip).
     */
    getUserAccounts<P extends GraphQL.Projection<GraphQL.Account>>(
        userId: string,
        p: P
    ): Promise<Array<GraphQL.Result<GraphQL.Account, P>>>;

    /**
     * Add an account for a given user. This will usually be an ETH wallet, but could be any valid
     * entity that holds tokens.
     */
    addAccount<P extends GraphQL.Projection<GraphQL.Account>>(
        account: GraphQL.AccountInputType,
        p: P
    ): Promise<GraphQL.Result<GraphQL.Account, P>>;

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
     * See if there are problems that will arise when trying to clear the given transaction
     */
    detectTransferRestriction(
        tx: Transaction
    ): Promise<Array<{ code: string; text: string; }>>;
}

/**
 *
 *
 *
 *
 * Client internal types and definitions
 *
 *
 *
 *
 */

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
    web3?: Eth.Web3Interface;
    // An optional fetch dependency. If not provided, the default `node-fetch` will be used.
    fetch: FetchFunction;
}

/**
 *
 *
 *
 *
 * TokensoftSDK Definition
 *
 *
 *
 *
 */

export class TokensoftSDK implements TokensoftInterface {
    private timecache: { serverMs: number, localMs: number } | null = null;
    private opts: ClientOptions;
    private keyId: string
    private secretKey: string
    private apiUrl: string

    constructor(apiUrl: string, keyId: string, secretKey: string, opts: Partial<ClientOptions>);
    constructor(apiUrl: string, keyId: string, secretKey: string);
    constructor(
        apiUrl: string,
        keyId: string,
        secretKey: string,
        opts?: Partial<ClientOptions>
    ) {
        this.apiUrl = apiUrl
        if (!apiUrl) {
            throw new Error('missing apiUrl argument')
        }

        this.keyId = keyId
        if (!keyId) {
            throw new Error('missing keyId argument')
        }

        this.secretKey = secretKey
        if (!secretKey) {
            throw new Error('missing secretKey argument')
        }

        this.opts = {
            maxTimecacheAgeMs: 1200000, // 20 minutes
            fetch: (opts && opts.fetch) || fetch,
            ...(opts || {}),
        }
    }

    /**
     *
     *
     *
     *
     * Low-level API Passthrough Functions
     *
     *
     *
     *
     */

    /**
     * Get currently authenticated user
     *
     * TODO: This return type is likely not intended. However, it is what is currently implemented,
     * so we're just making it explicit and not changing it. It should probably be changed after
     * discussion with other contributors.
     */
    async currentUser(): Promise<{ currentUser: { id: string; email: string } }> {
        const body = JSON.stringify({
            query: '{ currentUser {id email } }'
        })
        const res = await this.sendRequest<{ currentUser: { id: string; email: string } }>(body);
        const data = this.throwErrors(res);
        return data;
    }

    /**
     * Retreieve the users that populate the dashboard
     * @param searchValue
     * @param page
     * @param pageSize
     * @param sortDir
     * @param sortByColumn
     */
    async AdminParticipantUsers(
        searchValue: string,
        page: number,
        pageSize: number,
        sortDir: string,
        sortByColumn: string
    ) {
        const body = JSON.stringify({
            query: `query {
                adminParticipantUsers(
                    searchValue: "${searchValue}",
                    page: "${page}",
                    pageSize: "${pageSize}",
                    sortDir: "${sortDir}",
                    sortByColumn: "${sortByColumn}"
                ) {
                    totalUsers
                    users {           
                        id  
                        acceptedTerms
                        paymentCompleted
                        selectedPaymentMethod
                        kycStatus
                        kycExpirationDate
                        paymentAmount
                        paymentExpiration
                        usdTrackingNumber
                        ethPaymentCode
                        ethPaymentPayload
                        paymentDetailsConfirmed
                        updatedAt
                        userId { }
                        participatingRoundIds
                    }
                }
            }`
        })

        const res = await this.sendRequest<{
            adminParticipantUsers: {
                totalUsers: number;
                users: Array<Pick<
                    GraphQL.AdminParticipantUserWithSaleStatus,
                    | "id"
                    | "acceptedTerms"
                    | "paymentCompleted"
                    | "selectedPaymentMethod"
                    | "kycStatus"
                    | "kycExpirationDate"
                    | "paymentAmount"
                    | "paymentExpiration"
                    | "usdTrackingNumber"
                    | "ethPaymentCode"
                    | "ethPaymentPayload"
                    | "paymentDetailsConfirmed"
                    | "updatedAt"
                    | "userId"
                    | "participatingRoundIds"
                >>;
            }
        }>(body);
        const data = this.throwErrors(res);
        return data.adminParticipantUsers;
    }

    /**
     * Get the user object associated with the given ID
     */
    async getUserById<P extends GraphQL.Projection<GraphQL.User>>(
        id: string,
        p: P
    ): Promise<GraphQL.Result<GraphQL.User, P> | null> {
        const body = JSON.stringify({
            query: `query ($id: String!) {
                user (id: $id) ${this.constructProjection(p)}
            }`,
            variables: { id }
        });

        const res = await this.sendRequest<{ user: GraphQL.Result<GraphQL.User, P> | null }>(body);
        return this.throwErrors(res).user;
    }

    /**
     * Get a user record for a given email
     */
    async getUserByEmail<P extends GraphQL.Projection<GraphQL.User>>(
        email: string,
        p: P
    ): Promise<GraphQL.Result<GraphQL.User, P> | null> {
        const body = JSON.stringify({
            query: `query ($email: String!) {
                userEmailLookup(email: $email) ${this.constructProjection(p)}
            }`,
            variables: { email }
        });

        const res = await this.sendRequest<{ user: GraphQL.Result<GraphQL.User, P> | null }>(body);
        return this.throwErrors(res).user;
    }

    /**
     * Attempts to register the given investor email. If the email is already registered, throws
     * an error.
     */
    async createUnregisteredUser<P extends GraphQL.Projection<GraphQL.User>>(
        email: string,
        p: P
    ): Promise<GraphQL.Result<GraphQL.User, P>> {
        // Prepare
        const body = JSON.stringify({
            query: `mutation createUnregisteredUser($email:String!) {
              createUnregisteredUser(email:$email) ${this.constructProjection(p)}
            }`,
            variables: { email }
        });

        // Perform the action
        const res = await this.sendRequest<{
          createUnregisteredUser: GraphQL.Result<GraphQL.User, P>;
        }>(body);
        return this.throwErrors(res).createUnregisteredUser;
    }

    /**
     * Update KYC data for the given user
     */
    async updateUserDetails<P extends GraphQL.Projection<GraphQL.User>>(
        userId: string,
        data: GraphQL.Address,
        p: P
    ): Promise<GraphQL.Result<GraphQL.User, P>> {
        // Prepare
        const body = JSON.stringify({
            query: `mutation updateUserDetails($id:String!, $address:Address!) {
              updateUserDetails(id: $id, address: $address) ${this.constructProjection(p)}
            }`,
            variables: { userId, address: data }
        });

        // Perform the action
        const res = await this.sendRequest<{
          updateUserDetails: GraphQL.Result<GraphQL.User, P>;
        }>(body);
        return this.throwErrors(res).updateUserDetails;
    }

    /**
     * Get all rounds/tranches for the given security
     */
    async getRounds<P extends GraphQL.Projection<GraphQL.Round>>(
        p: P
    ): Promise<Array<GraphQL.Result<GraphQL.Round, P>>> {
        const body = JSON.stringify({ query: `query { getRounds ${this.constructProjection(p)} }` });
        const res = await this.sendRequest<{
            getRounds: Array<GraphQL.Result<GraphQL.Round, P>>;
        }>(body);
        return this.throwErrors(res).getRounds;
    }

    /**
     * Get a user's Sale Status object by their email
     */
    async findSaleStatusFromUserEmail<P extends GraphQL.Projection<GraphQL.Round>>(
        email: string,
        roundId: string,
        p: P
    ): Promise<GraphQL.Result<GraphQL.SaleStatus, P> | null> {
        const body = JSON.stringify({
            query: `query(\$email:String!, \$roundId:String!) {
                findSaleStatusFromUserEmail(email:\$email, roundId:\$roundId)
                ${this.constructProjection(p)}
            }`,
            variables: { email, roundId }
        });

        const res = await this.sendRequest<{
            findSaleStatusFromUserEmail: GraphQL.Result<GraphQL.SaleStatus, P> | null;
        }>(body);
        return this.throwErrors(res).findSaleStatusFromUserEmail;
    }

    /**
     * Get a user by their ETH address
     */
    async findUserByEthAddress<P extends GraphQL.Projection<GraphQL.User>>(
        addr: string,
        p: P
    ): Promise<GraphQL.Result<GraphQL.User, P> | null> {
        const body = JSON.stringify({
            query: `query($addr:String!) {
                findUserByEthAddress(address:$addr) ${this.constructProjection(p)}
            }`,
            variables: { addr }
        });

        const res = await this.sendRequest<{
            findUserByEthAddress: GraphQL.Result<GraphQL.User, P> | null
        }>(body);
        return this.throwErrors(res).findUserByEthAddress;
    }

    /**
     * Get a user's token accounts (Ethereum addresses)
     */
    async getAccounts<P extends GraphQL.Projection<GraphQL.Account>>(
        saleStatusId: string,
        tokenContractId: string,
        p: P
    ): Promise<Array<GraphQL.Result<GraphQL.Account, P>>> {
        const body = JSON.stringify({
            query: `query($saleStatusId:String!,$tokenContractId:String!) {
                getAccounts(saleStatusId:$saleStatusId,tokenContractId:$tokenContractId)
                ${this.constructProjection(p)}
            }`,
            variables: { saleStatusId, tokenContractId }
        });

        const res = await this.sendRequest<{
            getAccounts: Array<GraphQL.Result<GraphQL.Account, P>>
        }>(body);

        return this.throwErrors(res).getAccounts;
    }

    /**
     * Get all of the given user's accounts (this is redundant with `getAccounts`, but doesn't
     * require the `tokenContractId` field, so may save a round-trip).
     */
    async getUserAccounts<P extends GraphQL.Projection<GraphQL.Account>>(
        userId: string,
        p: P
    ): Promise<Array<GraphQL.Result<GraphQL.Account, P>>> {
        const body = JSON.stringify({
            query: `query($userId:String!) {
                getUserAccounts(id:$userId) ${this.constructProjection(p)}
            }`,
            variables: { userId }
        });

        const res = await this.sendRequest<{
            getUserAccounts: Array<GraphQL.Result<GraphQL.Account, P>>
        }>(body);

        return this.throwErrors(res).getUserAccounts;
    }

    /**
     * Add an account for a given user. This will usually be an ETH wallet, but could be any valid
     * entity that holds tokens.
     */
    async addAccount<P extends GraphQL.Projection<GraphQL.Account>>(
        account: GraphQL.AccountInputType,
        p: P
    ): Promise<GraphQL.Result<GraphQL.Account, P>> {
        const body = JSON.stringify({
            query: `mutation ($account:AccountInputType!) {
                addAccount(account:$account) ${this.constructProjection(p)}
            }`,
            variables: { account }
        });

        const res = await this.sendRequest<{ addAccount: GraphQL.Result<GraphQL.Account, P> }>(body);
        return this.throwErrors(res).addAccount;
    }

    /**
     * Whitelist an account (see docs in interface definition above)
     */
    async whitelistAccount(
        accountId: string,
        tokenContractId: string,
        webhookUrl?: string
    ): Promise<string> {
        const body = JSON.stringify({
            query: `mutation ($accountId:String!,$tokenContractId:String!,$webhookUrl:String) {
                whitelistUser(
                    accountId:$accountId,
                    tokenContractId:$tokenContractId,
                    callback:$webhookUrl
                )
            }`,
            variables: { accountId, tokenContractId, webhookUrl }
        });

        const res = await this.sendRequest<{ whitelistUser: string }>(body);
        return this.throwErrors(res).whitelistUser;
    }

    /**
     *
     *
     *
     *
     * Blockchain functions
     *
     *
     *
     *
     */

    /**
     * Takes a transaction and returns an array (possibly empty) of reasons the transaction would
     * fail. If the array is empty, the transaction is not expected to fail.
     */
    async detectTransferRestriction(
        tx: Transaction
    ): Promise<Array<{ code: string; text: string; }>> {
        // The Ethereum provider is optional, so we need to check for that first and throw if we
        // don't have it
        if (!this.opts.web3) {
            throw new Error(
                `Programmer: No Ethereum client provided, so can't access Ethereum. Fix this by ` +
                `providing an Ethereum provider (e.g., web3 instance) on instantiation.`
            );
        }

        // If we've got an ethereum provider, we'll use the tx data to see if the transaction can
        // go through
        const token = new this.opts.web3.eth.Contract(ERC1404.abi, tx.tokenAddress);

        const code = await token.methods.detectTransferRestriction(
            tx.fromWallet,
            tx.toWallet,
            tx.qtyBaseUnits
        ).call();

        if (code === 0) {
            return [];
        }

        const text = <string> await token.methods.messageForTransferRestriction(code).call();
        return [{ code: String(code), text }];
    }

    /**
     *
     *
     *
     *
     * Internal Utilities
     *
     *
     *
     *
     */

    async sendRequest<
        Data extends { [func: string]: unknown } = { [func: string]: unknown },
        Errors extends unknown = unknown
    >(body: string): Promise<GraphQL.Response<Data, Errors>> {
        const serverTime = await this.getServerTime()
        const text = serverTime + body
        const hmac = crypto.createHmac('sha256', this.secretKey)
        hmac.update(text)
        const signature = hmac.digest('hex')
        const options = {
            headers: {
                'access-key': this.keyId,
                'access-sign': signature,
                'access-timestamp': serverTime,
                'Content-Type': 'application/json',
            },
            method: 'post',
            body
        }

        try {
            const res = await this.opts.fetch(this.apiUrl, options)
            return await res.json()
        } catch (e) {
            console.log('Error sending request to TokensoftApi: ', e)
            throw e
        }
    }

    /**
     * Get the current server time
     */
    async getServerTime(): Promise<string> {
        // Only get time from server if we don't have a recent cache of it
        if (
            !this.timecache ||
            ((Date.now() - this.timecache.localMs) > this.opts.maxTimecacheAgeMs)
        ) {
            const request = {
                query: '{ time }'
            }
            const body = JSON.stringify(request)
            const options = {
                headers: {
                    'Content-Type': 'application/json',
                },
                method: 'post',
                body
            }

            // Fetch time from server
            const res = await this.opts.fetch(this.apiUrl, options)
            const { data } = await res.json()

            // Use time from server to construct time cache
            this.timecache = {
                serverMs: Number(data.time),
                localMs: Date.now(),
            }
        }

        // Return string representation of the adjusted server time
        return String(
            this.timecache.serverMs + (Date.now() - this.timecache.localMs)
        );
    }

    /**
     * Take a raw GraphQL response and throw if it lacks data _and_ has errors.
     * **NOTE:** This will NOT throw errors if the errors co-exist with valid data. In that case,
     * the errors are considered warnings and are not fatal. Additionally, it will throw if _any_
     * of the queries return null and there are errors.
     */
    protected throwErrors<Data extends { [func: string]: unknown }, ErrorTypes = unknown>(
        res: GraphQL.Response<Data,ErrorTypes>
    ): Data {
        if (
            (!res.data || Object.values(res.data).find(v => v === null) !== undefined) &&
            res.errors &&
            res.errors.length
        ) {
            throw new Error(
                `Errors: ` +
                res.errors.map(
                    e => `${e.name}: ${e.message}${e.data ? ` - ${JSON.stringify(e.data)}` : ``}`
                ).join("; ")
            );
        }

        // We've cleared all possibility of null values above, so can cast this
        return <Data>res.data;
    }

    /**
     * Use a `Projection` object to construct a GraphQL string representation of that type.
     */
    protected constructProjection(f: GraphQL.Projection<any>): string {
        const collection: Array<string> = [];
        for (const k in f) {
            const val = f[k];

            // Ignore falsy values
            if (!val) {
                continue;
            }

            if (val === true) {
                // If "true", request this key
                collection.push(k);
            } else {
                // Otherwise, it's an object, so recurse
                collection.push(`${k} ${this.constructProjection(val)}`);
            }
        }
        return `{ ${collection.join(",")} }`;
    }
}

