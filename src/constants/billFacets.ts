/**
 * The bill filter menu, declared once. Each facet is a label plus the server
 * query it stands for — the dropdown renders from this list, the provider keys
 * its pools by label, and the API layer serializes the query. Adding a facet
 * is one entry here; nothing else needs touching.
 */

export type BillStage =
	| 'Introduced'
	| 'In Committee'
	| 'Passed House'
	| 'Passed Senate'
	| 'Passed Both Chambers'
	| 'To President'
	| 'Became Law'
	| 'Failed'
	| 'Vetoed';

export type BillQuery = {
	stage?: BillStage[];
	hasRollCall?: boolean;
};

export type BillFacet = {
	label: string;
	query: BillQuery;
	/** Facets sharing a group render under one <optgroup>. */
	group?: string;
};

export const BILL_FACETS: BillFacet[] = [
	{ label: 'All Bills', query: {} },
	{ label: 'With Roll Calls', query: { hasRollCall: true } },
	{ label: 'Introduced', group: 'By stage', query: { stage: ['Introduced'] } },
	{ label: 'In Committee', group: 'By stage', query: { stage: ['In Committee'] } },
	{ label: 'Passed House', group: 'By stage', query: { stage: ['Passed House'] } },
	{ label: 'Passed Senate', group: 'By stage', query: { stage: ['Passed Senate'] } },
	{ label: 'Passed Both Chambers', group: 'By stage', query: { stage: ['Passed Both Chambers'] } },
	{ label: 'To President', group: 'By stage', query: { stage: ['To President'] } },
	{ label: 'Became Law', group: 'By stage', query: { stage: ['Became Law'] } },
	// One mental bucket, two stage values — the server takes a list.
	{ label: 'Failed or Vetoed', group: 'By stage', query: { stage: ['Failed', 'Vetoed'] } },
];

export const DEFAULT_FACET = BILL_FACETS[0];

export const facetByLabel = (label: string): BillFacet =>
	BILL_FACETS.find((facet) => facet.label === label) ?? DEFAULT_FACET;

/** Shape of GET /bills/facets — counts for menu display and empty-facet hiding. */
export type BillFacetCounts = {
	total: number;
	rollCall: number;
	stages: Record<string, number>;
};

/** How many bills a facet covers, per the server's counts (null = unknown yet). */
export const facetCount = (facet: BillFacet, counts: BillFacetCounts | null): number | null => {
	if (!counts) return null;
	if (facet.query.hasRollCall) return counts.rollCall;
	if (facet.query.stage) return facet.query.stage.reduce((sum, stage) => sum + (counts.stages[stage] ?? 0), 0);
	return counts.total;
};
