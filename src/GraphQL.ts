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
    data: Data | null;
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

