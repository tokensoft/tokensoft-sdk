import fetch from 'node-fetch'
import * as crypto from 'crypto'
import { ERC1404 } from "./ERC1404";
import * as Types from "./Types";

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

export class TokensoftSDK implements Types.TokensoftInterface {
    private timecache: { serverMs: number, localMs: number } | null = null;
    private opts: Types.ClientOptions;
    private keyId: string
    private secretKey: string
    private apiUrl: string

    constructor(apiUrl: string, keyId: string, secretKey: string, opts: Partial<Types.ClientOptions>);
    constructor(apiUrl: string, keyId: string, secretKey: string);
    constructor(
        apiUrl: string,
        keyId: string,
        secretKey: string,
        opts?: Partial<Types.ClientOptions>
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
                    Types.AdminParticipantUserWithSaleStatus,
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
    async getUserById<P extends Types.Projection<Types.User>>(
        id: string,
        p: P
    ): Promise<Types.Result<Types.User, P> | null> {
        const body = JSON.stringify({
            query: `query ($id: String!) {
                user (id: $id) ${this.constructProjection(p)}
            }`,
            variables: { id }
        });

        const res = await this.sendRequest<{ user: Types.Result<Types.User, P> | null }>(body);
        return this.throwErrors(res).user;
    }

    /**
     * Get a user record for a given email
     */
    async getUserByEmail<P extends Types.Projection<Types.User>>(
        email: string,
        p: P
    ): Promise<Types.Result<Types.User, P> | null> {
        const body = JSON.stringify({
            query: `query ($email: String!) {
                userEmailLookup(email: $email) ${this.constructProjection(p)}
            }`,
            variables: { email }
        });

        const res = await this.sendRequest<{ user: Types.Result<Types.User, P> | null }>(body);
        return this.throwErrors(res).user;
    }

    /**
     * Attempts to register the given investor email. If the email is already registered, throws
     * an error.
     */
    async createUnregisteredUser<P extends Types.Projection<Types.User>>(
        email: string,
        p: P
    ): Promise<Types.Result<Types.User, P>> {
        // Prepare
        const body = JSON.stringify({
            query: `mutation createUnregisteredUser($email:String!) {
              createUnregisteredUser(email:$email) ${this.constructProjection(p)}
            }`,
            variables: { email }
        });

        // Perform the action
        const res = await this.sendRequest<{
          createUnregisteredUser: Types.Result<Types.User, P>;
        }>(body);
        return this.throwErrors(res).createUnregisteredUser;
    }

    /**
     * Update KYC data for the given user
     */
    async updateUserDetails<P extends Types.Projection<Types.User>>(
        userId: string,
        data: Types.Address,
        p: P
    ): Promise<Types.Result<Types.User, P>> {
        // Prepare
        const body = JSON.stringify({
            query: `mutation updateUserDetails($id:String!, $address:Address!) {
              updateUserDetails(id: $id, address: $address) ${this.constructProjection(p)}
            }`,
            variables: { userId, address: data }
        });

        // Perform the action
        const res = await this.sendRequest<{
          updateUserDetails: Types.Result<Types.User, P>;
        }>(body);
        return this.throwErrors(res).updateUserDetails;
    }

    /**
     * Get all rounds/tranches for the given security
     */
    async getRounds<P extends Types.Projection<Types.Round>>(
        p: P
    ): Promise<Array<Types.Result<Types.Round, P>>> {
        const body = JSON.stringify({ query: `query { getRounds ${this.constructProjection(p)} }` });
        const res = await this.sendRequest<{
            getRounds: Array<Types.Result<Types.Round, P>>;
        }>(body);
        return this.throwErrors(res).getRounds;
    }

    /**
     * Get a user's Sale Status object by their email
     */
    async findSaleStatusFromUserEmail<P extends Types.Projection<Types.Round>>(
        email: string,
        roundId: string,
        p: P
    ): Promise<Types.Result<Types.SaleStatus, P> | null> {
        const body = JSON.stringify({
            query: `query(\$email:String!, \$roundId:String!) {
                findSaleStatusFromUserEmail(email:\$email, roundId:\$roundId)
                ${this.constructProjection(p)}
            }`,
            variables: { email, roundId }
        });

        const res = await this.sendRequest<{
            findSaleStatusFromUserEmail: Types.Result<Types.SaleStatus, P> | null;
        }>(body);
        return this.throwErrors(res).findSaleStatusFromUserEmail;
    }

    /**
     * Get a user by their ETH address
     */
    async findUserByEthAddress<P extends Types.Projection<Types.User>>(
        addr: string,
        p: P
    ): Promise<Types.Result<Types.User, P> | null> {
        const body = JSON.stringify({
            query: `query($addr:String!) {
                findUserByEthAddress(address:$addr) ${this.constructProjection(p)}
            }`,
            variables: { addr }
        });

        const res = await this.sendRequest<{
            findUserByEthAddress: Types.Result<Types.User, P> | null
        }>(body);
        return this.throwErrors(res).findUserByEthAddress;
    }

    /**
     * Get a user's token accounts (Ethereum addresses)
     */
    async getAccounts<P extends Types.Projection<Types.Account>>(
        saleStatusId: string,
        tokenContractId: string,
        p: P
    ): Promise<Array<Types.Result<Types.Account, P>>> {
        const body = JSON.stringify({
            query: `query($saleStatusId:String!,$tokenContractId:String!) {
                getAccounts(saleStatusId:$saleStatusId,tokenContractId:$tokenContractId)
                ${this.constructProjection(p)}
            }`,
            variables: { saleStatusId, tokenContractId }
        });

        const res = await this.sendRequest<{
            getAccounts: Array<Types.Result<Types.Account, P>>
        }>(body);

        return this.throwErrors(res).getAccounts;
    }

    /**
     * Get all of the given user's accounts (this is redundant with `getAccounts`, but doesn't
     * require the `tokenContractId` field, so may save a round-trip).
     */
    async getUserAccounts<P extends Types.Projection<Types.Account>>(
        userId: string,
        p: P
    ): Promise<Array<Types.Result<Types.Account, P>>> {
        const body = JSON.stringify({
            query: `query($userId:String!) {
                getUserAccounts(id:$userId) ${this.constructProjection(p)}
            }`,
            variables: { userId }
        });

        const res = await this.sendRequest<{
            getUserAccounts: Array<Types.Result<Types.Account, P>>
        }>(body);

        return this.throwErrors(res).getUserAccounts;
    }

    /**
     * Add an account for a given user. This will usually be an ETH wallet, but could be any valid
     * entity that holds tokens.
     */
    async addAccount<P extends Types.Projection<Types.Account>>(
        account: Types.AccountInputType,
        p: P
    ): Promise<Types.Result<Types.Account, P>> {
        const body = JSON.stringify({
            query: `mutation ($account:AccountInputType!) {
                addAccount(account:$account) ${this.constructProjection(p)}
            }`,
            variables: { account }
        });

        const res = await this.sendRequest<{ addAccount: Types.Result<Types.Account, P> }>(body);
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
     * New version of whitelist account
     */
    async externalWhitelistUser<P extends Types.Projection<Types.ExternalUserLookupResponse>>(
        input: Types.ExternalWhitelistUserInput,
        p: P
    ): Promise<Types.Result<Types.ExternalUserLookupResponse, P>> {
        const body = JSON.stringify({
            query: `mutation ($input: ExternalWhitelistUserInput!) {
                externalWhitelistUser(input:$input) ${this.constructProjection(p)}
            }`,
            variables: { input }
        });

        const res = await this.sendRequest<{ externalWhitelistUser: Types.Result<Types.ExternalUserLookupResponse, P> }>(body);
        return this.throwErrors(res).externalWhitelistUser;
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
        tx: Types.Transaction
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

        if (Number(code) === 0) {
            return [];
        }

        const text = <string> await token.methods.messageForTransferRestriction(code).call();
        return [{
            code: text,
            text: `Got error code ${code} ('${text}') from on-chain detectTransferRestriction ` +
            `method`,
        }];
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
    >(body: string): Promise<Types.Response<Data, Errors>> {
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
        res: Types.Response<Data,ErrorTypes>
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
    protected constructProjection(f: Types.Projection<any>): string {
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

