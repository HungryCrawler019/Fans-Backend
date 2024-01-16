export type WebhookEvent = {
	eventType: WebhookEventType;
	data: SubscriptionChangedData | LinkedAccountUpdateData;
};

export enum WebhookEventType {
	SUBSCRIPTION_CHANGED,
	LINKED_ACCOUNT_UPDATE,
	GEMS_TRANSACTION,
}

export type GemsTransaction = {
	userId: string;
	creatorId: string;
	amount: number;
	processingFee: number;
	platformFee: number;
	currency: string;
};

export type LinkedAccountUpdateData = {
	userId: string;
	creatorId: string;
	previousAccount: LinkedAccountData;
	updatedAccount: LinkedAccountData;
};

export type SubscriptionChangedData = {
	id: string;
	type: SubscriptionType;
	changeAction: ChangeAction;
	userId: string;
	creatorId: string;
	currency: string;
	data: SubscriptionData | TierData;
	linkedAccounts: LinkedAccountData[];
};

export enum ChangeAction {
	SUBSCRIBED,
	TIER_CHANGED,
	UNSUBSCRIBED,
}

export enum SubscriptionType {
	SUBSCRIPTION,
	TIER,
}

export type LinkedAccountData = {
	provider: string;
	accountId: string;
	name: string;
};

export type SubscriptionData = {
	title: string;
};

export type TierData = {
	title: string;
	description: string;
	perks: string[];
};
