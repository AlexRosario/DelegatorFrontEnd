import { useEffect, useState } from 'react';
import type { CongressMember, DonorSummary } from '../../types';
import { Requests } from '../../api';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const DonorList = ({ heading, entries }: { heading: string; entries: DonorSummary['topEmployers'] }) => (
	<div className='rep-donors-list'>
		<h6>{heading}</h6>
		{entries.length === 0 ? (
			<p className='rep-donors-note'>None reported this cycle.</p>
		) : (
			<ul>
				{entries.map((entry) => (
					<li key={entry.name}>
						<span className='rep-donor-name'>{entry.name}</span>
						<span className='rep-donor-total'>{usd.format(entry.total)}</span>
					</li>
				))}
			</ul>
		)}
	</div>
);

/** Back face of the rep card: top campaign donors from FEC filings. */
export const RepDonors = ({ member }: { member: CongressMember }) => {
	const bioguideId = member.bioguideId ?? member.id;
	const [summary, setSummary] = useState<DonorSummary | null>(null);
	const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');

	useEffect(() => {
		const controller = new AbortController();
		Requests.getMemberDonors(bioguideId, controller.signal)
			.then((data) => {
				if (!data) return setStatus('empty');
				setSummary(data);
				setStatus('ready');
			})
			.catch((err) => {
				if (err instanceof DOMException && err.name === 'AbortError') return;
				setStatus('error');
			});
		return () => controller.abort();
	}, [bioguideId]);

	if (status === 'loading') return <p className='rep-donors-note'>Loading FEC filings…</p>;
	if (status === 'empty') return <p className='rep-donors-note'>No FEC campaign-finance data for this member.</p>;
	if (status === 'error' || !summary) return <p className='rep-donors-note'>Couldn’t load donor data. Try again later.</p>;

	return (
		<div className='rep-donors'>
			<h5 className='rep-donors-title'>
				Top donors · {summary.cycle - 1}–{summary.cycle} cycle
			</h5>
			<div className='rep-donors-columns'>
				<DonorList
					heading='PACs & committees'
					entries={summary.topPacs}
				/>
				<DonorList
					heading='Individuals, by employer'
					entries={summary.topEmployers}
				/>
			</div>
			<p className='rep-donors-footnote'>
				Itemized contributions (over $200) to {summary.committee.name}. Employer totals are donors’ self-reported
				employers, not the company itself.{' '}
				<a
					href={`https://www.fec.gov/data/candidate/${summary.candidateId}/`}
					target='_blank'
					rel='noreferrer'
					onClick={(e) => e.stopPropagation()}>
					Source: FEC.gov ↗
				</a>
			</p>
		</div>
	);
};
