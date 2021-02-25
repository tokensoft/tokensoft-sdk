import fetch from 'node-fetch'
import * as crypto from 'crypto'
import * as Eth from "./Eth";
import { ERC1404 } from "./ERC1404";
import * as GraphQL from "./GraphQL";

export { ERC1404, Eth };

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

export interface ClientOptions {
    // The maximum age for the server time cache
    maxTimecacheAgeMs: number;
}

export class TokensoftSDK {
    private timecache: { serverMs: number, localMs: number } | null = null;
    private opts: ClientOptions;
    private keyId: string
    private secretKey: string
    private apiUrl: string
    private web3: Eth.Web3Interface | null;

    constructor(apiUrl: string, keyId: string, secretKey: string, web3: Eth.Web3Interface, opts?: Partial<ClientOptions>);
    constructor(apiUrl: string, keyId: string, secretKey: string, opts: Partial<ClientOptions>);
    constructor(apiUrl: string, keyId: string, secretKey: string);
    constructor(
        apiUrl: string,
        keyId: string,
        secretKey: string,
        web3OrOpts?: Eth.Web3Interface | Partial<ClientOptions>,
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

        this.web3 = isWeb3(web3OrOpts) ? web3OrOpts : null;
        this.opts = {
            maxTimecacheAgeMs: 1200000, // 20 minutes
            ...(
                isWeb3(web3OrOpts)
                ? (opts || {})
                : (web3OrOpts || {})
            )
        }
    }

    /**
     *
     *
     *
     *
     * Higher-level flow functions
     *
     * Functions in this section represent more or less complete flows that are common in
     * interactions between Tokensoft and its partners. These include things like idempotent
     * user registration and whitelisting, and attempted token transfers.
     *
     *
     *
     *
     */

    /**
     * Idempotently register an investor with the given email and wallet. Returns obstructions if
     * there are any data mismatches or other issues with registering the investor. Otherwise,
     * returns the investor's saleStatusId, which can be considered the their unique ID for the
     * given token.
     */
    async registerInvestorWithWallet(
        investor: Investor
    ): Promise<
        | { success: true; saleStatusId: string }
        | {
            success: false;
            obstructions: Array<DuplicateObstruction | Obstruction>
        }
    > {
        const obstructions: Array<DuplicateObstruction | Obstruction> = [];

        // Get round so we can do the rest of what we need to do
        const rounds = await this.getRounds();
        if (rounds.length === 0) {
            throw new Error(`Tokensoft: No rounds returned. Can't register new user.`);
        }
        const round = rounds[0]!;

        // See if we can get the user record
        let user = await this.getUserByEmail(investor.email);

        // If we didn't get a user, try to register
        if (!user) {
            // Now try to register
            const regObstructions = await this.addNewParticipant(
                investor.walletAddress,
                investor.email,
                investor.name,
                investor.country
            );

            // If there were no registration obstructions, just get the saleStatusId and return success
            if (regObstructions.length === 0) {
                const saleStatus = await this.findSaleStatusFromUserEmail(investor.email, round.id);
                if (saleStatus) {
                    return {
                        success: true,
                        saleStatusId: saleStatus.id
                    }
                } else {
                    throw new Error(
                        `Unknown error: User appears to have been successfully regsitered, but was ` +
                        `not returned from findSaleStatusFromUserEmail query.`
                    );
                }
            }

            // If the error wasn't specifically an "address in use" error, then return failure
            // (This will probably never happen)
            if (!regObstructions.find(o => o.code === ErrorCodes.DUP_ADDR)) {
                return {
                    success: false,
                    obstructions: regObstructions,
                }
            }

            // If it was an "address in use" error, set user to the one associated with the
            // address and resume normal flow
            user = await this.findUserByEthAddress(investor.walletAddress);
            if (!user) {
                throw new Error(
                    `Unknown error: Eth address is conflicting with an existing user, but no user ` +
                    `is returned when calling findUserByEthAddress.`
                );
            }
        }

        // If we retrieved a user, then we'll have to see if the match between the incoming and
        // existing records are sufficiently close to be acceptable

        // Generate name string from parts of existing investor
        const existingUserName = [
            user.address.firstName,
            user.address.middleName,
            user.address.lastName
        ].filter(n => !!n).join(" ");
        obstructions.push(...this.diffInvestors(
            investor,
            { name: existingUserName, country: user.address.country }
        ));

        // If there were no obstructions, then we believe this to be the same user
        if (obstructions.length === 0) {
            // Get sale status by user email
            const saleStatus = await this.findSaleStatusFromUserEmail(
                user.email,
                round.id
            );

            if (saleStatus) {
                return {
                    success: true,
                    saleStatusId: saleStatus.id,
                }
            } else {
                throw new Error(
                    `Unknown Error: Tried to get sale status for existing user with email ` +
                    `${user.email}, but came up empty.`
                );
            }
        } else {
            // Otherwise, return the obstructions
            return {
                success: false,
                obstructions,
            }
        }
    }

    /**
     *
     *
     *
     *
     * Low-level API Passthrough Functions
     *
     * TODO: Most of these methods return very small, fixed sets of fields, even though the API can
     * accommodate more fleshed out fieldsets. We need to find a way to allow the end-user to
     * define the fields while still maintaining type safety (see the `graphql` branch for current
     * work on this).
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
     * Authorize an existing Tokensoft account to be able to hold an asset
     * @param email
     * @param address
     */
    async authorizeUser(email: string, address: string, kycInfo: KYCInfoInput): Promise<string> {
        const body = JSON.stringify({
            query: `mutation {
                whitelistUser(
                    email: "${email}",
                    address: "${address}",
                    kyc: {
                        firstName: "${kycInfo.firstName}",
                        lastName: "${kycInfo.lastName}",
                        address: {
                          streetAddress: "${kycInfo.address.streetAddress}",
                          city: "${kycInfo.address.city}",
                          state: "${kycInfo.address.state}",
                          zip: "${kycInfo.address.zip}",
                          country:"${kycInfo.address.country}"
                        }
                      }
                    }
                )
            }`
        })

        const res = await this.sendRequest<{ "whitelistUser": string }>(body);
        const data = this.throwErrors(res);
        return data.whitelistUser;
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
    async getUserById(id: string) {
        const body = JSON.stringify({
            query: `query ($id: String!) {
                user (id: $id) {
                    id,
                    email,
                    role,
                    kycStatus,
                    address {
                        firstName,
                        middleName,
                        lastName,
                        streetLineOne,
                        streetLineTwo,
                        city,
                        state,
                        zipCode,
                        country,
                    }
                }
            }`,
            variables: { id }
        });

        const res = await this.sendRequest<{
            user:
                & Pick<GraphQL.User, "id" | "email" | "role" | "kycStatus">
                & {
                    address: Pick<
                        GraphQL.Address,
                        | "firstName"
                        | "middleName"
                        | "lastName"
                        | "streetLineOne"
                        | "streetLineTwo"
                        | "city"
                        | "state"
                        | "zipCode"
                        | "country"
                    >
                }
        }>(body);

        return this.throwErrors(res).user;
    }

    /**
     * Get a user record for a given email
     */
    async getUserByEmail(email: string) {
        const body = JSON.stringify({
            query: `query ($email: String!) {
                user (email: $email) {
                    id,
                    email,
                    role,
                    kycStatus,
                    address {
                        firstName,
                        middleName,
                        lastName,
                        streetLineOne,
                        streetLineTwo,
                        city,
                        state,
                        zipCode,
                        country,
                    }
                }
            }`,
            variables: { email }
        });

        const res = await this.sendRequest<{
            user:
                & Pick<GraphQL.User, "id" | "email" | "role" | "kycStatus">
                & {
                    address: Pick<
                        GraphQL.Address,
                        | "firstName"
                        | "middleName"
                        | "lastName"
                        | "streetLineOne"
                        | "streetLineTwo"
                        | "city"
                        | "state"
                        | "zipCode"
                        | "country"
                    >
                }
        }>(body);

        return this.throwErrors(res).user;
    }


    /**
     * Attempts to register the given investor. If there are certain known errors, the function
     * returns them as an array of obstructions. Unrecognized errors are thrown as application
     * errors. An empty array indicates success.
     */
    async addNewParticipant(
        addr: string,
        email: string,
        name: string,
        country: string
    ): Promise<Array<Obstruction>> {
        // Prepare
        const body = JSON.stringify({
            query: `mutation addNewParticipant(
                \$addr: String!,
                \$email:String!,
                \$name:String!,
                \$country:String!
            ) { addNewParticipant(address:$addr, email:$email,name:$name,country:$country) }`,
            variables: { addr, email, name, country }
        });

        // Perform the action
        const res = await this.sendRequest<{ addNewParticipant: boolean }>(body);

        // Collect any errors that we received from the operations
        const obstructions: Array<Obstruction> = [];
        if (res.errors) {
            for (const e of res.errors) {
                if (e.message.toLowerCase().match("user already in db")) {
                    obstructions.push({ code: ErrorCodes.DUP_EMAIL, text: e.message });
                } else if (e.message.toLowerCase().match("participant exists for address")) {
                    obstructions.push({ code: ErrorCodes.DUP_ADDR, text: e.message });
                } else {
                    throw new Error(`Unknown error registering user: ${e.name}: ${e.message}`);
                }
            }
        }

        // Return
        return obstructions;
    }

    /**
     * Get all rounds/tranches for the given security
     */
    async getRounds(): Promise<Array<Pick<GraphQL.Round, "id" | "tokenContract">>> {
        const body = JSON.stringify({ query: `query { getRounds { id, tokenContract } }` });
        const res = await this.sendRequest<{
            getRounds: Array<Pick<GraphQL.Round, "id" | "tokenContract">>;
        }>(body);
        return this.throwErrors(res).getRounds;
    }

    /**
     * Get a user's Sale Status object by their email
     */
    async findSaleStatusFromUserEmail(
        email: string,
        roundId: string
    ): Promise<Pick<GraphQL.SaleStatus, "id" | "userId">> {
        const body = JSON.stringify({
            query: `query(\$email:String!, \$roundId:String!) {
                findSaleStatusFromUserEmail(email:\$email, roundId:\$roundId) {
                    id,
                    userId
                }
            }`,
            variables: { email, roundId }
        });

        const res = await this.sendRequest<{
            findSaleStatusFromUserEmail: Pick<GraphQL.SaleStatus, "id" | "userId">;
        }>(body);

        return this.throwErrors(res).findSaleStatusFromUserEmail;
    }

    /**
     * Get a user by their ETH address
     */
    async findUserByEthAddress(addr: string) {
        const body = JSON.stringify({
            query: `query($addr:String!) {
                findUserByEthAddress(address:$addr) {
                    id,
                    email,
                    role,
                    kycStatus,
                    address {
                        firstName,
                        middleName,
                        lastName,
                        streetLineOne,
                        streetLineTwo,
                        city,
                        state,
                        zipCode,
                        country,
                    }
                }
            }`,
            variables: { addr }
        });

        const res = await this.sendRequest<{
            findUserByEthAddress:
                & Pick<GraphQL.User, "id" | "email" | "role" | "kycStatus">
                & {
                    address: Pick<
                        GraphQL.Address,
                        | "firstName"
                        | "middleName"
                        | "lastName"
                        | "streetLineOne"
                        | "streetLineTwo"
                        | "city"
                        | "state"
                        | "zipCode"
                        | "country"
                    >
                }
        }>(body);

        return this.throwErrors(res).findUserByEthAddress;
    }

    /**
     * Get a user's token accounts (Ethereum addresses)
     */
    async getAccounts(
        saleStatusId: string,
        tokenContractId: string
    ) {
        const body = JSON.stringify({
            query: `query($saleStatusId:String!,$tokenContractId:String!) {
                getAccounts(saleStatusId:$saleStatusId,tokenContractId:$tokenContractId) {
                    id,
                    primary,
                    enabled,
                    name,
                    balance,
                    whitelist,
                    chain,
                    type,
                    address,
                }
            }`,
            variables: { saleStatusId, tokenContractId }
        });

        const res = await this.sendRequest<{
            getAccounts: Array<Pick<
                GraphQL.Account,
                | "id"
                | "primary"
                | "enabled"
                | "name"
                | "balance"
                | "whitelist"
                | "chain"
                | "type"
                | "address"
            >>
        }>(body);

        return this.throwErrors(res).getAccounts;
    }

    /**
     * Add an Ethereum address to a user's Tokensoft account
     */
    async addAccount(account: GraphQL.AccountInputType): Promise<string> {
        const body = JSON.stringify({
            query: `mutation ($account:AccountInputType!) {
                addAccount(account:$account) { id }
            }`,
            variables: { account }
        });

        const res = await this.sendRequest<{ addAccount: Pick<GraphQL.Account, "id"> }>(body);
        return this.throwErrors(res).addAccount.id;
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
        if (!this.web3) {
            throw new Error(
                `Programmer: No Ethereum client provided, so can't access Ethereum. Fix this by ` +
                `providing an Ethereum provider (e.g., web3 instance) on instantiation.`
            );
        }

        // If we've got an ethereum provider, we'll use the tx data to see if the transaction can
        // go through
        const token = new this.web3.eth.Contract(ERC1404.abi, tx.tokenAddress);

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
            const res = await fetch(this.apiUrl, options)
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
            const res = await fetch(this.apiUrl, options)
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
     * of the queries return null.
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

    protected diffInvestors(
        incoming: { name: string; country: string },
        existing: { name: string; country: string },
    ): Array<DuplicateObstruction> {
        const obstructions: Array<DuplicateObstruction> = [];

        // Check name
        if (incoming.name !== existing.name) {
            obstructions.push({
                code: "Legal Name Mismatch",
                text: `Registrar legal name: ${existing.name}; Incoming legal name: ${incoming.name}`,
                params: {
                    type: "duplicate",
                    incoming: incoming.name,
                    existing: existing.name,
                }
            });
        }

        // Check country
        if (incoming.country !== existing.country) {
            obstructions.push({
                code: "Country Mismatch",
                text: `Registrar country: ${existing.country}; Incoming country: ${incoming.country}`,
                params: {
                    type: "duplicate",
                    incoming: incoming.country,
                    existing: existing.country,
                }
            });
        }

        return obstructions;
    }
}

const isWeb3 = (thing: any): thing is Eth.Web3Interface => {
    return thing !== undefined &&  thing.eth !== undefined;
}
