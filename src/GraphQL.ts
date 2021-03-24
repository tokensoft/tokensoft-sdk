/**
 *
 *
 *
 *
 *  General GraphQL structures
 *
 *
 *
 *
 */
export type ApiError<T = unknown> = {
    message: string;
    name: string;
    time_thrown: string;
    data: T;
}

/**
 * The following two types define GraphQL projecctions and results.
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
    primary?: boolean | null;
}

export type Account = AccountInputType & {
    id: string;
    createdAt: Datetime;
    primary: boolean;
    enabled: boolean;
    balance: string | null;
    whitelist: string | null;
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

