/** The only vote values the backend accepts and alignment can compare. */
export type CanonicalRollCallVote = 'Yea' | 'Nay' | 'Present' | 'Not Voting';

/**
 * Map every roll-call vote spelling to a canonical value at the parse boundary,
 * so all consumers (member-vote posting, party tallies, alignment) see one
 * vocabulary. Known variants: the House uses Aye/No on suspension votes and
 * Yea/Nay on passage; "Present, Giving Live Pair" is a historical Present form.
 * Anything unrecognized (e.g. Senate impeachment Guilty/Not Guilty) returns
 * null — a vote we can't compare, never a silent 400 at the backend.
 */
export const normalizeRollCallVote = (raw: string | null | undefined): CanonicalRollCallVote | null => {
	const vote = raw?.trim().toLowerCase();
	if (!vote) return null;
	if (vote === 'yea' || vote === 'aye' || vote === 'yes') return 'Yea';
	if (vote === 'nay' || vote === 'no') return 'Nay';
	if (vote.startsWith('present')) return 'Present';
	if (vote === 'not voting' || vote === 'absent') return 'Not Voting';
	console.warn(`normalizeRollCallVote: unrecognized roll-call vote value "${raw}" — skipped`);
	return null;
};

export const parseHouseVoteXML = (xmlText: string) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

  const metadata = Array.from(xmlDoc.querySelectorAll('totals-by-party')).map((node) => ({
    party: node.querySelector('party')?.textContent ?? null,
    yeas: node.querySelector('yea-total')?.textContent ?? null,
    nays: node.querySelector('nay-total')?.textContent ?? null,
    present: node.querySelector('present-total')?.textContent ?? null,
    no_vote: node.querySelector('not-voting-total')?.textContent ?? null,
  }));

  const votes = Array.from(xmlDoc.querySelectorAll('recorded-vote')).map((node) => {
    const legislator = node.querySelector('legislator');
    return {
      id: legislator?.getAttribute('name-id'),
      name: legislator?.textContent,
      vote: normalizeRollCallVote(node.querySelector('vote')?.textContent),
      party: legislator?.getAttribute('party'),
    };
  });

  return { metadata, votes };
};

export const parseSenateVoteXML = (xmlText: string) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

  // Extract metadata
  const get = (tag: string) =>
    xmlDoc.querySelector(tag)?.textContent?.trim() || '';

  const metadata = {
    congress: get('congress'),
    session: get('session'),
    voteNumber: get('vote_number'),
    voteDate: get('vote_date'),
    question: get('vote_question_text'),
    title: get('vote_title'),
    result: get('vote_result'),
    resultText: get('vote_result_text'),
    documentName: get('document_name'),
    documentTitle: get('document_title'),
    yeas: get('yeas'),
    nays: get('nays'),
    absent: get('absent')
  };

  // Extract votes
  const votes = Array.from(xmlDoc.querySelectorAll('member')).map((node) => ({
    fullName: node.querySelector('member_full')?.textContent || '',
    firstName: node.querySelector('first_name')?.textContent || '',
    lastName: node.querySelector('last_name')?.textContent || '',
    party: node.querySelector('party')?.textContent || '',
    state: node.querySelector('state')?.textContent || '',
    voteCast: normalizeRollCallVote(node.querySelector('vote_cast')?.textContent),
    lisMemberId: node.querySelector('lis_member_id')?.textContent || ''
  }));

  return { metadata, votes };
};
