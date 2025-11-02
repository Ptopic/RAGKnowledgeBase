export const triggerYoutubeVideoScrape = async (body: any) => {
	const { url } = body;

	const webhookUrl = `${process.env.API_URL}/agent/webhook`;

	const data = JSON.stringify({ url, country: '' });

	const response = await fetch(
		`https://api.brightdata.com/datasets/v3/trigger?dataset_id=gd_lk56epmy2i5g7lzu0k&endpoint=${webhookUrl}&format=json&uncompressed_webhook=true&include_errors=true`,
		{
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: data,
		}
	);

	const result = await response.json();

	return result.snapshot_id;
};
