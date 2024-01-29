export async function load({ fetch }) {
	const ads = await (await fetch("api/sell")).json();
	return { ads };
}
