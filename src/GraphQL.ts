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
    firstName: string;
    middleName: string;
    lastName: string;
    dob: string;
    flatNumber: string;
    buildingNumber: string;
    buildingName: string;
    streetLineOne: string;
    streetLineTwo: string;
    country: string;
    state: string;
    city: string;
    zipCode: string;
    phoneNumber: string;
    investorType: string;
    entityTitle: string;
    entityName: string;
    entityCountry: string;
    entityFlatNumber: string;
    entityBuildingNumber: string;
    entityBuildingName: string;
    entityStreetLineOne: string;
    entityStreetLineTwo: string;
    entityCity: string;
    entityState: string;
    entityZipCode: string;
    entityDba: string;
    entityPhoneNumber: string;
    additionalKycFields: Array<{ key: string; value: string; description: string; }>;
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
    name?: string | null;
    saleStatusId: string;
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

export enum CHAINS {
    BITCOIN = "BITCOIN",
    ETHEREUM = "ETHEREUM",
    AVA = "AVA",
    CYPHERIUM = "CYPHERIUM",
    RAVEN = "RAVEN",
    FINDORA = "FINDORA",
}

export enum RECEIVE_ADDRESS_TYPE {
    ANCHORAGE = "ANCHORAGE",
    AVA = "AVA",
    CYPHERIUM = "CYPHERIUM",
    FINDORA = "FINDORA",
    BITGO = "BITGO",
    GEMINI = "GEMINI",
    HEX = "HEX",
    KOINE = "KOINE",
    TIA = "TIA",
    ETHEREUM = "ETHEREUM",
    RAVEN = "RAVEN",
    LEDGER = "LEDGER",
    KOMAINU = "KOMAINU",
    UNKNOWN = "UNKNOWN",
}
