/** Site-wide notice: test deployment, not a public service. Rendered above the
 *  router so it appears on every page. */
export const PrototypeBanner = () => (
	<div
		className='prototype-banner'
		role='note'>
		This is an early prototype shown for testing and demonstration purposes only. It is not a live public service.
		Features may be incomplete or change without notice, and information shown may be inaccurate. Please do not enter
		real personal information.
	</div>
);
